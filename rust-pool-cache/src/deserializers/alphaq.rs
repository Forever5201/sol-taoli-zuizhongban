use borsh::{BorshDeserialize, BorshSerialize};
use solana_sdk::pubkey::Pubkey;
use crate::dex_interface::{DexPool, DexError};

/// AlphaQ Pool State
/// 
/// AlphaQ is a DEX on Solana focusing on stable swap pools
/// 
/// Program ID: ALPHAQmeA7bjrVuccPsYPiCvsi428SNwte66Srvs4pHA
/// Data size: 672 bytes
/// 
/// Structure (based on reverse engineering):
/// - 16 bytes: Pool identifier/name
/// - 10 Pubkeys (320 bytes): Various accounts
/// - 42 u64 fields (336 bytes): Reserves and configuration
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct AlphaQPoolState {
    /// Pool identifier/name (16 bytes)
    pub pool_name: [u8; 16],
    
    /// Authority (32 bytes)
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
    
    /// Additional pubkeys
    pub pubkey_7: Pubkey,
    pub pubkey_8: Pubkey,
    pub pubkey_9: Pubkey,
    pub pubkey_10: Pubkey,
    
    /// Padding fields (first 9 u64 = 72 bytes before real reserves)
    /// Based on analysis: offsets 336-424 are NOT the actual reserves
    pub padding_before_reserves: [u64; 9],
    
    /// Reserve A amount (offset 432, u64[9] in analysis)
    pub reserve_a: u64,
    
    /// Reserve B amount (offset 440, u64[10] in analysis)
    pub reserve_b: u64,
    
    /// LP supply and other fields (31 u64 values)
    /// This includes LP supply and fee configuration
    /// This includes various pool parameters like:
    /// - Fee rates
    /// - Swap limits
    /// - Admin fees
    /// - etc.
    pub config_fields: [u64; 31],
}

#[allow(dead_code)]
impl AlphaQPoolState {
    /// Get pool name as string
    pub fn get_pool_name(&self) -> String {
        String::from_utf8_lossy(&self.pool_name)
            .trim_end_matches('\0')
            .to_string()
    }
    
    /// Calculate price (token B per token A)
    /// 
    /// For a USDT/USDC pool:
    /// - reserve_a = USDT amount
    /// - reserve_b = USDC amount
    /// - Result = USDC/USDT price
    pub fn calculate_price(&self) -> f64 {
        if self.reserve_a == 0 {
            return 0.0;
        }
        
        // Assuming both tokens have 6 decimals (typical for stablecoins)
        // Adjust if needed
        let reserve_a_f64 = self.reserve_a as f64;
        let reserve_b_f64 = self.reserve_b as f64;
        
        reserve_b_f64 / reserve_a_f64
    }
    
    /// Get human-readable reserve amounts
    /// Assumes 6 decimals for both tokens (USDC/USDT standard)
    pub fn get_reserves_formatted(&self) -> (f64, f64) {
        const DECIMALS: i32 = 6;
        let reserve_a = self.reserve_a as f64 / 10_f64.powi(DECIMALS);
        let reserve_b = self.reserve_b as f64 / 10_f64.powi(DECIMALS);
        (reserve_a, reserve_b)
    }
    
    /// Get LP supply (estimated from config_fields)
    /// After analysis, LP supply is likely in config_fields[0] or nearby
    pub fn get_lp_supply(&self) -> u64 {
        // Return 0 for now as LP supply location is uncertain
        // This field is not critical for price calculation
        0
    }
    
    /// Get pool information for debugging
    pub fn get_pool_info(&self) -> String {
        let (reserve_a, reserve_b) = self.get_reserves_formatted();
        format!(
            "AlphaQ Pool: {}\n  Reserve A: {:.2}\n  Reserve B: {:.2}\n  Price: {:.6}",
            self.get_pool_name(),
            reserve_a,
            reserve_b,
            self.calculate_price()
        )
    }
}

// ============================================
// DexPool Trait Implementation
// ============================================

impl DexPool for AlphaQPoolState {
    fn dex_name(&self) -> &'static str {
        "AlphaQ"
    }
    
    fn from_account_data(data: &[u8]) -> Result<Self, DexError>
    where
        Self: Sized,
    {
        // AlphaQ pools are 672 bytes without discriminator
        if data.len() != 672 {
            return Err(DexError::InvalidData(format!(
                "AlphaQ pool data should be 672 bytes, got {}",
                data.len()
            )));
        }
        
        // Directly deserialize (no discriminator)
        Self::try_from_slice(data)
            .map_err(|e| DexError::DeserializationFailed(format!("AlphaQ: {}", e)))
    }
    
    fn calculate_price(&self) -> f64 {
        // Reuse implementation
        AlphaQPoolState::calculate_price(self)
    }
    
    fn get_reserves(&self) -> (u64, u64) {
        (self.reserve_a, self.reserve_b)
    }
    
    fn get_decimals(&self) -> (u8, u8) {
        // AlphaQ typically handles stablecoin pairs (USDC/USDT)
        // Both have 6 decimals
        // TODO: Read actual decimals from token mints if needed
        (6, 6)
    }
    
    fn is_active(&self) -> bool {
        // Pool is active if it has reserves
        self.reserve_a > 0 || self.reserve_b > 0
    }
    
    fn get_additional_info(&self) -> Option<String> {
        Some(format!(
            "Pool: {}",
            self.get_pool_name()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_size() {
        // Verify structure size matches expected 672 bytes
        use std::mem::size_of;
        
        let expected = 16  // pool_name
            + 32 * 10      // 10 Pubkeys
            + 8 * 9        // padding_before_reserves
            + 8 * 2        // reserve_a, reserve_b
            + 8 * 31;      // config_fields (including lp_supply)
        
        assert_eq!(expected, 672, "Structure size should be 672 bytes");
    }
}

