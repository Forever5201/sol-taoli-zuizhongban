/**
 * 闪电贷类型定义
 */

import { PublicKey, TransactionInstruction } from '@solana/web3.js';

/**
 * 支持的闪电贷协议
 */
export enum FlashLoanProtocol {
  SOLEND = 'solend',
  MANGO = 'mango',
  MARGINFI = 'marginfi',
}

/**
 * 闪电贷配置
 */
export interface FlashLoanConfig {
  /** 协议类型 */
  protocol: FlashLoanProtocol;
  /** 借款金额（lamports） */
  amount: number;
  /** 借款代币的mint地址 */
  tokenMint: PublicKey;
  /** 费率（由协议决定，通常0.09%） */
  feeRate?: number;
}

/**
 * 闪电贷结果
 */
export interface FlashLoanResult {
  /** 借款指令 */
  borrowInstruction: TransactionInstruction;
  /** 还款指令 */
  repayInstruction: TransactionInstruction;
  /** 借款金额 */
  borrowAmount: number;
  /** 还款金额（包含费用） */
  repayAmount: number;
  /** 手续费 */
  fee: number;
  /** 需要的额外账户 */
  additionalAccounts: PublicKey[];
}

/**
 * Solend储备信息
 */
export interface SolendReserve {
  /** 储备账户地址 */
  address: PublicKey;
  /** 代币mint */
  liquidityMint: PublicKey;
  /** 流动性供应账户 */
  liquiditySupply: PublicKey;
  /** 流动性手续费接收账户 */
  liquidityFeeReceiver: PublicKey;
  /** 抵押品mint */
  collateralMint: PublicKey;
  /** 抵押品供应账户 */
  collateralSupply: PublicKey;
  /** 贷款市场 */
  lendingMarket: PublicKey;
  /** 贷款市场授权账户 */
  lendingMarketAuthority: PublicKey;
}

/**
 * 原子套利交易配置
 */
export interface AtomicArbitrageConfig {
  /** 是否使用闪电贷 */
  useFlashLoan: boolean;
  /** 闪电贷配置 */
  flashLoanConfig?: FlashLoanConfig;
  /** 套利交易指令（在借款和还款之间执行） */
  arbitrageInstructions: TransactionInstruction[];
  /** 钱包公钥 */
  wallet: PublicKey;
}
