mod api;
mod arbitrage;
mod config;
mod database;
mod dex_interface;
mod deserializers;
mod metrics;
mod pool_factory;
mod price_cache;
mod proxy;
mod router;
mod router_bellman_ford;
mod router_split_optimizer;
mod router_advanced;
mod websocket;
mod vault_reader;

use anyhow::Result;
use std::env;
use std::sync::Arc;
use tokio::time::{interval, Duration};

use config::Config;
use database::{DatabaseManager, DatabaseConfig};
use metrics::MetricsCollector;
use price_cache::PriceCache;
use router_advanced::{AdvancedRouter, AdvancedRouterConfig, RouterMode};
use websocket::WebSocketClient;

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> Result<()> {
    // Print banner
    print_banner();
    
    // Load configuration
    let config_path = env::args()
        .nth(1)
        .unwrap_or_else(|| "config.toml".to_string());
    
    println!("📋 Loading configuration from: {}", config_path);
    let config = Config::load_from_file(&config_path)?;
    
    println!("✅ Configuration loaded successfully");
    println!("   WebSocket URL: {}", config.websocket_url());
    println!("   Pools to monitor: {}", config.pools().len());
    for pool in config.pools() {
        println!("     - {} ({})", pool.name, pool.address);
    }
    
    // Display proxy configuration
    if let Some(proxy) = &config.proxy {
        if proxy.enabled {
            println!("   Proxy: {}:{} (enabled)", proxy.host, proxy.port);
        } else {
            println!("   Proxy: disabled");
        }
    } else {
        println!("   Proxy: not configured");
    }
    println!();
    
    // Initialize metrics collector
    let metrics = Arc::new(MetricsCollector::new(1000));
    
    // Initialize price cache
    let price_cache = Arc::new(PriceCache::new());
    
    // Initialize database (if enabled)
    let db_manager = if let Some(db_config) = &config.database {
        if db_config.enabled {
            println!("🗄️  Initializing database...");
            match DatabaseManager::new(DatabaseConfig {
                enabled: db_config.enabled,
                url: db_config.url.clone(),
                record_opportunities: db_config.record_opportunities,
                record_pool_updates: db_config.record_pool_updates,
                record_performance: db_config.record_performance,
            }).await {
                Ok(mut db) => {
                    db.set_subscription_start();
                    Some(Arc::new(tokio::sync::Mutex::new(db)))
                }
                Err(e) => {
                    eprintln!("⚠️  Database initialization failed: {}", e);
                    eprintln!("   Continuing without database recording...");
                    None
                }
            }
        } else {
            println!("   Database: disabled");
            None
        }
    } else {
        println!("   Database: not configured");
        None
    };
    println!();
    
    // ✅ FIX: Connect WebSocket in MAIN task (avoids spawn scheduling issue)
    println!("🔌 Establishing WebSocket connection in main task...");
    println!("   URL: {}", config.websocket_url());
    
    let ws_stream = match proxy::connect_direct(config.websocket_url()).await {
        Ok(stream) => {
            println!("✅ WebSocket connected successfully!");
            stream
        }
        Err(e) => {
            eprintln!("❌ Failed to connect to WebSocket: {}", e);
            eprintln!("   Please check your network connection and RPC endpoint");
            return Err(e);
        }
    };
    
    // Initialize WebSocket client
    println!("📡 Initializing WebSocket client...");
    let ws_client = WebSocketClient::new(
        config.websocket_url().to_string(),
        metrics.clone(),
        config.proxy.clone(),
        price_cache.clone(),
    );
    
    // Spawn WebSocket processing task with the already-connected stream
    println!("🚀 Starting WebSocket message processing task...");
    let pools = config.pools().to_vec();
    let ws_handle = tokio::spawn(async move {
        if let Err(e) = ws_client.run_with_stream(ws_stream, pools).await {
            eprintln!("❌ Fatal WebSocket error: {}", e);
        }
    });
    
    // Spawn metrics reporting task
    println!("📊 Starting metrics reporting task...");
    let metrics_clone = metrics.clone();
    let metrics_handle = tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(60));
        
        loop {
            ticker.tick().await;
            metrics_clone.print_stats(60);
        }
    });
    
    // Spawn advanced arbitrage router task
    println!("⚡ Starting advanced arbitrage router with Bellman-Ford + DP optimization...");
    let price_cache_clone = price_cache.clone();
    let db_manager_clone = db_manager.clone();
    let router_config = if let Some(ref router_cfg) = config.router {
        AdvancedRouterConfig {
            mode: RouterMode::from_str(&router_cfg.mode),
            min_roi_percent: router_cfg.min_roi_percent,
            max_hops: router_cfg.max_hops,
            enable_split_optimization: router_cfg.enable_split_optimization,
            max_splits: router_cfg.split_optimizer.as_ref().map(|s| s.max_splits).unwrap_or(5),
            min_split_amount: router_cfg.split_optimizer.as_ref().map(|s| s.min_split_amount).unwrap_or(100.0),
        }
    } else {
        AdvancedRouterConfig::default()
    };
    
    let arbitrage_handle = tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(5)); // Scan every 5 seconds
        
        // 创建高级路由器
        let advanced_router = AdvancedRouter::new(price_cache_clone.clone(), router_config.clone());
        
        println!("🎯 Advanced Router initialized:");
        println!("   Mode: {:?}", router_config.mode);
        println!("   Min ROI: {}%", router_config.min_roi_percent);
        println!("   Max hops: {}", router_config.max_hops);
        println!("   Split optimization: {}", router_config.enable_split_optimization);
        println!("   Algorithms: Bellman-Ford + Dynamic Programming + Quick Scan");
        println!("   Expected coverage: 100% opportunities, 100% profit\n");
        
        loop {
            ticker.tick().await;
            
            // 寻找所有套利机会（使用高级算法）
            let initial_amount = 1000.0; // 测试金额：1000 USDC/USDT
            let all_paths = advanced_router.find_optimal_routes(initial_amount).await;
            
            if !all_paths.is_empty() {
                println!("\n🔥 Found {} arbitrage opportunities (optimized):\n", all_paths.len());
                
                // 记录所有机会到数据库
                if let Some(ref db) = db_manager_clone {
                    let router_mode = format!("{:?}", router_config.mode);
                    for optimized_path in &all_paths {
                        if let Ok(db_lock) = db.try_lock() {
                            if let Err(e) = db_lock.record_opportunity(
                                &optimized_path.base_path,
                                &router_mode,
                                router_config.min_roi_percent
                            ).await {
                                eprintln!("⚠️  Failed to record opportunity to database: {}", e);
                            }
                        }
                    }
                }
                
                // 显示前5个最优机会
                for (idx, path) in all_paths.iter().take(5).enumerate() {
                    println!("{}. {}", idx + 1, advanced_router.format_optimized_path(path));
                }
                
                // 选择最优路径
                if let Some(best) = advanced_router.select_best(&all_paths) {
                    println!("⭐ BEST OPPORTUNITY (Score: {:.2}):", best.score());
                    println!("{}", advanced_router.format_optimized_path(best));
                }
            }
        }
    });
    
    // Spawn HTTP API server LAST (starts in background)
    println!("🌐 Starting HTTP API server...");
    let api_handle = {
        let price_cache_clone = price_cache.clone();
        tokio::spawn(async move {
            if let Err(e) = api::start_api_server(price_cache_clone, 3001).await {
                eprintln!("❌ API server error: {}", e);
            }
        })
    };
    
    println!("\n✅ All tasks started successfully!\n");
    
    // Wait for tasks to complete (they run indefinitely)
    tokio::select! {
        _ = ws_handle => {
            eprintln!("WebSocket task terminated");
        }
        _ = metrics_handle => {
            eprintln!("Metrics task terminated");
        }
        _ = arbitrage_handle => {
            eprintln!("Arbitrage scanner terminated");
        }
        _ = api_handle => {
            eprintln!("API server terminated");
        }
        _ = tokio::signal::ctrl_c() => {
            println!("\n\n🛑 Received Ctrl+C, shutting down...");
            
            // Print final statistics
            println!("\n📊 Final Statistics:");
            metrics.print_stats(60);
            
            // Print cache stats
            let (pools, pairs) = price_cache.get_stats();
            println!("\n💾 Cache Statistics:");
            println!("   Cached pools: {}", pools);
            println!("   Unique pairs: {:?}", pairs);
            
            println!("👋 Goodbye!\n");
        }
    }
    
    Ok(())
}

fn print_banner() {
    println!("\n╔═══════════════════════════════════════════════════════════╗");
    println!("║                                                           ║");
    println!("║   🦀 Solana Pool Cache - Prototype Version 0.1.0          ║");
    println!("║                                                           ║");
    println!("║   Real-time WebSocket subscription to Raydium pools      ║");
    println!("║   Measuring latency and validating Borsh deserialization ║");
    println!("║                                                           ║");
    println!("╚═══════════════════════════════════════════════════════════╝\n");
}

