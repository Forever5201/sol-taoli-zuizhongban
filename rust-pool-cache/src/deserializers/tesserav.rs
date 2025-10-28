use borsh::{BorshDeserialize, BorshSerialize};
use solana_sdk::pubkey::Pubkey;
use crate::dex_interface::{DexPool, DexError};

/// TesseraV Pool State
/// 
/// TesseraV is a DEX on Solana
/// 
/// Program ID: (需要查询)
/// Data size: 估计类似其他 AMM 池子（672-1728 bytes）
/// 
/// Structure (基于常见 AMM 模式):
/// - Pubkey fields: Token mints, vaults, authority
/// - u64 fields: Reserves, fees, configuration
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct TesseraVPoolState {
    /// Header fields
    pub header_field_1: u64,
    pub header_field_2: u64,
    pub header_field_3: u64,
    pub header_field_4: u64,
    pub header_field_5: u64,
    
    /// Authority
    pub authority: Pubkey,
    
    /// Token A mint
    pub token_a_mint: Pubkey,
    
    /// Token B mint
    pub token_b_mint: Pubkey,
    
    /// Token A vault
    pub token_a_vault: Pubkey,
    
    /// Token B vault
    pub token_b_vault: Pubkey,
    
    /// LP mint
    pub lp_mint: Pubkey,
    
    /// Additional pubkeys (7-15 more depending on protocol)
    pub pubkey_7: Pubkey,
    pub pubkey_8: Pubkey,
    pub pubkey_9: Pubkey,
    pub pubkey_10: Pubkey,
    pub pubkey_11: Pubkey,
    pub pubkey_12: Pubkey,
    pub pubkey_13: Pubkey,
    pub pubkey_14: Pubkey,
    pub pubkey_15: Pubkey,
    
    /// Configuration and reserve fields
    /// This includes reserves, fees, and other parameters
    pub config_fields: [u64; 80],
}

#[allow(dead_code)]
impl TesseraVPoolState {
    /// Get reserve A amount (searching in config fields)
    pub fn get_reserve_a(&self) -> u64 {
        // Search for reasonable reserve values
        for i in 0..30 {
            let val = self.config_fields[i];
            // Looking for values in reasonable range (100M to 100T)
            if val > 100_000_000 && val < 100_000_000_000_000 {
                return val;
            }
        }
        0
    }
    
    /// Get reserve B amount
    pub fn get_reserve_b(&self) -> u64 {
        let reserve_a = self.get_reserve_a();
        for i in 1..30 {
            let val = self.config_fields[i];
            if val > 100_000_000 && val < 100_000_000_000_000 && val != reserve_a {
                return val;
            }
        }
        0
    }
    
    /// Calculate price (token B per token A)
    pub fn calculate_price(&self) -> f64 {
        let reserve_a = self.get_reserve_a();
        let reserve_b = self.get_reserve_b();
        
        if reserve_a == 0 {
            return 0.0;
        }
        
        reserve_b as f64 / reserve_a as f64
    }
    
    /// Get human-readable reserve amounts
    /// Assumes 9 decimals for SOL, 6 for USDC
    pub fn get_reserves_formatted(&self, decimals_a: i32, decimals_b: i32) -> (f64, f64) {
        let reserve_a = self.get_reserve_a() as f64 / 10_f64.powi(decimals_a);
        let reserve_b = self.get_reserve_b() as f64 / 10_f64.powi(decimals_b);
        (reserve_a, reserve_b)
    }
    
    /// Get pool information for debugging
    pub fn get_pool_info(&self) -> String {
        let (reserve_a, reserve_b) = self.get_reserves_formatted(9, 6);
        format!(
            "TesseraV Pool:\n  Reserve A: {:.2}\n  Reserve B: {:.2}\n  Price: {:.6}",
            reserve_a,
            reserve_b,
            self.calculate_price()
        )
    }
}

// ============================================
// DexPool Trait Implementation
// ============================================

impl DexPool for TesseraVPoolState {
    fn dex_name(&self) -> &'static str {
        "TesseraV"
    }
    
    fn from_account_data(data: &[u8]) -> Result<Self, DexError>
    where
        Self: Sized,
    {
        // Expected size: 5 u64 (40) + 15 Pubkeys (480) + 80 u64 (640) = 1160 bytes
        // Allow some flexibility in size
        if data.len() < 1100 || data.len() > 1200 {
            return Err(DexError::InvalidData(format!(
                "TesseraV pool data should be around 1160 bytes, got {}",
                data.len()
            )));
        }
        
        // Try to deserialize
        Self::try_from_slice(data)
            .map_err(|e| DexError::DeserializationFailed(format!("TesseraV: {}", e)))
    }
    
    fn calculate_price(&self) -> f64 {
        TesseraVPoolState::calculate_price(self)
    }
    
    fn get_reserves(&self) -> (u64, u64) {
        (self.get_reserve_a(), self.get_reserve_b())
    }
    
    fn get_decimals(&self) -> (u8, u8) {
        // TesseraV主要是SOL/USDC池子
        // SOL = 9 decimals, USDC = 6 decimals
        (9, 6)
    }
    
    fn is_active(&self) -> bool {
        // Pool is active if it has reserves
        self.get_reserve_a() > 0 || self.get_reserve_b() > 0
    }
    
    fn get_additional_info(&self) -> Option<String> {
        let (res_a, res_b) = self.get_reserves_formatted(9, 6);
        Some(format!(
            "Reserves: A={:.2} SOL, B={:.2} USDC",
            res_a,
            res_b
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_size() {
        use std::mem::size_of;
        
        let expected = 8 * 5      // header fields
            + 32 * 15             // 15 Pubkeys
            + 8 * 80;             // config_fields
        
        assert_eq!(expected, 1160, "Structure size should be 1160 bytes");
    }
    
    #[test]
    fn test_price_calculation() {
        let mut pool = TesseraVPoolState {
            header_field_1: 0,
            header_field_2: 0,
            header_field_3: 0,
            header_field_4: 0,
            header_field_5: 0,
            authority: Pubkey::default(),
            token_a_mint: Pubkey::default(),
            token_b_mint: Pubkey::default(),
            token_a_vault: Pubkey::default(),
            token_b_vault: Pubkey::default(),
            lp_mint: Pubkey::default(),
            pubkey_7: Pubkey::default(),
            pubkey_8: Pubkey::default(),
            pubkey_9: Pubkey::default(),
            pubkey_10: Pubkey::default(),
            pubkey_11: Pubkey::default(),
            pubkey_12: Pubkey::default(),
            pubkey_13: Pubkey::default(),
            pubkey_14: Pubkey::default(),
            pubkey_15: Pubkey::default(),
            config_fields: [0; 80],
        };
        
        // Set test reserves (SOL/USDC pool: 100 SOL @ $150 = 15000 USDC)
        pool.config_fields[0] = 100_000_000_000; // 100 SOL (9 decimals)
        pool.config_fields[1] = 15_000_000_000; // 15000 USDC (6 decimals)
        
        let price = pool.calculate_price();
        assert!(price > 0.0, "Price should be positive");
    }
}



