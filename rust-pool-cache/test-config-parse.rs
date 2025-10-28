// 测试配置文件解析
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub websocket: WebSocketConfig,
    pub proxy: Option<ProxyConfig>,
    pub pools: Vec<PoolConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolConfig {
    pub address: String,
    pub name: String,
    #[serde(default = "default_pool_type")]
    pub pool_type: String,
}

fn default_pool_type() -> String {
    "amm_v4".to_string()
}

fn main() {
    println!("Reading config.toml...");
    let content = fs::read_to_string("config.toml").expect("Failed to read config");
    
    println!("Parsing TOML...");
    match toml::from_str::<Config>(&content) {
        Ok(config) => {
            println!("✅ Successfully parsed {} pools:", config.pools.len());
            for (i, pool) in config.pools.iter().enumerate() {
                println!("  {}. {} - {} ({} chars)", 
                    i + 1, 
                    pool.name, 
                    pool.address,
                    pool.address.len()
                );
            }
        }
        Err(e) => {
            println!("❌ Failed to parse TOML: {}", e);
            println!("Error details: {:?}", e);
        }
    }
}




