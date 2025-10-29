use anyhow::{Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Instant;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::{
    tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
};
use tracing::{info, warn, error, debug};

use crate::config::{PoolConfig, ProxyConfig};
use crate::dex_interface::DexPool;
use crate::error_tracker::ErrorTracker;
use crate::metrics::MetricsCollector;
use crate::pool_factory::PoolFactory;
use crate::price_cache::{PoolPrice, PriceCache};
use crate::proxy;
use crate::vault_reader::VaultReader;

#[allow(dead_code)]
type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// 订阅请求类型
#[derive(Debug, Clone)]
pub enum SubscriptionRequest {
    VaultAccount { address: String, pool_name: String },
}

pub struct WebSocketClient {
    url: String,
    metrics: Arc<MetricsCollector>,
    proxy_config: Option<ProxyConfig>,
    price_cache: Arc<PriceCache>,
    error_tracker: Arc<ErrorTracker>,
    subscription_map: Arc<Mutex<HashMap<u64, PoolConfig>>>,
    vault_pending_map: Arc<Mutex<HashMap<u64, String>>>, // 🌐 request_id -> vault地址（等待确认）
    vault_subscription_map: Arc<Mutex<HashMap<u64, String>>>, // 🌐 subscription_id -> vault地址（已确认）
    vault_reader: Arc<Mutex<VaultReader>>, // 🌐 Vault 读取器
    pool_data_cache: Arc<Mutex<HashMap<String, Vec<u8>>>>, // 🌐 缓存池子数据用于提取 vault
    last_prices: Arc<Mutex<HashMap<String, f64>>>, // 🔥 Track last prices for change detection
    price_change_threshold: f64, // 🔥 Price change threshold for logging
    vault_subscription_tx: Arc<Mutex<Option<mpsc::UnboundedSender<SubscriptionRequest>>>>, // 🌐 动态订阅channel
}

impl WebSocketClient {
    pub fn new(
        url: String,
        metrics: Arc<MetricsCollector>,
        proxy_config: Option<ProxyConfig>,
        price_cache: Arc<PriceCache>,
        error_tracker: Arc<ErrorTracker>,
        price_change_threshold: f64,
    ) -> Self {
        Self {
            url,
            metrics,
            proxy_config,
            price_cache,
            error_tracker,
            subscription_map: Arc::new(Mutex::new(HashMap::new())),
            vault_pending_map: Arc::new(Mutex::new(HashMap::new())), // 🌐 初始化vault等待映射
            vault_subscription_map: Arc::new(Mutex::new(HashMap::new())), // 🌐 初始化vault订阅映射
            vault_reader: Arc::new(Mutex::new(VaultReader::new())), // 🌐 初始化 VaultReader
            pool_data_cache: Arc::new(Mutex::new(HashMap::new())), // 🌐 初始化池子数据缓存
            last_prices: Arc::new(Mutex::new(HashMap::new())), // 🔥 初始化价格追踪
            price_change_threshold, // 🔥 设置价格变化阈值
            vault_subscription_tx: Arc::new(Mutex::new(None)), // 🌐 初始化为None，在连接时设置
        }
    }
    
    /// Connect to the WebSocket server and start processing messages
    pub async fn run(&self, pools: Vec<PoolConfig>) -> Result<()> {
        loop {
            match self.connect_and_process(&pools).await {
                Ok(_) => {
                    println!("⚠️  WebSocket connection closed normally");
                }
                Err(e) => {
                    eprintln!("❌ WebSocket error: {}. Reconnecting in 5 seconds...", e);
                }
            }
            
            sleep(Duration::from_secs(5)).await;
        }
    }
    
    /// Process messages from an already-connected WebSocket stream
    /// This version is used when the connection is established in the main task
    pub async fn run_with_stream(
        &self,
        ws_stream: proxy::WsStream,
        pools: Vec<PoolConfig>,
    ) -> Result<()> {
        println!("📨 Starting message processing with pre-connected stream");
        
        loop {
            match self.process_stream(ws_stream, &pools).await {
                Ok(_) => {
                    println!("⚠️  WebSocket connection closed normally");
                    // Connection closed, try to reconnect
                    break;
                }
                Err(e) => {
                    eprintln!("❌ WebSocket error: {}. Reconnecting in 5 seconds...", e);
                    break;
                }
            }
        }
        
        // If we get here, connection was lost. Try to reconnect using the old method.
        println!("🔄 Connection lost, switching to auto-reconnect mode...");
        self.run(pools).await
    }
    
    async fn connect_and_process(&self, pools: &[PoolConfig]) -> Result<()> {
        println!("🔌 Connecting to WebSocket: {}", self.url);
        
        // Check if proxy is configured and enabled
        let ws_stream = if let Some(proxy_cfg) = &self.proxy_config {
            if proxy_cfg.enabled {
                println!("🌐 Using proxy: {}:{}", proxy_cfg.host, proxy_cfg.port);
                proxy::connect_via_proxy(&proxy_cfg.host, proxy_cfg.port, &self.url).await?
            } else {
                println!("🌐 Proxy disabled, connecting directly");
                proxy::connect_direct(&self.url).await?
            }
        } else {
            println!("🌐 No proxy configured, connecting directly");
            proxy::connect_direct(&self.url).await?
        };
        
        println!("✅ WebSocket connected successfully");
        
        // Delegate to process_stream
        self.process_stream(ws_stream, pools).await
    }
    
    /// Process messages from a connected WebSocket stream
    async fn process_stream(
        &self,
        ws_stream: proxy::WsStream,
        pools: &[PoolConfig],
    ) -> Result<()> {
        let (mut write, mut read) = ws_stream.split();
        
        // 🌐 创建动态订阅channel
        let (vault_tx, mut vault_rx) = mpsc::unbounded_channel::<SubscriptionRequest>();
        {
            let mut tx_lock = self.vault_subscription_tx.lock().unwrap();
            *tx_lock = Some(vault_tx);
        }
        
        // 订阅ID计数器（池子使用1-N，vault使用10000+）
        let mut next_subscription_id = pools.len() as u64 + 10000;
        
        // Subscribe to all pools
        for (idx, pool) in pools.iter().enumerate() {
            let subscribe_msg = json!({
                "jsonrpc": "2.0",
                "id": idx + 1,
                "method": "accountSubscribe",
                "params": [
                    pool.address,
                    {
                        "encoding": "base64",
                        "commitment": "confirmed"
                    }
                ]
            });
            
            write
                .send(Message::Text(subscribe_msg.to_string()))
                .await
                .context("Failed to send subscribe message")?;
            
            debug!("Subscribed to {} ({})", pool.name, pool.address);
        }
        
        info!("Waiting for pool updates from {} pools...", pools.len());
        info!("🌐 Dynamic vault subscription enabled");
        
        // 🌐 使用select!同时处理WebSocket消息和动态订阅请求
        loop {
            tokio::select! {
                // 处理WebSocket消息
                message = read.next() => {
                    match message {
                        Some(Ok(Message::Text(text))) => {
                            if let Err(e) = self.handle_message(&text, pools).await {
                                eprintln!("⚠️  Error handling message: {}", e);
                            }
                        }
                        Some(Ok(Message::Close(_))) => {
                            println!("⚠️  Server closed the connection");
                            break;
                        }
                        Some(Err(e)) => {
                            eprintln!("❌ WebSocket error: {}", e);
                            break;
                        }
                        None => {
                            println!("⚠️  WebSocket stream ended");
                            break;
                        }
                        _ => {}
                    }
                }
                
                // 🌐 处理动态订阅请求
                Some(req) = vault_rx.recv() => {
                    match req {
                        SubscriptionRequest::VaultAccount { address, pool_name } => {
                            next_subscription_id += 1;
                            let request_id = next_subscription_id;
                            
                            // 记录到pending map（等待服务器确认）
                            {
                                let mut pending = self.vault_pending_map.lock().unwrap();
                                pending.insert(request_id, address.clone());
                            }
                            
                            let subscribe_msg = json!({
                                "jsonrpc": "2.0",
                                "id": request_id,
                                "method": "accountSubscribe",
                                "params": [
                                    address,
                                    {
                                        "encoding": "base64",
                                        "commitment": "confirmed"
                                    }
                                ]
                            });
                            
                            if let Err(e) = write.send(Message::Text(subscribe_msg.to_string())).await {
                                error!("Failed to subscribe to vault {}: {}", address, e);
                                // 订阅失败，从pending中移除
                                let mut pending = self.vault_pending_map.lock().unwrap();
                                pending.remove(&request_id);
                            } else {
                                info!("🌐 Subscribed to vault {} for pool {}", &address[0..8], pool_name);
                            }
                        }
                    }
                }
            }
        }
        
        // 清理channel
        {
            let mut tx_lock = self.vault_subscription_tx.lock().unwrap();
            *tx_lock = None;
        }
        
        Ok(())
    }
    
    async fn handle_message(&self, text: &str, pools: &[PoolConfig]) -> Result<()> {
        let start_time = Instant::now();
        
        let msg: serde_json::Value = serde_json::from_str(text)
            .context("Failed to parse JSON message")?;
        
        // Check if this is an account notification
        if msg.get("method").and_then(|m| m.as_str()) == Some("accountNotification") {
            self.handle_account_notification(&msg, start_time).await?;
        } else if msg.get("result").is_some() {
            // This is a subscription response
            let id = msg.get("id").and_then(|i| i.as_u64()).unwrap_or(0);
            let subscription_id = msg.get("result").and_then(|r| r.as_u64()).unwrap_or(0);
            
            // Map subscription_id to pool config (id is 1-indexed, pools is 0-indexed)
            if id > 0 && (id as usize) <= pools.len() {
                let pool_config = pools[(id - 1) as usize].clone();
                self.subscription_map.lock().unwrap().insert(subscription_id, pool_config.clone());
                debug!("✅ Pool subscription confirmed: id={}, subscription_id={}, pool={}", 
                       id, subscription_id, pool_config.name);
            } else if id >= 10000 {
                // 🌐 这是vault账户订阅（ID >= 10000）
                // 从pending map中获取vault地址，转移到subscription map
                let vault_address = {
                    let mut pending = self.vault_pending_map.lock().unwrap();
                    pending.remove(&id)
                };
                
                if let Some(address) = vault_address {
                    self.vault_subscription_map.lock().unwrap().insert(subscription_id, address.clone());
                    info!("✅ Vault subscription confirmed: request_id={}, subscription_id={}, vault={}", 
                           id, subscription_id, &address[0..8]);
                } else {
                    warn!("Vault subscription confirmed but not found in pending map: id={}", id);
                }
            } else {
                debug!("Subscription confirmed: id={}, subscription_id={}", id, subscription_id);
            }
        }
        
        Ok(())
    }
    
    async fn handle_account_notification(
        &self,
        msg: &serde_json::Value,
        start_time: Instant,
    ) -> Result<()> {
        // Extract the base64-encoded account data
        let data_array = msg
            .pointer("/params/result/value/data")
            .and_then(|d| d.as_array())
            .context("Missing data field")?;
        
        let base64_data = data_array
            .get(0)
            .and_then(|d| d.as_str())
            .context("Missing base64 data")?;
        
        let slot = msg
            .pointer("/params/result/context/slot")
            .and_then(|s| s.as_u64())
            .unwrap_or(0);
        
        // Get subscription ID to find the correct pool
        let subscription_id = msg
            .pointer("/params/subscription")
            .and_then(|s| s.as_u64())
            .context("Missing subscription ID")?;
        
        // Decode base64 first (需要先解码来检查数据大小)
        use base64::Engine;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .context("Failed to decode base64")?;
        
        // 🌐 检查是否是 vault 账户更新（165 字节 = SPL Token Account）
        if decoded.len() == 165 {
            // 这是Token账户，从vault_subscription_map中查找vault地址
            let vault_address = {
                let vault_map = self.vault_subscription_map.lock().unwrap();
                vault_map.get(&subscription_id).cloned()
            };
            
            if let Some(address) = vault_address {
                // 找到了vault地址，更新vault余额
                return self.handle_vault_update(&address, &decoded, "vault").await;
            } else {
                // 不是我们订阅的vault，可能是其他Token账户
                debug!("Received 165-byte account update (not a registered vault), subscription_id={}", subscription_id);
                return Ok(());
            }
        }
        
        // Look up pool config by subscription ID
        let pool_config = {
            let map = self.subscription_map.lock().unwrap();
            map.get(&subscription_id).cloned()
        };
        
        let pool_config = match pool_config {
            Some(config) => config,
            None => {
                warn!("Received update for unknown subscription ID: {}, data_len={}", subscription_id, decoded.len());
                return Ok(());
            }
        };
        
        let pool_name = &pool_config.name;
        let pool_type_str = &pool_config.pool_type;
        let pool_address = &pool_config.address;
        
        // ========================================
        // New Trait-based Approach
        // ========================================
        
        // Try to create pool using factory
        let pool_result = if pool_type_str == "unknown" || pool_type_str.is_empty() {
            // Auto-detect pool type
            PoolFactory::create_pool_auto_detect(&decoded)
        } else {
            // Use specified pool type
            PoolFactory::create_pool(pool_type_str, &decoded)
        };
        
        match pool_result {
            Ok(pool) => {
                // Check if pool is active
                if !pool.is_active() {
                    // Silently skip inactive pools
                    return Ok(());
                }
                
                // 🌐 检查池子是否需要 vault 读取
                if let Some((vault_a, vault_b)) = pool.get_vault_addresses() {
                    // 首次处理这个池子，注册 vault 并订阅
                    let mut pool_cache = self.pool_data_cache.lock().unwrap();
                    let is_first_time = !pool_cache.contains_key(pool_address);
                    
                    if is_first_time {
                        // 缓存池子数据
                        pool_cache.insert(pool_address.clone(), decoded.clone());
                        drop(pool_cache);
                        
                        info!(
                            pool = %pool_name,
                            "Pool requires vault data, subscribing and waiting for vault updates..."
                        );
                        
                        // 注册 vault
                        let vault_a_str = vault_a.to_string();
                        let vault_b_str = vault_b.to_string();
                        
                        {
                            let mut vault_reader = self.vault_reader.lock().unwrap();
                            vault_reader.register_pool_vaults(
                                pool_address,
                                &vault_a_str,
                                &vault_b_str
                            );
                        }
                        
                        println!("🌐 [{}] Detected vault addresses:", pool_name);
                        println!("   ├─ Vault A: {}", vault_a_str);
                        println!("   └─ Vault B: {}", vault_b_str);
                        
                        // 🚀 发送动态订阅请求
                        if let Some(tx) = self.vault_subscription_tx.lock().unwrap().as_ref() {
                            // 订阅Vault A
                            if let Err(e) = tx.send(SubscriptionRequest::VaultAccount {
                                address: vault_a_str.clone(),
                                pool_name: pool_name.to_string(),
                            }) {
                                error!("Failed to send vault A subscription request: {}", e);
                            }
                            
                            // 订阅Vault B
                            if let Err(e) = tx.send(SubscriptionRequest::VaultAccount {
                                address: vault_b_str.clone(),
                                pool_name: pool_name.to_string(),
                            }) {
                                error!("Failed to send vault B subscription request: {}", e);
                            }
                            
                            println!("   ✅ Vault subscription requests sent!");
                        } else {
                            warn!("Vault subscription channel not available");
                        }
                        
                        // 🚨 Critical fix: Don't update price cache until vault data arrives
                        // Vault data will be 0 initially, causing NaN price changes
                        info!(pool = %pool_name, "Waiting for vault data before updating price cache");
                        return Ok(());
                    }
                }
                
                // Use unified update method
                self.update_cache_from_pool(pool.as_ref(), &pool_config, pool_name, slot, start_time);
            }
            Err(e) => {
                // Record error with deduplication
                let error_key = format!("{}_{}", pool_type_str, "deserialize_failed");
                let error_msg = format!("{}: {}, Expected vs Actual size issue", pool_name, e);
                
                self.error_tracker.record_error(&error_key, error_msg).await;
                
                error!(
                    pool = %pool_name,
                    pool_type = %pool_type_str,
                    data_len = decoded.len(),
                    error = %e,
                    "Failed to deserialize pool"
                );
            }
        }
        
        Ok(())
    }
    
    /// 🌐 处理 vault 账户更新
    async fn handle_vault_update(
        &self,
        vault_address: &str,
        data: &[u8],
        _context_name: &str,
    ) -> Result<()> {
        // 检查是否是已注册的 vault
        let is_vault = {
            let vault_reader = self.vault_reader.lock().unwrap();
            vault_reader.is_vault_account(vault_address)
        };
        
        if !is_vault {
            // 不是 vault 账户，忽略
            return Ok(());
        }
        
        // 更新 vault 余额
        match self.vault_reader.lock().unwrap().update_vault(vault_address, data) {
            Ok(amount) => {
                debug!(vault = %vault_address, amount = %amount, "Vault balance updated");
                
                // 🚨 Critical fix: Trigger price recalculation for related pools
                // Find pools that use this vault
                let pool_addresses: Vec<String> = {
                    let vault_reader = self.vault_reader.lock().unwrap();
                    vault_reader.get_pools_for_vault(vault_address)
                };
                
                // Trigger price update for each affected pool
                for pool_addr in pool_addresses {
                    // Get pool config from subscription_map
                    let pool_config = {
                        let subscription_map = self.subscription_map.lock().unwrap();
                        subscription_map.values()
                            .find(|p| p.address == pool_addr)
                            .cloned()
                    };
                    
                    if let Some(config) = pool_config {
                        // Get cached pool data
                        let pool_data = {
                            let cache = self.pool_data_cache.lock().unwrap();
                            cache.get(&pool_addr).cloned()
                        };
                        
                        if let Some(data) = pool_data {
                            info!(pool = %config.name, "Recalculating price after vault update");
                            // Re-parse and update pool
                            // This will now have valid vault data
                            if let Ok(pool) = PoolFactory::create_pool(&config.pool_type, &data) {
                                let slot = 0; // Use 0 for vault-triggered updates
                                let start_time = Instant::now();
                                self.update_cache_from_pool(pool.as_ref(), &config, &config.name, slot, start_time);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                warn!(vault = %vault_address, error = %e, "Failed to update vault");
            }
        }
        
        Ok(())
    }
    
    /// Unified method to update cache from any DexPool implementation
    /// 
    /// This eliminates code duplication across different DEX types
    fn update_cache_from_pool(
        &self,
        pool: &dyn DexPool,
        pool_config: &PoolConfig,
        pool_name: &str,
        slot: u64,
        start_time: Instant,
    ) {
        let latency = start_time.elapsed();
        let latency_micros = latency.as_micros() as u64;
        
        // 🌐 获取储备量（优先从 VaultReader 读取）
        let (base_reserve, quote_reserve) = {
            let vault_reader = self.vault_reader.lock().unwrap();
            if let Some(reserves) = vault_reader.get_pool_reserves(&pool_config.address) {
                // 从 vault 读取实际储备量
                reserves
            } else {
                // 从池子账户直接读取
                pool.get_reserves()
            }
        };
        
        // Get pool information using unified interface
        let price = if base_reserve > 0 && quote_reserve > 0 {
            let (base_decimals, quote_decimals) = pool.get_decimals();
            let base_f64 = base_reserve as f64 / 10f64.powi(base_decimals as i32);
            let quote_f64 = quote_reserve as f64 / 10f64.powi(quote_decimals as i32);
            // 🚨 Critical fix: Prevent division by zero
            if base_f64 > 0.0 {
                quote_f64 / base_f64
            } else {
                0.0
            }
        } else {
            // 🚨 For vault-based pools (SolFi V2, etc.), reserves may be 0 initially
            // Don't call calculate_price as it might also return 0
            0.0
        };
        
        // 🚨 Critical fix: Skip updates with zero price (vault not ready yet)
        if price == 0.0 {
            debug!(pool = %pool_name, "Skipping pool with zero price (vault data not ready)");
            return;
        }
        let (base_decimals, quote_decimals) = pool.get_decimals();
        let dex_name = pool.dex_name();
        
        // Calculate human-readable reserves
        let base_reserve_readable = base_reserve as f64 / 10f64.powi(base_decimals as i32);
        let quote_reserve_readable = quote_reserve as f64 / 10f64.powi(quote_decimals as i32);
        
        // Record metrics
        self.metrics.record(pool_name.to_string(), latency_micros);
        
        // Update price cache
        let pool_price = PoolPrice {
            pool_id: pool_config.address.clone(),
            dex_name: dex_name.to_string(),
            pair: pool_name.to_string(),
            base_reserve,
            quote_reserve,
            base_decimals,
            quote_decimals,
            price,
            last_update: Instant::now(),
            slot,  // 🎯 记录slot用于数据一致性
        };
        
        self.price_cache.update_price(pool_price);
        
        // 🔥 Check price change and only log if significant
        let should_log = {
            let mut last_prices = self.last_prices.lock().unwrap();
            let price_changed = if let Some(last_price) = last_prices.get(pool_name) {
                let change_pct = ((price - last_price) / last_price * 100.0).abs();
                // 🚨 Critical fix: Check for NaN/Infinity before comparison
                if !change_pct.is_finite() {
                    warn!(pool = %pool_name, price, last_price, 
                          "Invalid price change (NaN/Infinity), skipping update");
                    return;  // Skip this update entirely
                }
                change_pct >= self.price_change_threshold
            } else {
                true  // First update, always log
            };
            
            if price_changed {
                last_prices.insert(pool_name.to_string(), price);
            }
            price_changed
        };
        
        if should_log {
            info!(
                pool = %pool_name,
                dex = %dex_name,
                price = %price,
                base_reserve = %base_reserve_readable,
                quote_reserve = %quote_reserve_readable,
                latency_us = latency_micros,
                slot = slot,
                "Pool price updated (significant change)"
            );
        } else {
            debug!(
                pool = %pool_name,
                price = %price,
                latency_us = latency_micros,
                "Pool price updated (minor change)"
            );
        }
    }
}

