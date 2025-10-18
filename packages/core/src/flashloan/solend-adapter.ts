/**
 * Solend协议适配器
 * 
 * 实现Solend闪电贷功能
 * 参考：https://docs.solend.fi/protocol/flash-loans
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SolendReserve, FlashLoanResult } from './types';
import { struct, u8, nu64 } from '@solana/buffer-layout';

/**
 * Solend程序ID（Mainnet）
 */
export const SOLEND_PROGRAM_ID = new PublicKey(
  'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'
);

/**
 * Solend主市场
 */
export const SOLEND_MAIN_MARKET = new PublicKey(
  '4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY'
);

/**
 * Solend储备配置（主流代币）
 */
export const SOLEND_RESERVES: Record<string, SolendReserve> = {
  // USDC储备
  USDC: {
    address: new PublicKey('BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw'),
    liquidityMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    liquiditySupply: new PublicKey('8SheGtsopRUDzdiD6v6BR9a6bqZ9QwywYQY99Fp5meNf'),
    liquidityFeeReceiver: new PublicKey('5Gdxt1r4hxxZwqTx6FECiZdnLV3wqLNiZcPE5Wdnh3qP'),
    collateralMint: new PublicKey('993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk'),
    collateralSupply: new PublicKey('8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv'),
    lendingMarket: SOLEND_MAIN_MARKET,
    lendingMarketAuthority: new PublicKey('DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby'),
  },
  
  // SOL储备（WSOL）
  SOL: {
    address: new PublicKey('8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36'),
    liquidityMint: new PublicKey('So11111111111111111111111111111111111111112'),
    liquiditySupply: new PublicKey('8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv'),
    liquidityFeeReceiver: new PublicKey('5Gdxt1r4hxxZwqTx6FECiZdnLV3wqLNiZcPE5Wdnh3qP'),
    collateralMint: new PublicKey('993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk'),
    collateralSupply: new PublicKey('8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv'),
    lendingMarket: SOLEND_MAIN_MARKET,
    lendingMarketAuthority: new PublicKey('DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby'),
  },
  
  // USDT储备
  USDT: {
    address: new PublicKey('8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE'),
    liquidityMint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    liquiditySupply: new PublicKey('8SheGtsopRUDzdiD6v6BR9a6bqZ9QwywYQY99Fp5meNf'),
    liquidityFeeReceiver: new PublicKey('5Gdxt1r4hxxZwqTx6FECiZdnLV3wqLNiZcPE5Wdnh3qP'),
    collateralMint: new PublicKey('BTsbZDV7aCMRJ3VNy9ygV7ApdvzxtgHeaWqxLXGfz9UA'),
    collateralSupply: new PublicKey('8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv'),
    lendingMarket: SOLEND_MAIN_MARKET,
    lendingMarketAuthority: new PublicKey('DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby'),
  },
};

/**
 * Solend指令类型
 */
enum SolendInstruction {
  FlashBorrowReserveLiquidity = 13,
  FlashRepayReserveLiquidity = 14,
}

/**
 * Solend适配器
 */
export class SolendAdapter {
  /**
   * Solend闪电贷费率（0.09%）
   */
  static readonly FEE_RATE = 0.0009;

  /**
   * 计算闪电贷手续费
   */
  static calculateFee(amount: number): number {
    return Math.ceil(amount * this.FEE_RATE);
  }

  /**
   * 获取储备信息
   */
  static getReserve(tokenSymbol: string): SolendReserve {
    const reserve = SOLEND_RESERVES[tokenSymbol.toUpperCase()];
    if (!reserve) {
      throw new Error(`Unsupported token: ${tokenSymbol}`);
    }
    return reserve;
  }

  /**
   * 构建闪电借款指令
   * 
   * @param amount 借款金额（lamports）
   * @param tokenSymbol 代币符号（USDC, SOL, USDT等）
   * @param userTokenAccount 用户代币账户
   * @param wallet 钱包公钥
   */
  static createFlashBorrowInstruction(
    amount: number,
    tokenSymbol: string,
    userTokenAccount: PublicKey,
    wallet: PublicKey
  ): TransactionInstruction {
    const reserve = this.getReserve(tokenSymbol);

    // 指令数据布局
    const dataLayout = struct([
      u8('instruction'),
      nu64('liquidityAmount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: SolendInstruction.FlashBorrowReserveLiquidity,
        liquidityAmount: BigInt(amount),
      },
      data
    );

    const keys = [
      { pubkey: reserve.address, isSigner: false, isWritable: true },
      { pubkey: reserve.liquiditySupply, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: reserve.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: reserve.lendingMarketAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: SOLEND_PROGRAM_ID,
      data,
    });
  }

  /**
   * 构建闪电还款指令
   * 
   * @param amount 原始借款金额（lamports，不含手续费）
   * @param tokenSymbol 代币符号
   * @param userTokenAccount 用户代币账户
   * @param wallet 钱包公钥
   */
  static createFlashRepayInstruction(
    amount: number,
    tokenSymbol: string,
    userTokenAccount: PublicKey,
    wallet: PublicKey
  ): TransactionInstruction {
    const reserve = this.getReserve(tokenSymbol);
    const fee = this.calculateFee(amount);
    const repayAmount = amount + fee;

    // 指令数据布局
    const dataLayout = struct([
      u8('instruction'),
      nu64('liquidityAmount'),
      nu64('borrowInstructionIndex'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: SolendInstruction.FlashRepayReserveLiquidity,
        liquidityAmount: BigInt(repayAmount),
        borrowInstructionIndex: BigInt(0), // 借款指令通常是第一条
      },
      data
    );

    const keys = [
      { pubkey: reserve.address, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: reserve.liquiditySupply, isSigner: false, isWritable: true },
      { pubkey: reserve.liquidityFeeReceiver, isSigner: false, isWritable: true },
      { pubkey: reserve.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: wallet, isSigner: true, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: SOLEND_PROGRAM_ID,
      data,
    });
  }

  /**
   * 构建完整的闪电贷交易
   * 
   * @param amount 借款金额
   * @param tokenSymbol 代币符号
   * @param userTokenAccount 用户代币账户
   * @param wallet 钱包公钥
   */
  static buildFlashLoan(
    amount: number,
    tokenSymbol: string,
    userTokenAccount: PublicKey,
    wallet: PublicKey
  ): FlashLoanResult {
    const borrowInstruction = this.createFlashBorrowInstruction(
      amount,
      tokenSymbol,
      userTokenAccount,
      wallet
    );

    const repayInstruction = this.createFlashRepayInstruction(
      amount,
      tokenSymbol,
      userTokenAccount,
      wallet
    );

    const fee = this.calculateFee(amount);
    const reserve = this.getReserve(tokenSymbol);

    return {
      borrowInstruction,
      repayInstruction,
      borrowAmount: amount,
      repayAmount: amount + fee,
      fee,
      additionalAccounts: [
        reserve.address,
        reserve.liquiditySupply,
        reserve.lendingMarket,
        reserve.lendingMarketAuthority,
      ],
    };
  }

  /**
   * 验证闪电贷可行性
   * 
   * @param amount 借款金额
   * @param expectedProfit 预期利润
   */
  static validateFlashLoan(amount: number, expectedProfit: number): {
    valid: boolean;
    fee: number;
    netProfit: number;
    reason?: string;
  } {
    const fee = this.calculateFee(amount);
    const netProfit = expectedProfit - fee;

    if (netProfit <= 0) {
      return {
        valid: false,
        fee,
        netProfit,
        reason: `闪电贷费用(${fee})超过预期利润(${expectedProfit})`,
      };
    }

    if (fee > expectedProfit * 0.5) {
      return {
        valid: false,
        fee,
        netProfit,
        reason: `闪电贷费用占利润比例过高(${((fee / expectedProfit) * 100).toFixed(1)}%)`,
      };
    }

    return {
      valid: true,
      fee,
      netProfit,
    };
  }
}
