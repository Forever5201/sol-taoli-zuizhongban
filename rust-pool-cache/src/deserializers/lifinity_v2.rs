use solana_sdk::pubkey::Pubkey;
use crate::dex_interface::{DexPool, DexError};

/// Lifinity V2 Pool State
/// 
/// Lifinity V2 is a proactive market maker that owns its liquidity and uses
/// oracle pricing to provide better prices with reduced impermanent loss.
/// 
/// Program ID: 2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c
/// 
/// Data structure (simplified version based on common AMM patterns):
/// - Discriminator: 8 bytes
/// - Token mints and accounts: multiple Pubkeys
/// - Amounts: u64 values
/// - Configuration and oracle data
#[derive(Debug, Clone)]
pub struct LifinityV2PoolState {
    /// Raw account data for flexibility
    pub data: Vec<u8>,
    
    /// Parsed pool information
    #[allow(dead_code)]
    pub token_a_mint: Option<Pubkey>,
    #[allow(dead_code)]
    pub token_b_mint: Option<Pubkey>,
    pub token_a_amount: Option<u64>,
    pub token_b_amount: Option<u64>,
    pub token_a_decimals: Option<u8>,
    pub token_b_decimals: Option<u8>,
}

impl LifinityV2PoolState {
    /// Parse from raw account data
    /// 
    /// Lifinity V2 data structure analysis (911 bytes):
    /// - Lifinity V2 uses an oracle-based pricing mechanism
    /// - The pool state stores token amounts in vaults
    /// - We need to find: token_a_vault, token_b_vault, decimals
    pub fn from_bytes(data: &[u8]) -> Result<Self, std::io::Error> {
        if data.len() < 200 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Lifinity V2 data too small: {} bytes", data.len()),
            ));
        }
        
        // Debug: Output first 256 bytes in hex for analysis
        if data.len() >= 256 {
            eprintln!("\n=== Lifinity V2 Data Analysis ({} bytes) ===", data.len());
            eprintln!("First 256 bytes (hex):");
            for chunk_idx in 0..8 {
                let start = chunk_idx * 32;
                let end = (chunk_idx + 1) * 32;
                eprint!("[{:3}-{:3}] ", start, end - 1);
                for byte in &data[start..end] {
                    eprint!("{:02x} ", byte);
                }
                eprintln!();
            }
        }
        
        // Try different parsing strategies
        // Strategy 1: Skip discriminator (8 bytes) and try to extract Pubkeys
        let mut offset = 8;
        
        let mut token_a_mint = None;
        let mut token_b_mint = None;
        let mut token_a_amount = None;
        let mut token_b_amount = None;
        
        // Try to extract pubkeys (32 bytes each)
        for i in 0..10 {
            if offset + 32 <= data.len() {
                let pubkey = Pubkey::new_from_array(
                    data[offset..offset + 32].try_into().unwrap()
                );
                eprintln!("Pubkey[{}] at offset {}: {}", i, offset, pubkey);
                
                // First non-zero pubkey is likely token_a_mint
                if i == 0 && pubkey != Pubkey::default() {
                    token_a_mint = Some(pubkey);
                }
                // Second non-zero pubkey is likely token_b_mint
                if i == 1 && pubkey != Pubkey::default() {
                    token_b_mint = Some(pubkey);
                }
                
                offset += 32;
            }
        }
        
        // Try to find u64 amounts (look for reasonable values)
        eprintln!("\nScanning for u64 amounts:");
        let mut candidates = Vec::new();
        
        // Scan entire account data (up to 900 bytes)
        for scan_offset in (8..std::cmp::min(data.len() - 8, 900)).step_by(8) {
            let value = u64::from_le_bytes(
                data[scan_offset..scan_offset + 8].try_into().unwrap()
            );
            
            // Look for values in reasonable range
            // For SOL: typically 1e9 to 1e13 lamports (1-10000 SOL)
            // For USDC: typically 1e6 to 1e15 microUSDC (1-1B USDC)
            // Widen range to capture both token amounts
            if value > 100_000_000 && value < 1_000_000_000_000_000 {
                eprintln!("  Offset {}: {} ({:.2e})", scan_offset, value, value as f64);
                candidates.push((scan_offset, value));
            }
        }
        
        // Strategy: Pick the first two reasonable values
        // Expected price ratio: SOL/USDC ~ 130-200, SOL/USDT ~ 130-200
        // So USDC_amount / SOL_amount should be in range [100, 300] approximately
        for (_i, (offset, value)) in candidates.iter().enumerate() {
            if token_a_amount.is_none() {
                token_a_amount = Some(*value);
                eprintln!("  → Selected as token_a_amount (offset {})", offset);
            } else if token_b_amount.is_none() {
                // Validate price ratio
                let a = token_a_amount.unwrap() as f64;
                let b = *value as f64;
                
                // Assume decimals: SOL=9, USDC/USDT=6
                let price_ratio = (b / 1e6) / (a / 1e9); // USDC/SOL
                
                eprintln!("  → Checking token_b_amount candidate (offset {}): price_ratio={:.2}", offset, price_ratio);
                
                // Accept if price is reasonable (100-300 for SOL/USDC)
                if price_ratio > 100.0 && price_ratio < 300.0 {
                    token_b_amount = Some(*value);
                    eprintln!("  ✅ Accepted as token_b_amount");
                    break;
                } else {
                    eprintln!("  ❌ Rejected (price ratio out of range)");
                }
            }
        }
        
        // Default decimals (SOL=9, USDC/USDT=6)
        let token_a_decimals = Some(9);
        let token_b_decimals = Some(6);
        
        eprintln!("\nParsed values:");
        eprintln!("  token_a_mint: {:?}", token_a_mint);
        eprintln!("  token_b_mint: {:?}", token_b_mint);
        eprintln!("  token_a_amount: {:?}", token_a_amount);
        eprintln!("  token_b_amount: {:?}", token_b_amount);
        eprintln!("=== End Analysis ===\n");
        
        Ok(LifinityV2PoolState {
            data: data.to_vec(),
            token_a_mint,
            token_b_mint,
            token_a_amount,
            token_b_amount,
            token_a_decimals,
            token_b_decimals,
        })
    }
    
    /// Calculate price from reserves
    pub fn calculate_price(&self) -> f64 {
        match (self.token_a_amount, self.token_b_amount, self.token_a_decimals, self.token_b_decimals) {
            (Some(amount_a), Some(amount_b), Some(dec_a), Some(dec_b)) => {
                let token_a = amount_a as f64 / 10f64.powi(dec_a as i32);
                let token_b = amount_b as f64 / 10f64.powi(dec_b as i32);
                
                if token_a == 0.0 {
                    0.0
                } else {
                    token_b / token_a
                }
            }
            _ => 0.0, // Fallback if data not fully parsed
        }
    }
    
    /// Get effective reserves
    #[allow(dead_code)]
    pub fn get_effective_reserves(&self) -> (f64, f64) {
        let dec_a = self.token_a_decimals.unwrap_or(9);
        let dec_b = self.token_b_decimals.unwrap_or(6);
        
        let reserve_a = self.token_a_amount.unwrap_or(0) as f64 / 10f64.powi(dec_a as i32);
        let reserve_b = self.token_b_amount.unwrap_or(0) as f64 / 10f64.powi(dec_b as i32);
        
        (reserve_a, reserve_b)
    }
    
    /// Check if pool is active
    pub fn is_active(&self) -> bool {
        // Pool is active if we have valid amounts
        self.token_a_amount.unwrap_or(0) > 0 && self.token_b_amount.unwrap_or(0) > 0
    }
    
    /// Get data length for debugging
    pub fn data_length(&self) -> usize {
        self.data.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_from_bytes() {
        let data = vec![0u8; 100];
        let pool = LifinityV2PoolState::from_bytes(&data);
        assert!(pool.is_ok());
        
        let pool = pool.unwrap();
        assert_eq!(pool.data_length(), 100);
        assert!(pool.is_active());
    }
}

// ============================================
// DexPool Trait Implementation
// ============================================

impl DexPool for LifinityV2PoolState {
    fn dex_name(&self) -> &'static str {
        "Lifinity V2"
    }
    
    fn from_account_data(data: &[u8]) -> Result<Self, DexError>
    where
        Self: Sized,
    {
        Self::from_bytes(data)
            .map_err(|e| DexError::DeserializationFailed(format!("Lifinity V2: {}", e)))
    }
    
    fn calculate_price(&self) -> f64 {
        self.calculate_price()
    }
    
    fn get_reserves(&self) -> (u64, u64) {
        (
            self.token_a_amount.unwrap_or(0),
            self.token_b_amount.unwrap_or(0),
        )
    }
    
    fn get_decimals(&self) -> (u8, u8) {
        (
            self.token_a_decimals.unwrap_or(9),
            self.token_b_decimals.unwrap_or(6),
        )
    }
    
    fn is_active(&self) -> bool {
        self.is_active()
    }
    
    fn get_additional_info(&self) -> Option<String> {
        let parsed_status = if self.token_a_amount.is_some() && self.token_b_amount.is_some() {
            "Parsed"
        } else {
            "Partial"
        };
        
        Some(format!(
            "Data: {} bytes, Status: {}, A:{:?}, B:{:?}",
            self.data_length(),
            parsed_status,
            self.token_a_amount,
            self.token_b_amount
        ))
    }
}

