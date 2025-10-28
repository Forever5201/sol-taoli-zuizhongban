/**
 * SPL Token Account Parser
 * 
 * Utility for parsing SPL Token account data to extract reserve amounts.
 * SPL Token accounts are 165 bytes and contain mint, owner, amount, and decimals.
 */

import { PublicKey } from '@solana/web3.js';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('SPLTokenParser');

/**
 * Parsed SPL Token Account data
 */
export interface SPLTokenAccount {
  /** Token mint address */
  mint: PublicKey;
  /** Account owner */
  owner: PublicKey;
  /** Token amount (raw, without decimal adjustment) */
  amount: bigint;
  /** Decimal places (usually fetched separately from mint) */
  decimals?: number;
}

/**
 * Parse SPL Token account data
 * 
 * SPL Token account layout (165 bytes):
 * - Offset 0-31: mint (32 bytes, PublicKey)
 * - Offset 32-63: owner (32 bytes, PublicKey)
 * - Offset 64-71: amount (8 bytes, u64 little-endian)
 * - Offset 72: delegate_option (1 byte)
 * - Offset 73-104: delegate (32 bytes, PublicKey)
 * - Offset 105-112: state (8 bytes)
 * - Offset 113: is_native_option (1 byte)
 * - Offset 114-121: is_native (8 bytes, u64)
 * - Offset 122-129: delegated_amount (8 bytes, u64)
 * - Offset 130: close_authority_option (1 byte)
 * - Offset 131-162: close_authority (32 bytes, PublicKey)
 * 
 * @param data Buffer containing the account data
 * @returns Parsed token account or null if invalid
 */
export function parseTokenAccount(data: Buffer): SPLTokenAccount | null {
  try {
    // Verify account size
    if (data.length !== 165) {
      logger.warn(`Invalid SPL Token account size: ${data.length} bytes (expected 165)`);
      return null;
    }

    // Read mint (offset 0)
    const mint = new PublicKey(data.slice(0, 32));

    // Read owner (offset 32)
    const owner = new PublicKey(data.slice(32, 64));

    // Read amount (offset 64, u64 little-endian)
    const amount = data.readBigUInt64LE(64);

    return {
      mint,
      owner,
      amount,
    };
  } catch (error) {
    logger.error(`Failed to parse SPL Token account: ${error}`);
    return null;
  }
}

/**
 * Validate that token account belongs to expected mint
 * 
 * @param tokenAccount Parsed token account
 * @param expectedMint Expected mint address
 * @returns True if mint matches
 */
export function validateTokenMint(
  tokenAccount: SPLTokenAccount | null,
  expectedMint: string
): boolean {
  if (!tokenAccount) {
    return false;
  }

  return tokenAccount.mint.toBase58() === expectedMint;
}

/**
 * Format token amount with decimals
 * 
 * @param amount Raw token amount (bigint)
 * @param decimals Number of decimal places
 * @returns Formatted amount as number
 */
export function formatTokenAmount(amount: bigint, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}


