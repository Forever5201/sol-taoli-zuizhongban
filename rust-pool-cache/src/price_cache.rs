use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Instant;

/// Pool price information
#[derive(Clone, Debug)]
pub struct PoolPrice {
    pub pool_id: String,
    pub dex_name: String,
    pub pair: String,
    pub base_reserve: u64,
    pub quote_reserve: u64,
    #[allow(dead_code)]
    pub base_decimals: u8,
    #[allow(dead_code)]
    pub quote_decimals: u8,
    pub price: f64,
    pub last_update: Instant,
}

#[allow(dead_code)]
impl PoolPrice {
    /// Calculate price from reserves
    #[allow(dead_code)]
    pub fn calculate_price(
        base_reserve: u64,
        quote_reserve: u64,
        base_decimals: u8,
        quote_decimals: u8,
    ) -> f64 {
        let base = base_reserve as f64 / 10f64.powi(base_decimals as i32);
        let quote = quote_reserve as f64 / 10f64.powi(quote_decimals as i32);
        
        if base == 0.0 {
            return 0.0;
        }
        
        quote / base
    }
}

/// Thread-safe price cache
pub struct PriceCache {
    prices: Arc<RwLock<HashMap<String, PoolPrice>>>,
}

impl PriceCache {
    pub fn new() -> Self {
        Self {
            prices: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Update price for a pool
    pub fn update_price(&self, pool_price: PoolPrice) {
        let mut prices = self.prices.write().unwrap();
        prices.insert(pool_price.pool_id.clone(), pool_price);
    }
    
    /// Get price for a specific pool    
    #[allow(dead_code)]
    pub fn get_price(&self, pool_id: &str) -> Option<PoolPrice> {
        let prices = self.prices.read().unwrap();
        prices.get(pool_id).cloned()
    }
    
    /// Get all pools for a specific pair
    pub fn get_pools_by_pair(&self, pair: &str) -> Vec<PoolPrice> {
        let prices = self.prices.read().unwrap();
        prices
            .values()
            .filter(|p| p.pair == pair)
            .cloned()
            .collect()
    }
    
    /// Get all cached prices
    pub fn get_all_prices(&self) -> Vec<PoolPrice> {
        let prices = self.prices.read().unwrap();
        prices.values().cloned().collect()
    }
    
    /// Get statistics
    pub fn get_stats(&self) -> (usize, Vec<String>) {
        let prices = self.prices.read().unwrap();
        let pairs: Vec<String> = prices
            .values()
            .map(|p| p.pair.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        
        (prices.len(), pairs)
    }
}

impl Clone for PriceCache {
    fn clone(&self) -> Self {
        Self {
            prices: Arc::clone(&self.prices),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_calculate_price() {
        // 100,000 SOL, 18,500,000 USDC
        let price = PoolPrice::calculate_price(
            100_000 * 1_000_000_000,
            18_500_000 * 1_000_000,
            9,
            6,
        );
        
        assert!((price - 185.0).abs() < 0.01);
    }
    
    #[test]
    fn test_price_cache() {
        let cache = PriceCache::new();
        
        let price = PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium".to_string(),
            pair: "SOL/USDC".to_string(),
            base_reserve: 100_000 * 1_000_000_000,
            quote_reserve: 18_500_000 * 1_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            price: 185.0,
            last_update: Instant::now(),
        };
        
        cache.update_price(price.clone());
        
        let retrieved = cache.get_price("raydium_sol_usdc");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().price, 185.0);
    }
}



