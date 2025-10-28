use borsh::{BorshDeserialize, BorshSerialize};
use solana_sdk::pubkey::Pubkey;
use crate::dex_interface::{DexPool, DexError};

/// Stabble Stable Swap Pool State
/// 
/// Stabble is a stable swap DEX on Solana specializing in stablecoin pairs
/// Similar to Curve Finance on Ethereum
/// 
/// Program ID: (需要查询)
/// Data size: 估计类似 AlphaQ (672 bytes) 或更大
/// 
/// Structure (基于稳定币池模式):
/// - Pubkey fields: Token mints, vaults, authority, fee accounts
/// - u64 fields: Reserves, amplification coefficient, fees
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct StabblePoolState {
    /// Pool identifier/name (16 bytes)
    pub pool_name: [u8; 16],
    
    /// Authority
    pub authority: Pubkey,
    
    /// Token A mint (通常是 USD1)
    pub token_a_mint: Pubkey,
    
    /// Token B mint (通常是 USDC)
    pub token_b_mint: Pubkey,
    
    /// Token A vault
    pub token_a_vault: Pubkey,
    
    /// Token B vault
    pub token_b_vault: Pubkey,
    
    /// LP token mint
    pub lp_mint: Pubkey,
    
    /// Fee account
    pub fee_account: Pubkey,
    
    /// Admin fee account
    pub admin_fee_account: Pubkey,
    
    /// Additional pubkeys (for multi-token pools)
    pub pubkey_10: Pubkey,
    pub pubkey_11: Pubkey,
    pub pubkey_12: Pubkey,
    
    /// Header fields before reserves
    pub header_fields: [u64; 8],
    
    /// Reserve A amount
    pub reserve_a: u64,
    
    /// Reserve B amount
    pub reserve_b: u64,
    
    /// Amplification coefficient (A parameter for stable swap curve)
    pub amplification_coefficient: u64,
    
    /// LP supply
    pub lp_supply: u64,
    
    /// Fee configuration and other parameters
    pub config_fields: [u64; 28],
}

#[allow(dead_code)]
impl StabblePoolState {
    /// Get pool name as string
    pub fn get_pool_name(&self) -> String {
        String::from_utf8_lossy(&self.pool_name)
            .trim_end_matches('\0')
            .to_string()
    }
    
    /// Calculate price (token B per token A)
    /// 
    /// For stable swap pools, price should be close to 1.0
    /// USD1/USDC ~= 1.0
    pub fn calculate_price(&self) -> f64 {
        if self.reserve_a == 0 {
            return 0.0;
        }
        
        // For stablecoin pairs, both have same decimals (usually 6)
        let reserve_a_f64 = self.reserve_a as f64;
        let reserve_b_f64 = self.reserve_b as f64;
        
        reserve_b_f64 / reserve_a_f64
    }
    
    /// Get human-readable reserve amounts
    /// Assumes 6 decimals for both stablecoins
    pub fn get_reserves_formatted(&self) -> (f64, f64) {
        const DECIMALS: i32 = 6;
        let reserve_a = self.reserve_a as f64 / 10_f64.powi(DECIMALS);
        let reserve_b = self.reserve_b as f64 / 10_f64.powi(DECIMALS);
        (reserve_a, reserve_b)
    }
    
    /// Get LP supply formatted
    pub fn get_lp_supply_formatted(&self) -> f64 {
        const DECIMALS: i32 = 6;
        self.lp_supply as f64 / 10_f64.powi(DECIMALS)
    }
    
    /// Get amplification coefficient (A parameter)
    /// Higher A = tighter curve around 1.0 (better for stablecoins)
    pub fn get_amplification(&self) -> u64 {
        self.amplification_coefficient
    }
    
    /// Get pool information for debugging
    pub fn get_pool_info(&self) -> String {
        let (reserve_a, reserve_b) = self.get_reserves_formatted();
        format!(
            "Stabble Pool: {}\n  Reserve A: ${:.2}\n  Reserve B: ${:.2}\n  Price: {:.6}\n  LP Supply: {:.2}\n  Amp Coeff: {}",
            self.get_pool_name(),
            reserve_a,
            reserve_b,
            self.calculate_price(),
            self.get_lp_supply_formatted(),
            self.get_amplification()
        )
    }
}

// ============================================
// DexPool Trait Implementation
// ============================================

impl DexPool for StabblePoolState {
    fn dex_name(&self) -> &'static str {
        "Stabble"
    }
    
    fn from_account_data(data: &[u8]) -> Result<Self, DexError>
    where
        Self: Sized,
    {
        // Expected size: 16 + 12*32 + 8 + 2*8 + 8 + 8 + 28*8
        // = 16 + 384 + 8 + 16 + 8 + 8 + 224 = 664 bytes
        // Allow some flexibility
        if data.len() < 650 || data.len() > 700 {
            return Err(DexError::InvalidData(format!(
                "Stabble pool data should be around 664 bytes, got {}",
                data.len()
            )));
        }
        
        Self::try_from_slice(data)
            .map_err(|e| DexError::DeserializationFailed(format!("Stabble: {}", e)))
    }
    
    fn calculate_price(&self) -> f64 {
        StabblePoolState::calculate_price(self)
    }
    
    fn get_reserves(&self) -> (u64, u64) {
        (self.reserve_a, self.reserve_b)
    }
    
    fn get_decimals(&self) -> (u8, u8) {
        // Stabble handles stablecoin pairs (USD1/USDC)
        // Both have 6 decimals
        (6, 6)
    }
    
    fn is_active(&self) -> bool {
        // Pool is active if it has reserves
        self.reserve_a > 0 || self.reserve_b > 0
    }
    
    fn get_additional_info(&self) -> Option<String> {
        Some(format!(
            "Pool: {}, Amp: {}, LP: {:.2}M",
            self.get_pool_name(),
            self.get_amplification(),
            self.get_lp_supply_formatted() / 1_000_000.0
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_size() {
        use std::mem::size_of;
        
        let expected = 16          // pool_name
            + 32 * 12              // 12 Pubkeys
            + 8 * 8                // header_fields
            + 8 * 2                // reserve_a, reserve_b
            + 8                    // amplification_coefficient
            + 8                    // lp_supply
            + 8 * 28;              // config_fields
        
        assert_eq!(expected, 664, "Structure size should be 664 bytes");
    }
    
    #[test]
    fn test_stable_price() {
        let mut pool = StabblePoolState {
            pool_name: [0; 16],
            authority: Pubkey::default(),
            token_a_mint: Pubkey::default(),
            token_b_mint: Pubkey::default(),
            token_a_vault: Pubkey::default(),
            token_b_vault: Pubkey::default(),
            lp_mint: Pubkey::default(),
            fee_account: Pubkey::default(),
            admin_fee_account: Pubkey::default(),
            pubkey_10: Pubkey::default(),
            pubkey_11: Pubkey::default(),
            pubkey_12: Pubkey::default(),
            header_fields: [0; 8],
            reserve_a: 1_000_000_000_000, // 1M USD1
            reserve_b: 1_000_000_000_000, // 1M USDC
            amplification_coefficient: 100,
            lp_supply: 2_000_000_000_000,
            config_fields: [0; 28],
        };
        
        let price = pool.calculate_price();
        // For 1:1 stablecoin pool, price should be ~1.0
        assert!((price - 1.0).abs() < 0.001, "Stable swap price should be close to 1.0");
    }
}



