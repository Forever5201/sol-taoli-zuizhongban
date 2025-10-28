/*!
 * 数据库模块 - 使用tokio-postgres记录套利机会
 * 
 * 提供完整的数据库操作功能，无sqlx依赖冲突
 */

use deadpool_postgres::{Config, Pool, Runtime};
use tokio_postgres::NoTls;
use chrono::{DateTime, Utc};
use crate::router::ArbitragePath;

/// 数据库配置
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub enabled: bool,
    pub url: String,
    pub record_opportunities: bool,
    #[allow(dead_code)]
    pub record_pool_updates: bool,
    #[allow(dead_code)]
    pub record_performance: bool,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            url: String::new(),
            record_opportunities: true,
            record_pool_updates: false,
            record_performance: true,
        }
    }
}

/// 数据库管理器
pub struct DatabaseManager {
    pool: Pool,
    config: DatabaseConfig,
    subscription_started_at: Option<DateTime<Utc>>,
}

impl DatabaseManager {
    /// 创建新的数据库管理器
    pub async fn new(config: DatabaseConfig) -> Result<Self, Box<dyn std::error::Error>> {
        if !config.enabled {
            return Err("Database is not enabled".into());
        }

        println!("📊 Connecting to database...");
        println!("   URL: {}", mask_password(&config.url));

        // 解析连接URL
        let pg_config = config.url.parse::<tokio_postgres::Config>()?;
        
        // 创建连接池配置
        let mut pool_config = Config::new();
        pool_config.host = pg_config.get_hosts().get(0).map(|h| {
            match h {
                tokio_postgres::config::Host::Tcp(s) => s.clone(),
                #[cfg(unix)]
                tokio_postgres::config::Host::Unix(p) => p.to_string_lossy().to_string(),
            }
        });
        pool_config.port = pg_config.get_ports().get(0).copied();
        pool_config.dbname = pg_config.get_dbname().map(|s| s.to_string());
        pool_config.user = pg_config.get_user().map(|s| s.to_string());
        pool_config.password = pg_config.get_password().map(|p| {
            String::from_utf8_lossy(p).to_string()
        });

        // 创建连接池
        let pool = pool_config.create_pool(Some(Runtime::Tokio1), NoTls)?;

        // 测试连接
        let _client = pool.get().await?;
        println!("✅ Database connected successfully");

        // 运行迁移
        println!("🔄 Running database migrations...");
        Self::run_migrations(&pool).await?;
        println!("✅ Migrations completed");

        Ok(Self {
            pool,
            config,
            subscription_started_at: None,
        })
    }

    /// 运行数据库迁移
    async fn run_migrations(pool: &Pool) -> Result<(), Box<dyn std::error::Error>> {
        let client = pool.get().await?;
        
        // 读取迁移文件 - 使用最新的
        let migration_sql = include_str!("../migrations/003_recreate_with_double.sql");
        
        // 执行迁移
        client.batch_execute(migration_sql).await?;

        Ok(())
    }

    /// 设置订阅开始时间
    pub fn set_subscription_start(&mut self) {
        self.subscription_started_at = Some(Utc::now());
        println!("⏰ Database: Subscription started at {}", 
            self.subscription_started_at.unwrap().format("%Y-%m-%d %H:%M:%S%.3f"));
    }

    /// 记录套利机会
    pub async fn record_opportunity(
        &self,
        path: &ArbitragePath,
        router_mode: &str,
        min_roi_threshold: f64,
    ) -> Result<i32, Box<dyn std::error::Error>> {
        if !self.config.record_opportunities {
            return Ok(0);
        }

        let client = self.pool.get().await?;

        let discovered_at = Utc::now();
        let time_since_subscription = self.subscription_started_at
            .map(|start| {
                (discovered_at - start).num_milliseconds() as i32
            });

        // 生成路径摘要
        let path_summary = self.generate_path_summary(path);

        // 记录机会到主表
        let row = client.query_one(
            r#"
            INSERT INTO arbitrage_opportunities (
                discovered_at, subscription_started_at, time_since_subscription_ms,
                arbitrage_type, start_token, end_token,
                input_amount, output_amount, gross_profit, net_profit, roi_percent, estimated_fees,
                hop_count, path_summary,
                router_mode, min_roi_threshold
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
            "#,
            &[
                &discovered_at.naive_utc(),
                &self.subscription_started_at.map(|dt| dt.naive_utc()),
                &time_since_subscription,
                &format!("{:?}", path.arb_type),
                &path.start_token,
                &path.end_token,
                &path.input_amount,
                &path.output_amount,
                &path.gross_profit,
                &path.net_profit,
                &path.roi_percent,
                &path.estimated_fees,
                &(path.steps.len() as i32),
                &path_summary,
                &router_mode,
                &min_roi_threshold,
            ],
        ).await?;

        let opportunity_id: i32 = row.get(0);

        // 记录路径详情
        self.record_path_steps(&client, opportunity_id, path).await?;

        println!("📝 Recorded opportunity #{} - ROI: {:.4}% - Path: {}", 
            opportunity_id, path.roi_percent, path_summary);

        Ok(opportunity_id)
    }

    /// 记录路径步骤
    async fn record_path_steps(
        &self,
        client: &deadpool_postgres::Client,
        opportunity_id: i32,
        path: &ArbitragePath,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (idx, step) in path.steps.iter().enumerate() {
            client.execute(
                r#"
                INSERT INTO arbitrage_steps (
                    opportunity_id, step_order,
                    pool_id, dex_name,
                    input_token, output_token, price,
                    liquidity_base, liquidity_quote,
                    expected_input, expected_output
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                "#,
                &[
                    &opportunity_id,
                    &((idx + 1) as i32),
                    &step.pool_id,
                    &step.dex_name,
                    &step.input_token,
                    &step.output_token,
                    &step.price,
                    &(step.liquidity_base as i64),
                    &(step.liquidity_quote as i64),
                    &step.expected_input,
                    &step.expected_output,
                ],
            ).await?;
        }

        Ok(())
    }

    /// 生成路径摘要
    fn generate_path_summary(&self, path: &ArbitragePath) -> String {
        let mut tokens = vec![path.start_token.clone()];
        for step in &path.steps {
            tokens.push(step.output_token.clone());
        }
        tokens.join("→")
    }

    /// 记录池子更新
    #[allow(dead_code)]
    pub async fn record_pool_update(
        &self,
        pool_address: &str,
        pool_name: &str,
        pool_type: &str,
        price: f64,
        base_reserve: u64,
        quote_reserve: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !self.config.record_pool_updates {
            return Ok(());
        }

        let client = self.pool.get().await?;

        client.execute(
            r#"
            INSERT INTO pool_updates (
                pool_address, pool_name, pool_type,
                updated_at, price, base_reserve, quote_reserve
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            &[
                &pool_address,
                &pool_name,
                &pool_type,
                &Utc::now().naive_utc(),
                &price,
                &(base_reserve as i64),
                &(quote_reserve as i64),
            ],
        ).await?;

        Ok(())
    }

    /// 记录路由器性能
    #[allow(dead_code)]
    pub async fn record_performance(
        &self,
        scan_duration_ms: u64,
        opportunities_found: usize,
        pools_scanned: usize,
        router_mode: &str,
        min_roi_percent: f64,
        max_hops: usize,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !self.config.record_performance {
            return Ok(());
        }

        let client = self.pool.get().await?;

        client.execute(
            r#"
            INSERT INTO router_performance (
                timestamp, scan_duration_ms, opportunities_found, pools_scanned,
                router_mode, min_roi_percent, max_hops
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            &[
                &Utc::now().naive_utc(),
                &(scan_duration_ms as i32),
                &(opportunities_found as i32),
                &(pools_scanned as i32),
                &router_mode,
                &min_roi_percent,
                &(max_hops as i32),
            ],
        ).await?;

        Ok(())
    }

    /// 更新机会执行状态
    #[allow(dead_code)]
    pub async fn update_execution_status(
        &self,
        opportunity_id: i32,
        is_executed: bool,
        execution_status: Option<&str>,
        tx_hash: Option<&str>,
        actual_profit: Option<f64>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let client = self.pool.get().await?;

        client.execute(
            r#"
            UPDATE arbitrage_opportunities
            SET is_executed = $2,
                execution_status = $3,
                execution_tx_hash = $4,
                actual_profit = $5
            WHERE id = $1
            "#,
            &[
                &opportunity_id,
                &is_executed,
                &execution_status,
                &tx_hash,
                &actual_profit,
            ],
        ).await?;

        Ok(())
    }
}

/// 隐藏密码显示
fn mask_password(url: &str) -> String {
    if let Some(at_pos) = url.find('@') {
        if let Some(colon_pos) = url[..at_pos].rfind(':') {
            let mut masked = url.to_string();
            masked.replace_range(colon_pos + 1..at_pos, "****");
            return masked;
        }
    }
    url.to_string()
}






