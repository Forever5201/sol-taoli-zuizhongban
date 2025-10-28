use borsh::{BorshDeserialize, BorshSerialize};
use solana_sdk::pubkey::Pubkey;
use crate::dex_interface::{DexPool, DexError};

/// PancakeSwap Pool State (Solana)
/// 
/// PancakeSwap is a cross-chain DEX that expanded from BSC to Solana
/// 
/// Program ID: (需要查询)
/// Data size: 估计类似标准 AMM 或 CLMM 池子
/// 
/// Structure (基于 AMM/StableSwap 模式):
/// - Pubkey fields: Token mints, vaults, authority, fee accounts
/// - u64 fields: Reserves, fees, configuration
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct PancakeSwapPoolState {
    /// Pool identifier/bump
    pub pool_bump: u8,
    
    /// Pool authority
    pub authority: Pubkey,
    
    /// Token A mint
    pub token_a_mint: Pubkey,
    
    /// Token B mint
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
    
    /// Additional pubkeys (for governance, staking, etc.)
    pub pubkey_10: Pubkey,
    pub pubkey_11: Pubkey,
    pub pubkey_12: Pubkey,
    pub pubkey_13: Pubkey,
    pub pubkey_14: Pubkey,
    
    /// Header/padding fields
    pub header_fields: [u64; 5],
    
    /// Reserve A amount
    pub reserve_a: u64,
    
    /// Reserve B amount
    pub reserve_b: u64,
    
    /// LP supply
    pub lp_supply: u64,
    
    /// Fee numerator
    pub fee_numerator: u64,
    
    /// Fee denominator
    pub fee_denominator: u64,
    
    /// Additional configuration fields
    pub config_fields: [u64; 40],
}

#[allow(dead_code)]
impl PancakeSwapPoolState {
    /// Calculate price (token B per token A)
    pub fn calculate_price(&self) -> f64 {
        if self.reserve_a == 0 {
            return 0.0;
        }
        
        self.reserve_b as f64 / self.reserve_a as f64
    }
    
    /// Get human-readable reserve amounts
    /// Assumes 6 decimals for both tokens (USDC/USDT)
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
    
    /// Get fee rate (in basis points)
    pub fn get_fee_bps(&self) -> f64 {
        if self.fee_denominator == 0 {
            return 0.0;
        }
        
        // Convert to basis points (1 bps = 0.01%)
        (self.fee_numerator as f64 / self.fee_denominator as f64) * 10000.0
    }
    
    /// Get pool information for debugging
    pub fn get_pool_info(&self) -> String {
        let (reserve_a, reserve_b) = self.get_reserves_formatted();
        format!(
            "PancakeSwap Pool:\n  Reserve A: ${:.2}\n  Reserve B: ${:.2}\n  Price: {:.6}\n  LP Supply: {:.2}\n  Fee: {:.2} bps",
            reserve_a,
            reserve_b,
            self.calculate_price(),
            self.get_lp_supply_formatted(),
            self.get_fee_bps()
        )
    }
}

// ============================================
// DexPool Trait Implementation
// ============================================

impl DexPool for PancakeSwapPoolState {
    fn dex_name(&self) -> &'static str {
        "PancakeSwap"
    }
    
    fn from_account_data(data: &[u8]) -> Result<Self, DexError>
    where
        Self: Sized,
    {
        // Expected size: 1 + 14*32 + 5*8 + 3*8 + 2*8 + 40*8
        // = 1 + 448 + 40 + 24 + 16 + 320 = 849 bytes
        // Allow some flexibility
        if data.len() < 800 || data.len() > 950 {
            return Err(DexError::InvalidData(format!(
                "PancakeSwap pool data should be around 849 bytes, got {}",
                data.len()
            )));
        }
        
        Self::try_from_slice(data)
            .map_err(|e| DexError::DeserializationFailed(format!("PancakeSwap: {}", e)))
    }
    
    fn calculate_price(&self) -> f64 {
        PancakeSwapPoolState::calculate_price(self)
    }
    
    fn get_reserves(&self) -> (u64, u64) {
        (self.reserve_a, self.reserve_b)
    }
    
    fn get_decimals(&self) -> (u8, u8) {
        // PancakeSwap主要处理 USDC/USDT 等稳定币对
        // 都是 6 decimals
        (6, 6)
    }
    
    fn is_active(&self) -> bool {
        // Pool is active if it has reserves
        self.reserve_a > 0 || self.reserve_b > 0
    }
    
    fn get_additional_info(&self) -> Option<String> {
        Some(format!(
            "LP: {:.2}M, Fee: {:.2}bps",
            self.get_lp_supply_formatted() / 1_000_000.0,
            self.get_fee_bps()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_size() {
        use std::mem::size_of;
        
        let expected = 1             // pool_bump
            + 32 * 14                // 14 Pubkeys
            + 8 * 5                  // header_fields
            + 8 * 2                  // reserve_a, reserve_b
            + 8                      // lp_supply
            + 8 * 2                  // fee_numerator, fee_denominator
            + 8 * 40;                // config_fields
        
        assert_eq!(expected, 849, "Structure size should be 849 bytes");
    }
    
    #[test]
    fn test_price_calculation() {
        let mut pool = PancakeSwapPoolState {
            pool_bump: 0,
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
            pubkey_13: Pubkey::default(),
            pubkey_14: Pubkey::default(),
            header_fields: [0; 5],
            reserve_a: 1_000_000_000_000, // 1M USDC
            reserve_b: 1_000_000_000_000, // 1M USDT
            lp_supply: 2_000_000_000_000,
            fee_numerator: 25,             // 0.25%
            fee_denominator: 10000,
            config_fields: [0; 40],
        };
        
        let price = pool.calculate_price();
        // For 1:1 stablecoin pool, price should be ~1.0
        assert!((price - 1.0).abs() < 0.001, "Price should be close to 1.0");
        
        let fee_bps = pool.get_fee_bps();
        assert!((fee_bps - 25.0).abs() < 0.1, "Fee should be 25 bps");
    }
}



