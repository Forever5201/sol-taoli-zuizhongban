use anyhow::{Context, Result};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Instant;
use tokio::net::TcpStream;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::{
    tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
};

use crate::config::{PoolConfig, ProxyConfig};
use crate::dex_interface::DexPool;
use crate::metrics::MetricsCollector;
use crate::pool_factory::PoolFactory;
use crate::price_cache::{PoolPrice, PriceCache};
use crate::proxy;
use crate::vault_reader::VaultReader;

#[allow(dead_code)]
type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub struct WebSocketClient {
    url: String,
    metrics: Arc<MetricsCollector>,
    proxy_config: Option<ProxyConfig>,
    price_cache: Arc<PriceCache>,
    subscription_map: Arc<Mutex<HashMap<u64, PoolConfig>>>,
    vault_reader: Arc<Mutex<VaultReader>>, // 🌐 Vault 读取器
    pool_data_cache: Arc<Mutex<HashMap<String, Vec<u8>>>>, // 🌐 缓存池子数据用于提取 vault
}

impl WebSocketClient {
    pub fn new(
        url: String,
        metrics: Arc<MetricsCollector>,
        proxy_config: Option<ProxyConfig>,
        price_cache: Arc<PriceCache>,
    ) -> Self {
        Self {
            url,
            metrics,
            proxy_config,
            price_cache,
            subscription_map: Arc::new(Mutex::new(HashMap::new())),
            vault_reader: Arc::new(Mutex::new(VaultReader::new())), // 🌐 初始化 VaultReader
            pool_data_cache: Arc::new(Mutex::new(HashMap::new())), // 🌐 初始化池子数据缓存
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
            
            println!("📡 Subscribed to {} ({})", pool.name, pool.address);
        }
        
        println!("\n🎯 Waiting for pool updates...\n");
        
        // Process incoming messages
        while let Some(message) = read.next().await {
            match message {
                Ok(Message::Text(text)) => {
                    if let Err(e) = self.handle_message(&text, pools).await {
                        eprintln!("⚠️  Error handling message: {}", e);
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("⚠️  Server closed the connection");
                    break;
                }
                Err(e) => {
                    eprintln!("❌ WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
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
                println!("✅ Subscription confirmed: id={}, subscription_id={}, pool={}", 
                         id, subscription_id, pool_config.name);
            } else {
                println!("✅ Subscription confirmed: id={}, subscription_id={}", id, subscription_id);
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
        
        // Look up pool config by subscription ID
        let pool_config = {
            let map = self.subscription_map.lock().unwrap();
            map.get(&subscription_id).cloned()
        };
        
        let pool_config = match pool_config {
            Some(config) => config,
            None => {
                eprintln!("⚠️  Received update for unknown subscription ID: {}", subscription_id);
                return Ok(());
            }
        };
        
        // Decode base64
        use base64::Engine;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .context("Failed to decode base64")?;
        
        let pool_name = &pool_config.name;
        let pool_type_str = &pool_config.pool_type;
        let pool_address = &pool_config.address;
        
        // 🌐 检查是否是 vault 账户更新（165 字节 = SPL Token Account）
        if decoded.len() == 165 {
            return self.handle_vault_update(pool_address, &decoded, pool_name).await;
        }
        
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
                    if !pool_cache.contains_key(pool_address) {
                        // 缓存池子数据
                        pool_cache.insert(pool_address.clone(), decoded.clone());
                        drop(pool_cache);
                        
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
                        println!("   📡 Will subscribe to vault accounts for real-time reserve updates...");
                        
                        // TODO: 在这里自动订阅 vault 账户
                        // 需要传递 ws_stream 或者存储 subscription 队列
                    }
                }
                
                // Use unified update method
                self.update_cache_from_pool(pool.as_ref(), &pool_config, pool_name, slot, start_time);
            }
            Err(e) => {
                eprintln!("⚠️  Failed to deserialize pool: {}. Type: {}, Error: {}, Data length: {} bytes",
                          pool_name, pool_type_str, e, decoded.len());
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
                println!("💰 Vault updated: {} = {}", 
                         &vault_address[0..8], 
                         amount);
                
                // TODO: 触发相关池子的价格重新计算
            }
            Err(e) => {
                eprintln!("⚠️  Failed to update vault {}: {}", vault_address, e);
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
        let price = if base_reserve > 0 {
            let (base_decimals, quote_decimals) = pool.get_decimals();
            let base_f64 = base_reserve as f64 / 10f64.powi(base_decimals as i32);
            let quote_f64 = quote_reserve as f64 / 10f64.powi(quote_decimals as i32);
            quote_f64 / base_f64
        } else {
            pool.calculate_price()
        };
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
        };
        
        self.price_cache.update_price(pool_price);
        
        // Print update with unified format
        println!("┌─────────────────────────────────────────────────────");
        println!("│ [{}] {} Pool Updated", Utc::now().format("%Y-%m-%d %H:%M:%S"), pool_name);
        println!("│ ├─ Type:         {}", dex_name);
        println!("│ ├─ Price:        {:.4} (quote/base)", price);
        println!("│ ├─ Base Reserve:   {:>13.2}", base_reserve_readable);
        println!("│ ├─ Quote Reserve: {:>14.2}", quote_reserve_readable);
        
        // Print additional pool-specific info if available
        if let Some(info) = pool.get_additional_info() {
            println!("│ ├─ Info:         {}", info);
        }
        
        println!("│ ├─ Latency:      {:.3} ms ({} μs)", 
                 latency.as_secs_f64() * 1000.0, latency_micros);
        println!("│ ├─ Slot:         {}", slot);
        println!("│ └─ ✅ Price cache updated");
        println!("└─────────────────────────────────────────────────────");
    }
}

