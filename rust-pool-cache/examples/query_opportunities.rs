/*!
 * 套利机会查询工具
 * 
 * 用于查询和分析数据库中记录的套利机会
 */

use sqlx::PgPool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 从环境变量或参数获取数据库URL
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:Yuan971035088@localhost:5432/postgres".to_string());
    
    // 连接数据库
    println!("📊 Connecting to database...");
    let pool = PgPool::connect(&database_url).await?;
    println!("✅ Connected!\n");
    
    // 解析命令行参数
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        print_usage();
        return Ok(());
    }
    
    match args[1].as_str() {
        "--recent" => {
            let limit = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(10);
            query_recent_opportunities(&pool, limit).await?;
        }
        "--stats" => {
            query_statistics(&pool).await?;
        }
        "--roi-dist" => {
            query_roi_distribution(&pool).await?;
        }
        "--dex-stats" => {
            query_dex_statistics(&pool).await?;
        }
        "--hourly" => {
            query_hourly_stats(&pool).await?;
        }
        "--by-id" => {
            let id: i32 = args.get(2)
                .and_then(|s| s.parse().ok())
                .expect("Please provide opportunity ID");
            query_by_id(&pool, id).await?;
        }
        _ => {
            print_usage();
        }
    }
    
    Ok(())
}

fn print_usage() {
    println!("Usage:");
    println!("  cargo run --example query_opportunities -- [command] [args]");
    println!();
    println!("Commands:");
    println!("  --recent [N]    Show N most recent opportunities (default: 10)");
    println!("  --stats         Show overall statistics");
    println!("  --roi-dist      Show ROI distribution");
    println!("  --dex-stats     Show DEX performance statistics");
    println!("  --hourly        Show hourly statistics");
    println!("  --by-id [ID]    Show detailed information for specific opportunity");
    println!();
    println!("Examples:");
    println!("  cargo run --example query_opportunities -- --recent 20");
    println!("  cargo run --example query_opportunities -- --stats");
    println!("  cargo run --example query_opportunities -- --by-id 42");
}

async fn query_recent_opportunities(pool: &PgPool, limit: i64) -> Result<(), Box<dyn std::error::Error>> {
    println!("📋 最近的 {} 个套利机会:\n", limit);
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            id, discovered_at, time_since_subscription_ms,
            arbitrage_type, start_token, end_token,
            roi_percent, net_profit, hop_count, path_summary,
            router_mode
        FROM arbitrage_opportunities
        ORDER BY discovered_at DESC
        LIMIT $1
        "#,
        limit
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        println!("ID: {} | 时间: {}", row.id, row.discovered_at.format("%Y-%m-%d %H:%M:%S"));
        if let Some(ms) = row.time_since_subscription_ms {
            println!("   延迟: {}ms 自订阅开始", ms);
        }
        println!("   类型: {} | 模式: {}", row.arbitrage_type, row.router_mode.unwrap_or_default());
        println!("   ROI: {:.4}% | 净利润: {} {}", row.roi_percent, row.net_profit, row.start_token);
        println!("   跳数: {} | 路径: {}", row.hop_count, row.path_summary);
        println!();
    }
    
    Ok(())
}

async fn query_statistics(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("📈 总体统计:\n");
    
    let row = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi,
            MIN(roi_percent) as min_roi,
            MAX(roi_percent) as max_roi,
            AVG(net_profit) as avg_profit,
            AVG(hop_count) as avg_hops,
            COUNT(CASE WHEN is_executed THEN 1 END) as "executed_count!"
        FROM arbitrage_opportunities
        "#
    )
    .fetch_one(pool)
    .await?;
    
    println!("总机会数: {}", row.count);
    println!("平均ROI: {:.4}%", row.avg_roi.unwrap_or_default());
    println!("ROI范围: {:.4}% - {:.4}%", 
        row.min_roi.unwrap_or_default(), 
        row.max_roi.unwrap_or_default());
    println!("平均净利润: {:.2}", row.avg_profit.unwrap_or_default());
    println!("平均跳数: {:.2}", row.avg_hops.unwrap_or_default());
    println!("已执行: {}", row.executed_count);
    println!();
    
    // 按类型统计
    println!("按类型统计:");
    let type_rows = sqlx::query!(
        r#"
        SELECT 
            arbitrage_type,
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi
        FROM arbitrage_opportunities
        GROUP BY arbitrage_type
        ORDER BY count DESC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in type_rows {
        println!("  {}: {} 次 (平均ROI: {:.4}%)", 
            row.arbitrage_type, 
            row.count,
            row.avg_roi.unwrap_or_default());
    }
    println!();
    
    // 按模式统计
    println!("按路由模式统计:");
    let mode_rows = sqlx::query!(
        r#"
        SELECT 
            router_mode,
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi
        FROM arbitrage_opportunities
        WHERE router_mode IS NOT NULL
        GROUP BY router_mode
        ORDER BY count DESC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in mode_rows {
        println!("  {}: {} 次 (平均ROI: {:.4}%)", 
            row.router_mode.unwrap_or_default(), 
            row.count,
            row.avg_roi.unwrap_or_default());
    }
    
    Ok(())
}

async fn query_roi_distribution(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("📊 ROI分布:\n");
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            CASE 
                WHEN roi_percent < 0.5 THEN '< 0.5%'
                WHEN roi_percent < 1.0 THEN '0.5-1.0%'
                WHEN roi_percent < 2.0 THEN '1.0-2.0%'
                WHEN roi_percent < 5.0 THEN '2.0-5.0%'
                ELSE '> 5.0%'
            END as roi_range,
            COUNT(*) as "count!"
        FROM arbitrage_opportunities
        GROUP BY roi_range
        ORDER BY MIN(roi_percent)
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        let bar = "█".repeat((row.count / 5).min(50) as usize);
        println!("  {:12} : {:4} {}", row.roi_range.unwrap_or_default(), row.count, bar);
    }
    
    Ok(())
}

async fn query_dex_statistics(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("🏦 DEX使用统计:\n");
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            s.dex_name,
            COUNT(DISTINCT s.opportunity_id) as "opportunities_used!",
            AVG(o.roi_percent) as avg_roi,
            COUNT(*) as "total_steps!"
        FROM arbitrage_steps s
        JOIN arbitrage_opportunities o ON s.opportunity_id = o.id
        GROUP BY s.dex_name
        ORDER BY opportunities_used DESC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        println!("{}", row.dex_name);
        println!("  使用次数: {} 个机会", row.opportunities_used);
        println!("  平均ROI: {:.4}%", row.avg_roi.unwrap_or_default());
        println!("  总步骤数: {}", row.total_steps);
        println!();
    }
    
    Ok(())
}

async fn query_hourly_stats(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("⏰ 每小时统计 (最近24小时):\n");
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            DATE_TRUNC('hour', discovered_at) as hour,
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi,
            MAX(roi_percent) as max_roi
        FROM arbitrage_opportunities
        WHERE discovered_at > NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', discovered_at)
        ORDER BY hour DESC
        LIMIT 24
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        println!("{} | 机会: {:3} | 平均ROI: {:5.2}% | 最大ROI: {:5.2}%", 
            row.hour.unwrap().format("%Y-%m-%d %H:00"),
            row.count,
            row.avg_roi.unwrap_or_default(),
            row.max_roi.unwrap_or_default());
    }
    
    Ok(())
}

async fn query_by_id(pool: &PgPool, id: i32) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 机会详情 (ID: {})\n", id);
    
    // 查询主记录
    let opp = sqlx::query!(
        r#"
        SELECT 
            id, discovered_at, time_since_subscription_ms,
            arbitrage_type, start_token, end_token,
            input_amount, output_amount, gross_profit, net_profit, 
            roi_percent, estimated_fees, hop_count, path_summary,
            router_mode, min_roi_threshold,
            is_executed, execution_status, execution_tx_hash, actual_profit
        FROM arbitrage_opportunities
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?;
    
    if let Some(opp) = opp {
        println!("基本信息:");
        println!("  发现时间: {}", opp.discovered_at.format("%Y-%m-%d %H:%M:%S%.3f"));
        if let Some(ms) = opp.time_since_subscription_ms {
            println!("  订阅延迟: {}ms", ms);
        }
        println!("  类型: {} | 模式: {}", opp.arbitrage_type, opp.router_mode.unwrap_or_default());
        println!("  ROI阈值: {:.2}%", opp.min_roi_threshold.unwrap_or_default());
        println!();
        
        println!("财务信息:");
        println!("  输入金额: {} {}", opp.input_amount, opp.start_token);
        println!("  输出金额: {} {}", opp.output_amount, opp.end_token);
        println!("  毛利润: {} {}", opp.gross_profit, opp.start_token);
        println!("  估算费用: {} {}", opp.estimated_fees, opp.start_token);
        println!("  净利润: {} {}", opp.net_profit, opp.start_token);
        println!("  ROI: {:.4}%", opp.roi_percent);
        println!();
        
        println!("路径信息:");
        println!("  跳数: {}", opp.hop_count);
        println!("  路径: {}", opp.path_summary);
        println!();
        
        // 查询详细步骤
        let steps = sqlx::query!(
            r#"
            SELECT 
                step_order, pool_id, dex_name,
                input_token, output_token, price,
                liquidity_base, liquidity_quote,
                expected_input, expected_output
            FROM arbitrage_steps
            WHERE opportunity_id = $1
            ORDER BY step_order
            "#,
            id
        )
        .fetch_all(pool)
        .await?;
        
        println!("详细步骤:");
        for step in steps {
            println!("  步骤 {}:", step.step_order);
            println!("    DEX: {}", step.dex_name);
            println!("    池子: {}", step.pool_id);
            println!("    交易: {} → {}", step.input_token, step.output_token);
            println!("    价格: {:.10}", step.price);
            println!("    输入: {:.6} | 输出: {:.6}", 
                step.expected_input.unwrap_or_default(),
                step.expected_output.unwrap_or_default());
            println!("    流动性: {} / {}", 
                step.liquidity_base.unwrap_or_default(),
                step.liquidity_quote.unwrap_or_default());
            println!();
        }
        
        println!("执行状态:");
        println!("  已执行: {}", if opp.is_executed.unwrap_or(false) { "是" } else { "否" });
        if let Some(status) = opp.execution_status {
            println!("  状态: {}", status);
        }
        if let Some(tx) = opp.execution_tx_hash {
            println!("  交易哈希: {}", tx);
        }
        if let Some(profit) = opp.actual_profit {
            println!("  实际利润: {}", profit);
        }
    } else {
        println!("未找到ID为 {} 的机会", id);
    }
    
    Ok(())
}


 * 套利机会查询工具
 * 
 * 用于查询和分析数据库中记录的套利机会
 */

use sqlx::PgPool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 从环境变量或参数获取数据库URL
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:Yuan971035088@localhost:5432/postgres".to_string());
    
    // 连接数据库
    println!("📊 Connecting to database...");
    let pool = PgPool::connect(&database_url).await?;
    println!("✅ Connected!\n");
    
    // 解析命令行参数
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        print_usage();
        return Ok(());
    }
    
    match args[1].as_str() {
        "--recent" => {
            let limit = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(10);
            query_recent_opportunities(&pool, limit).await?;
        }
        "--stats" => {
            query_statistics(&pool).await?;
        }
        "--roi-dist" => {
            query_roi_distribution(&pool).await?;
        }
        "--dex-stats" => {
            query_dex_statistics(&pool).await?;
        }
        "--hourly" => {
            query_hourly_stats(&pool).await?;
        }
        "--by-id" => {
            let id: i32 = args.get(2)
                .and_then(|s| s.parse().ok())
                .expect("Please provide opportunity ID");
            query_by_id(&pool, id).await?;
        }
        _ => {
            print_usage();
        }
    }
    
    Ok(())
}

fn print_usage() {
    println!("Usage:");
    println!("  cargo run --example query_opportunities -- [command] [args]");
    println!();
    println!("Commands:");
    println!("  --recent [N]    Show N most recent opportunities (default: 10)");
    println!("  --stats         Show overall statistics");
    println!("  --roi-dist      Show ROI distribution");
    println!("  --dex-stats     Show DEX performance statistics");
    println!("  --hourly        Show hourly statistics");
    println!("  --by-id [ID]    Show detailed information for specific opportunity");
    println!();
    println!("Examples:");
    println!("  cargo run --example query_opportunities -- --recent 20");
    println!("  cargo run --example query_opportunities -- --stats");
    println!("  cargo run --example query_opportunities -- --by-id 42");
}

async fn query_recent_opportunities(pool: &PgPool, limit: i64) -> Result<(), Box<dyn std::error::Error>> {
    println!("📋 最近的 {} 个套利机会:\n", limit);
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            id, discovered_at, time_since_subscription_ms,
            arbitrage_type, start_token, end_token,
            roi_percent, net_profit, hop_count, path_summary,
            router_mode
        FROM arbitrage_opportunities
        ORDER BY discovered_at DESC
        LIMIT $1
        "#,
        limit
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        println!("ID: {} | 时间: {}", row.id, row.discovered_at.format("%Y-%m-%d %H:%M:%S"));
        if let Some(ms) = row.time_since_subscription_ms {
            println!("   延迟: {}ms 自订阅开始", ms);
        }
        println!("   类型: {} | 模式: {}", row.arbitrage_type, row.router_mode.unwrap_or_default());
        println!("   ROI: {:.4}% | 净利润: {} {}", row.roi_percent, row.net_profit, row.start_token);
        println!("   跳数: {} | 路径: {}", row.hop_count, row.path_summary);
        println!();
    }
    
    Ok(())
}

async fn query_statistics(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("📈 总体统计:\n");
    
    let row = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi,
            MIN(roi_percent) as min_roi,
            MAX(roi_percent) as max_roi,
            AVG(net_profit) as avg_profit,
            AVG(hop_count) as avg_hops,
            COUNT(CASE WHEN is_executed THEN 1 END) as "executed_count!"
        FROM arbitrage_opportunities
        "#
    )
    .fetch_one(pool)
    .await?;
    
    println!("总机会数: {}", row.count);
    println!("平均ROI: {:.4}%", row.avg_roi.unwrap_or_default());
    println!("ROI范围: {:.4}% - {:.4}%", 
        row.min_roi.unwrap_or_default(), 
        row.max_roi.unwrap_or_default());
    println!("平均净利润: {:.2}", row.avg_profit.unwrap_or_default());
    println!("平均跳数: {:.2}", row.avg_hops.unwrap_or_default());
    println!("已执行: {}", row.executed_count);
    println!();
    
    // 按类型统计
    println!("按类型统计:");
    let type_rows = sqlx::query!(
        r#"
        SELECT 
            arbitrage_type,
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi
        FROM arbitrage_opportunities
        GROUP BY arbitrage_type
        ORDER BY count DESC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in type_rows {
        println!("  {}: {} 次 (平均ROI: {:.4}%)", 
            row.arbitrage_type, 
            row.count,
            row.avg_roi.unwrap_or_default());
    }
    println!();
    
    // 按模式统计
    println!("按路由模式统计:");
    let mode_rows = sqlx::query!(
        r#"
        SELECT 
            router_mode,
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi
        FROM arbitrage_opportunities
        WHERE router_mode IS NOT NULL
        GROUP BY router_mode
        ORDER BY count DESC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in mode_rows {
        println!("  {}: {} 次 (平均ROI: {:.4}%)", 
            row.router_mode.unwrap_or_default(), 
            row.count,
            row.avg_roi.unwrap_or_default());
    }
    
    Ok(())
}

async fn query_roi_distribution(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("📊 ROI分布:\n");
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            CASE 
                WHEN roi_percent < 0.5 THEN '< 0.5%'
                WHEN roi_percent < 1.0 THEN '0.5-1.0%'
                WHEN roi_percent < 2.0 THEN '1.0-2.0%'
                WHEN roi_percent < 5.0 THEN '2.0-5.0%'
                ELSE '> 5.0%'
            END as roi_range,
            COUNT(*) as "count!"
        FROM arbitrage_opportunities
        GROUP BY roi_range
        ORDER BY MIN(roi_percent)
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        let bar = "█".repeat((row.count / 5).min(50) as usize);
        println!("  {:12} : {:4} {}", row.roi_range.unwrap_or_default(), row.count, bar);
    }
    
    Ok(())
}

async fn query_dex_statistics(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("🏦 DEX使用统计:\n");
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            s.dex_name,
            COUNT(DISTINCT s.opportunity_id) as "opportunities_used!",
            AVG(o.roi_percent) as avg_roi,
            COUNT(*) as "total_steps!"
        FROM arbitrage_steps s
        JOIN arbitrage_opportunities o ON s.opportunity_id = o.id
        GROUP BY s.dex_name
        ORDER BY opportunities_used DESC
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        println!("{}", row.dex_name);
        println!("  使用次数: {} 个机会", row.opportunities_used);
        println!("  平均ROI: {:.4}%", row.avg_roi.unwrap_or_default());
        println!("  总步骤数: {}", row.total_steps);
        println!();
    }
    
    Ok(())
}

async fn query_hourly_stats(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("⏰ 每小时统计 (最近24小时):\n");
    
    let rows = sqlx::query!(
        r#"
        SELECT 
            DATE_TRUNC('hour', discovered_at) as hour,
            COUNT(*) as "count!",
            AVG(roi_percent) as avg_roi,
            MAX(roi_percent) as max_roi
        FROM arbitrage_opportunities
        WHERE discovered_at > NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', discovered_at)
        ORDER BY hour DESC
        LIMIT 24
        "#
    )
    .fetch_all(pool)
    .await?;
    
    for row in rows {
        println!("{} | 机会: {:3} | 平均ROI: {:5.2}% | 最大ROI: {:5.2}%", 
            row.hour.unwrap().format("%Y-%m-%d %H:00"),
            row.count,
            row.avg_roi.unwrap_or_default(),
            row.max_roi.unwrap_or_default());
    }
    
    Ok(())
}

async fn query_by_id(pool: &PgPool, id: i32) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 机会详情 (ID: {})\n", id);
    
    // 查询主记录
    let opp = sqlx::query!(
        r#"
        SELECT 
            id, discovered_at, time_since_subscription_ms,
            arbitrage_type, start_token, end_token,
            input_amount, output_amount, gross_profit, net_profit, 
            roi_percent, estimated_fees, hop_count, path_summary,
            router_mode, min_roi_threshold,
            is_executed, execution_status, execution_tx_hash, actual_profit
        FROM arbitrage_opportunities
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?;
    
    if let Some(opp) = opp {
        println!("基本信息:");
        println!("  发现时间: {}", opp.discovered_at.format("%Y-%m-%d %H:%M:%S%.3f"));
        if let Some(ms) = opp.time_since_subscription_ms {
            println!("  订阅延迟: {}ms", ms);
        }
        println!("  类型: {} | 模式: {}", opp.arbitrage_type, opp.router_mode.unwrap_or_default());
        println!("  ROI阈值: {:.2}%", opp.min_roi_threshold.unwrap_or_default());
        println!();
        
        println!("财务信息:");
        println!("  输入金额: {} {}", opp.input_amount, opp.start_token);
        println!("  输出金额: {} {}", opp.output_amount, opp.end_token);
        println!("  毛利润: {} {}", opp.gross_profit, opp.start_token);
        println!("  估算费用: {} {}", opp.estimated_fees, opp.start_token);
        println!("  净利润: {} {}", opp.net_profit, opp.start_token);
        println!("  ROI: {:.4}%", opp.roi_percent);
        println!();
        
        println!("路径信息:");
        println!("  跳数: {}", opp.hop_count);
        println!("  路径: {}", opp.path_summary);
        println!();
        
        // 查询详细步骤
        let steps = sqlx::query!(
            r#"
            SELECT 
                step_order, pool_id, dex_name,
                input_token, output_token, price,
                liquidity_base, liquidity_quote,
                expected_input, expected_output
            FROM arbitrage_steps
            WHERE opportunity_id = $1
            ORDER BY step_order
            "#,
            id
        )
        .fetch_all(pool)
        .await?;
        
        println!("详细步骤:");
        for step in steps {
            println!("  步骤 {}:", step.step_order);
            println!("    DEX: {}", step.dex_name);
            println!("    池子: {}", step.pool_id);
            println!("    交易: {} → {}", step.input_token, step.output_token);
            println!("    价格: {:.10}", step.price);
            println!("    输入: {:.6} | 输出: {:.6}", 
                step.expected_input.unwrap_or_default(),
                step.expected_output.unwrap_or_default());
            println!("    流动性: {} / {}", 
                step.liquidity_base.unwrap_or_default(),
                step.liquidity_quote.unwrap_or_default());
            println!();
        }
        
        println!("执行状态:");
        println!("  已执行: {}", if opp.is_executed.unwrap_or(false) { "是" } else { "否" });
        if let Some(status) = opp.execution_status {
            println!("  状态: {}", status);
        }
        if let Some(tx) = opp.execution_tx_hash {
            println!("  交易哈希: {}", tx);
        }
        if let Some(profit) = opp.actual_profit {
            println!("  实际利润: {}", profit);
        }
    } else {
        println!("未找到ID为 {} 的机会", id);
    }
    
    Ok(())
}















