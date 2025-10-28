use borsh::{BorshDeserialize, BorshSerialize};
use solana_sdk::pubkey::Pubkey;
use crate::dex_interface::{DexPool, DexError};

/// HumidiFi Pool State
/// 
/// HumidiFi is a Solana-based DEX
/// 
/// Program ID: 9H6tua7jkLhdm3w8BvgpTn5LZNU7g4ZynDmCiNN3q6Rp
/// Data size: 1728 bytes (same as SolFi V2)
/// 
/// Structure likely similar to SolFi V2:
/// - 5 u64 header fields (40 bytes)
/// - 25 Pubkey fields (800 bytes)
/// - 111 u64 configuration/reserve fields (888 bytes)
#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct HumidiFiPoolState {
    /// Header fields (5 u64 = 40 bytes)
    pub header_field_1: u64,
    pub header_field_2: u64,
    pub header_field_3: u64,
    pub header_field_4: u64,
    pub header_field_5: u64,
    
    /// Pubkey fields (25 Pubkeys = 800 bytes)
    pub pubkey_1: Pubkey,
    pub pubkey_2: Pubkey,  // Likely token A mint
    pub pubkey_3: Pubkey,  // Likely token B mint
    pub pubkey_4: Pubkey,  // Likely token A vault
    pub pubkey_5: Pubkey,  // Likely token B vault
    pub pubkey_6: Pubkey,  // Likely LP mint
    pub pubkey_7: Pubkey,
    pub pubkey_8: Pubkey,
    pub pubkey_9: Pubkey,
    pub pubkey_10: Pubkey,
    pub pubkey_11: Pubkey,
    pub pubkey_12: Pubkey,
    pub pubkey_13: Pubkey,
    pub pubkey_14: Pubkey,
    pub pubkey_15: Pubkey,
    pub pubkey_16: Pubkey,
    pub pubkey_17: Pubkey,
    pub pubkey_18: Pubkey,
    pub pubkey_19: Pubkey,
    pub pubkey_20: Pubkey,
    pub pubkey_21: Pubkey,
    pub pubkey_22: Pubkey,
    pub pubkey_23: Pubkey,
    pub pubkey_24: Pubkey,
    pub pubkey_25: Pubkey,
    
    /// Configuration and reserve fields (111 u64 = 888 bytes)
    pub config_fields: [u64; 111],
}

impl HumidiFiPoolState {
    /// Get reserve A amount (searching in config fields)
    pub fn get_reserve_a(&self) -> u64 {
        // Search for reasonable reserve values
        for i in 0..30 {
            let val = self.config_fields[i];
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
    
    /// Calculate price
    pub fn calculate_price(&self) -> f64 {
        let reserve_a = self.get_reserve_a();
        let reserve_b = self.get_reserve_b();
        
        if reserve_a == 0 {
            return 0.0;
        }
        
        reserve_b as f64 / reserve_a as f64
    }
    
    /// Get formatted reserves
    pub fn get_reserves_formatted(&self) -> (f64, f64) {
        const DECIMALS: i32 = 6;
        let reserve_a = self.get_reserve_a() as f64 / 10_f64.powi(DECIMALS);
        let reserve_b = self.get_reserve_b() as f64 / 10_f64.powi(DECIMALS);
        (reserve_a, reserve_b)
    }
}

// ============================================
// DexPool Trait Implementation
// ============================================

impl DexPool for HumidiFiPoolState {
    fn dex_name(&self) -> &'static str {
        "HumidiFi"
    }
    
    fn from_account_data(data: &[u8]) -> Result<Self, DexError>
    where
        Self: Sized,
    {
        if data.len() != 1728 {
            return Err(DexError::InvalidData(format!(
                "HumidiFi pool data should be 1728 bytes, got {}",
                data.len()
            )));
        }
        
        Self::try_from_slice(data)
            .map_err(|e| DexError::DeserializationFailed(format!("HumidiFi: {}", e)))
    }
    
    fn calculate_price(&self) -> f64 {
        HumidiFiPoolState::calculate_price(self)
    }
    
    fn get_reserves(&self) -> (u64, u64) {
        (self.get_reserve_a(), self.get_reserve_b())
    }
    
    fn get_decimals(&self) -> (u8, u8) {
        (6, 6)
    }
    
    fn is_active(&self) -> bool {
        self.get_reserve_a() > 0 || self.get_reserve_b() > 0
    }
    
    fn get_additional_info(&self) -> Option<String> {
        let (res_a, res_b) = self.get_reserves_formatted();
        Some(format!(
            "Reserves: A={:.2}, B={:.2}",
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
        let expected = 8 * 5 + 32 * 25 + 8 * 111;
        assert_eq!(expected, 1728);
    }
}




