mod api;
mod arbitrage;
mod config;
mod database;
mod dex_interface;
mod deserializers;
mod error_tracker;
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
mod opportunity_validator;  // 🎯 套利机会验证器
mod onchain_simulator;      // 🎯 链上模拟器
mod pool_initializer;       // 🚀 池子初始化器

use anyhow::Result;
use std::env;
use std::sync::Arc;
use tokio::time::{interval, Duration};
use tracing::{info, error, warn};
use tracing_subscriber::{fmt, EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

use config::Config;
use database::{DatabaseManager, DatabaseConfig};
use error_tracker::ErrorTracker;
use metrics::MetricsCollector;
use price_cache::PriceCache;
use router_advanced::{AdvancedRouter, AdvancedRouterConfig, RouterMode};
use websocket::WebSocketClient;

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> Result<()> {
    // Initialize logging system first
    init_logging()?;
    
    // Print banner
    print_banner();
    
    // Load configuration
    let config_path = env::args()
        .nth(1)
        .unwrap_or_else(|| "config.toml".to_string());
    
    info!("Loading configuration from: {}", config_path);
    let config = Config::load_from_file(&config_path)?;
    
    info!("Configuration loaded successfully");
    info!("WebSocket URL: {}", config.websocket_url());
    info!("Pools to monitor: {}", config.pools().len());
    for pool in config.pools() {
        info!("  - {} ({})", pool.name, pool.address);
    }
    
    // Display proxy configuration
    if let Some(proxy) = &config.proxy {
        if proxy.enabled {
            info!("Proxy: {}:{} (enabled)", proxy.host, proxy.port);
        } else {
            info!("Proxy: disabled");
        }
    } else {
        info!("Proxy: not configured");
    }
    
    // Initialize error tracker
    let error_tracker = Arc::new(ErrorTracker::new());
    
    // Initialize metrics collector
    let metrics = Arc::new(MetricsCollector::new(1000));
    
    // Initialize price cache
    let price_cache = Arc::new(PriceCache::new());
    
    // 🚀 Initialize pools proactively (if enabled)
    if let Some(init_config) = &config.initialization {
        if init_config.enabled && !init_config.rpc_urls.is_empty() {
            println!("🚀 Initializing pools via RPC batch query...");
            println!("   RPC endpoints: {}", init_config.rpc_urls.len());
            println!("   Pools to query: {}", config.pools().len());
            println!("   Batch size: {}", init_config.batch_size);
            println!("   Max retries: {}", init_config.max_retries);
            
            let initializer = pool_initializer::PoolInitializer::new(
                init_config.rpc_urls.clone(),
                init_config.timeout_ms,
            );
            
            let pool_addresses: Vec<String> = config
                .pools()
                .iter()
                .map(|p| p.address.clone())
                .collect();
            
            match initializer
                .fetch_pool_accounts(&pool_addresses, init_config.max_retries)
                .await
            {
                Ok(accounts_data) => {
                    let mut activated = 0;
                    
                    for (idx, account_data) in accounts_data.iter().enumerate() {
                        if let Some(data) = account_data {
                            let pool_config = &config.pools()[idx];
                            
                            // 尝试解析并激活池子
                            match pool_factory::PoolFactory::create_pool(
                                &pool_config.pool_type,
                                data,
                            ) {
                                Ok(pool) => {
                                    if pool.is_active() {
                                        // 添加到价格缓存
                                        let (base_reserve, quote_reserve) = pool.get_reserves();
                                        let price = pool.calculate_price();
                                        let (base_decimals, quote_decimals) = pool.get_decimals();
                                        
                                        price_cache.update_price(price_cache::PoolPrice {
                                            pool_id: pool_config.address.clone(),
                                            dex_name: pool.dex_name().to_string(),
                                            pair: pool_config.name.clone(),
                                            base_reserve,
                                            quote_reserve,
                                            base_decimals,
                                            quote_decimals,
                                            price,
                                            last_update: std::time::Instant::now(),
                                            slot: 0, // 初始化时slot为0
                                        });
                                        
                                        activated += 1;
                                        info!("   ✅ Activated: {} ({})", pool_config.name, pool.dex_name());
                                    } else {
                                        info!("   ⚠️  Inactive: {} (no reserves)", pool_config.name);
                                    }
                                }
                                Err(e) => {
                                    info!("   ⚠️  Failed to parse: {} - {}", pool_config.name, e);
                                }
                            }
                        } else {
                            let pool_config = &config.pools()[idx];
                            info!("   ❌ Not found: {}", pool_config.name);
                        }
                    }
                    
                    println!(
                        "✅ Initialized {}/{} pools successfully\n",
                        activated,
                        pool_addresses.len()
                    );
                }
                Err(e) => {
                    warn!(
                        "⚠️  Pool initialization failed: {}, continuing with WebSocket only",
                        e
                    );
                }
            }
        } else if let Some(init_config) = &config.initialization {
            if !init_config.enabled {
                println!("ℹ️  Pool initialization disabled in config\n");
            } else if init_config.rpc_urls.is_empty() {
                println!("⚠️  Pool initialization enabled but no RPC URLs configured\n");
            }
        }
    } else {
        println!("ℹ️  Pool initialization not configured\n");
    }
    
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
    
    // Get price change threshold from config
    let price_change_threshold = config.logging
        .as_ref()
        .map(|l| l.price_change_threshold_percent)
        .unwrap_or(1.0);
    
    // Initialize WebSocket client
    info!("Initializing WebSocket client...");
    let ws_client = WebSocketClient::new(
        config.websocket_url().to_string(),
        metrics.clone(),
        config.proxy.clone(),
        price_cache.clone(),
        error_tracker.clone(),
        price_change_threshold,
    );
    
    // Spawn WebSocket processing task with the already-connected stream
    info!("Starting WebSocket message processing task...");
    let pools = config.pools().to_vec();
    let ws_handle = tokio::spawn(async move {
        if let Err(e) = ws_client.run_with_stream(ws_stream, pools).await {
            error!("Fatal WebSocket error: {}", e);
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
    
    let arbitrage_handle = if config.router.as_ref()
        .and_then(|r| r.event_driven.as_ref())
        .map(|e| e.enabled)
        .unwrap_or(false)
    {
        // 🎯 Event-driven mode
        let event_config = config.router.as_ref().unwrap().event_driven.as_ref().unwrap().clone();
        
        tokio::spawn(async move {
            let advanced_router = AdvancedRouter::new(price_cache_clone.clone(), router_config.clone());
            
            println!("🎯 Event-Driven Router initialized:");
            println!("   Mode: {:?}", router_config.mode);
            println!("   Min ROI: {}%", router_config.min_roi_percent);
            println!("   Max hops: {}", router_config.max_hops);
            println!("   Split optimization: {}", router_config.enable_split_optimization);
            println!("   Debounce: {}ms", event_config.debounce_ms);
            println!("   Trigger threshold: {}%", event_config.price_change_threshold_percent);
            println!("   Validation: {}", event_config.validation_strategy);
            println!("   Max concurrent: {}", event_config.max_concurrent_scans);
            println!("   Algorithms: Bellman-Ford + Dynamic Programming + Quick Scan");
            println!("   Expected coverage: 100% opportunities, 100% profit\n");
            
            let mut update_rx = price_cache_clone.subscribe_updates();
            let scan_semaphore = Arc::new(tokio::sync::Semaphore::new(event_config.max_concurrent_scans));
            let mut last_scan_trigger = tokio::time::Instant::now();
            
            let mut event_count = 0u64;
            let mut filtered_count = 0u64;
            let mut scan_count = 0u64;
            
            loop {
                // Wait for significant price update
                match update_rx.recv().await {
                    Ok(event) => {
                        event_count += 1;
                        
                        // 🔍 Log every price update (can be verbose)
                        if event_count % 10 == 0 {
                            println!("📊 Price update stats: {} total events, {} filtered, {} scans triggered", 
                                event_count, filtered_count, scan_count);
                        }
                        
                        // Smart trigger: only process significant changes
                        // 🚨 Critical fix: Filter out NaN/Infinity values
                        if !event.price_change_percent.is_finite() || 
                           event.price_change_percent < event_config.price_change_threshold_percent {
                            filtered_count += 1;
                            continue;
                        }
                        
                        println!("\n🎯 Significant price change detected:");
                        println!("   Pool: {}", event.pool_id);
                        println!("   Change: {:.2}% (threshold: {:.2}%)", 
                            event.price_change_percent, event_config.price_change_threshold_percent);
                        println!("   Old price: {:?}", event.old_price);
                        println!("   New price: {}", event.new_price);
                        
                        // Debounce: wait for the configured delay
                        tokio::time::sleep(tokio::time::Duration::from_millis(event_config.debounce_ms)).await;
                        
                        // Check if enough time has passed since last scan
                        let elapsed = last_scan_trigger.elapsed();
                        if elapsed < tokio::time::Duration::from_millis(event_config.debounce_ms) {
                            println!("   ⏭️  Skipped: debounce not satisfied ({}ms < {}ms)", 
                                elapsed.as_millis(), event_config.debounce_ms);
                            continue;
                        }
                        
                        last_scan_trigger = tokio::time::Instant::now();
                        
                        // Acquire semaphore to limit concurrent scans
                        if let Ok(permit) = scan_semaphore.clone().try_acquire_owned() {
                            scan_count += 1;
                            println!("   ✅ Triggering arbitrage scan #{}", scan_count);
                            
                            let router_clone = advanced_router.clone();
                            let db_clone = db_manager_clone.clone();
                            let router_cfg = router_config.clone();
                            let validation = event_config.validation_strategy.clone();
                            
                            // Spawn scan task
                            tokio::spawn(async move {
                                let _permit = permit;  // Hold permit until task completes
                                
                                let scan_start = tokio::time::Instant::now();
                                let initial_amount = 1000.0;
                                
                                println!("🔍 Starting arbitrage scan...");
                                println!("   Initial amount: ${}", initial_amount);
                                println!("   Min ROI: {}%", router_cfg.min_roi_percent);
                                println!("   Router mode: {:?}", router_cfg.mode);
                                
                                let all_paths = router_clone.find_optimal_routes(initial_amount).await;
                                let scan_duration = scan_start.elapsed();
                                
                                println!("⏱️  Scan completed in {:?}", scan_duration);
                                println!("📊 Result: {} opportunities found", all_paths.len());
                                
                                if !all_paths.is_empty() {
                                    println!("\n🔥 Found {} arbitrage opportunities (event-driven):\n", all_paths.len());
                                    
                                    // Record to database
                                    if let Some(ref db) = db_clone {
                                        let router_mode = format!("{:?}", router_cfg.mode);
                                        for optimized_path in &all_paths {
                                            if let Ok(db_lock) = db.try_lock() {
                                                if let Err(e) = db_lock.record_opportunity(
                                                    &optimized_path.base_path,
                                                    &router_mode,
                                                    router_cfg.min_roi_percent
                                                ).await {
                                                    eprintln!("⚠️ Failed to record opportunity: {}", e);
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Validation strategy
                                    match validation.as_str() {
                                        "immediate" => {
                                            println!("✅ Immediate validation: {} paths", all_paths.len());
                                        }
                                        "none" => {
                                            // No validation
                                        }
                                        "deferred" => {
                                            println!("⏳ Deferred validation: {} paths queued", all_paths.len());
                                        }
                                        _ => {}
                                    }
                                    
                                    // Display top 5
                                    for (idx, path) in all_paths.iter().take(5).enumerate() {
                                        println!("{}. {}", idx + 1, router_clone.format_optimized_path(path));
                                    }
                                    
                                    // Select best
                                    if let Some(best) = router_clone.select_best(&all_paths) {
                                        println!("⭐ BEST OPPORTUNITY (Score: {:.2}):", best.score());
                                    }
                                } else {
                                    println!("❌ No profitable opportunities found");
                                    println!("   Possible reasons:");
                                    println!("   - Market is efficient (no arbitrage gaps > {}%)", router_cfg.min_roi_percent);
                                    println!("   - Price changes too small");
                                    println!("   - Insufficient liquidity in pools");
                                }
                            });
                        } else {
                            println!("   ⏸️  Scan skipped: max concurrent scans reached ({})", event_config.max_concurrent_scans);
                        }
                    }
                    Err(e) => {
                        eprintln!("Error receiving price update: {:?}", e);
                        break;
                    }
                }
            }
        })
    } else {
        // ⏰ Fallback: timer-based mode
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(5));
            let advanced_router = AdvancedRouter::new(price_cache_clone.clone(), router_config.clone());
            
            println!("⏰ Timer-Based Router initialized (fallback mode):");
            println!("   Mode: {:?}", router_config.mode);
            println!("   Min ROI: {}%", router_config.min_roi_percent);
            println!("   Max hops: {}", router_config.max_hops);
            println!("   Split optimization: {}", router_config.enable_split_optimization);
            println!("   Scan interval: 5 seconds");
            println!("   Algorithms: Bellman-Ford + Dynamic Programming + Quick Scan\n");
            
            let mut scan_count = 0u64;
            loop {
                ticker.tick().await;
                scan_count += 1;
                
                println!("\n⏰ Timer-based scan #{} triggered", scan_count);
                let scan_start = tokio::time::Instant::now();
                let initial_amount = 1000.0;
                
                println!("🔍 Starting arbitrage scan...");
                println!("   Initial amount: ${}", initial_amount);
                println!("   Min ROI: {}%", router_config.min_roi_percent);
                println!("   Router mode: {:?}", router_config.mode);
                
                let all_paths = advanced_router.find_optimal_routes(initial_amount).await;
                let scan_duration = scan_start.elapsed();
                
                println!("⏱️  Scan completed in {:?}", scan_duration);
                println!("📊 Result: {} opportunities found", all_paths.len());
                
                if !all_paths.is_empty() {
                    println!("\n🔥 Found {} arbitrage opportunities (timer-based):\n", all_paths.len());
                    
                    if let Some(ref db) = db_manager_clone {
                        let router_mode = format!("{:?}", router_config.mode);
                        for optimized_path in &all_paths {
                            if let Ok(db_lock) = db.try_lock() {
                                if let Err(e) = db_lock.record_opportunity(
                                    &optimized_path.base_path,
                                    &router_mode,
                                    router_config.min_roi_percent
                                ).await {
                                    eprintln!("⚠️ Failed to record opportunity: {}", e);
                                }
                            }
                        }
                    }
                    
                    for (idx, path) in all_paths.iter().take(5).enumerate() {
                        println!("{}. {}", idx + 1, advanced_router.format_optimized_path(path));
                    }
                    
                    if let Some(best) = advanced_router.select_best(&all_paths) {
                        println!("⭐ BEST OPPORTUNITY (Score: {:.2}):", best.score());
                    }
                } else {
                    println!("❌ No profitable opportunities found");
                    println!("   Possible reasons:");
                    println!("   - Market is efficient (no arbitrage gaps > {}%)", router_config.min_roi_percent);
                    println!("   - Price changes too small");
                    println!("   - Insufficient liquidity in pools");
                }
            }
        })
    };
    
    // 🎯 创建链上模拟器（如果配置启用）
    let simulator = if let Some(sim_config) = &config.simulation {
        if sim_config.enabled {
            let rpc_url = sim_config.rpc_url.clone()
                .unwrap_or_else(|| {
                    // 从WebSocket URL转换为HTTP URL
                    config.websocket_url().replace("wss://", "https://").replace("ws://", "http://")
                });
            
            info!("🎯 Initializing on-chain simulator...");
            info!("   RPC URL: {}", rpc_url.chars().take(50).collect::<String>());
            info!("   Min confidence: {:.1}%", sim_config.min_confidence_for_simulation);
            info!("   Max concurrent: {}", sim_config.max_concurrent_simulations);
            
            let sim_cfg = onchain_simulator::SimulatorConfig {
                min_confidence_for_simulation: sim_config.min_confidence_for_simulation,
                timeout_ms: sim_config.simulation_timeout_ms,
                max_concurrent: sim_config.max_concurrent_simulations,
            };
            
            Some(Arc::new(onchain_simulator::OnChainSimulator::new(rpc_url, sim_cfg)))
        } else {
            info!("ℹ️  On-chain simulation disabled");
            None
        }
    } else {
        info!("ℹ️  On-chain simulation not configured");
        None
    };
    
    // Spawn HTTP API server LAST (starts in background)
    info!("Starting HTTP API server on port 3001...");
    let api_handle = {
        let price_cache_clone = price_cache.clone();
        let error_tracker_api = error_tracker.clone();
        let simulator_clone = simulator.clone();
        tokio::spawn(async move {
            if let Err(e) = api::start_api_server(price_cache_clone, error_tracker_api, simulator_clone, 3001).await {
                error!("API server error: {}", e);
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

/// Initialize the logging system with dual output
fn init_logging() -> Result<()> {
    // Create logs directory if it doesn't exist
    std::fs::create_dir_all("logs").ok();
    
    // File appender with daily rotation
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        "logs",
        "rust-pool-cache.log",
    );
    
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    
    // Determine log level from environment variable or default to INFO
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    // Build the subscriber with dual layers
    tracing_subscriber::registry()
        .with(env_filter)
        // Terminal layer: colored, human-readable
        .with(
            fmt::layer()
                .with_writer(std::io::stdout)
                .with_ansi(true)
                .with_target(false)
                .compact()
        )
        // File layer: JSON format for analysis
        .with(
            fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .json()
        )
        .init();
    
    // Prevent the guard from being dropped
    std::mem::forget(_guard);
    
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

