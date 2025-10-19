/**
 * 测试 Mock 数据集
 * 提供各种测试场景的模拟数据
 */

import { PublicKey } from '@solana/web3.js';
import type {
  ArbitrageOpportunity,
  CostConfig,
  RiskCheckConfig,
  CircuitBreakerConfig,
  JitoTipData
} from '../../packages/core/src/economics/types';

// Mock Public Keys
export const MOCK_PUBLIC_KEYS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  RAYDIUM: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
  ORCA: new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
};

// Mock Arbitrage Opportunity - 小利润机会
export const MOCK_SMALL_OPPORTUNITY: ArbitrageOpportunity = {
  tokenPair: 'SOL/USDC',
  inputMint: MOCK_PUBLIC_KEYS.SOL.toBase58(),
  outputMint: MOCK_PUBLIC_KEYS.USDC.toBase58(),
  inputAmount: 1_000_000_000, // 1 SOL
  expectedOutput: 100_500_000, // 100.5 USDC (假设SOL价格100)
  grossProfit: 500_000, // 0.5 USDC = 0.005 SOL
  route: ['Raydium', 'Orca'],
  poolLiquidity: 5000, // 5000 USD流动性
  estimatedSlippage: 0.001, // 0.1%
  discoveredAt: Date.now(),
};

// Mock Arbitrage Opportunity - 中等利润机会
export const MOCK_MEDIUM_OPPORTUNITY: ArbitrageOpportunity = {
  tokenPair: 'SOL/USDC',
  inputMint: MOCK_PUBLIC_KEYS.SOL.toBase58(),
  outputMint: MOCK_PUBLIC_KEYS.USDC.toBase58(),
  inputAmount: 10_000_000_000, // 10 SOL
  expectedOutput: 1_005_000_000, // 1005 USDC
  grossProfit: 5_000_000, // 5 USDC = 0.05 SOL
  route: ['Raydium', 'Orca', 'Serum'],
  poolLiquidity: 50000,
  estimatedSlippage: 0.003,
  discoveredAt: Date.now(),
};

// Mock Arbitrage Opportunity - 大利润机会
export const MOCK_LARGE_OPPORTUNITY: ArbitrageOpportunity = {
  tokenPair: 'SOL/USDC',
  inputMint: MOCK_PUBLIC_KEYS.SOL.toBase58(),
  outputMint: MOCK_PUBLIC_KEYS.USDC.toBase58(),
  inputAmount: 100_000_000_000, // 100 SOL
  expectedOutput: 10_100_000_000, // 10,100 USDC
  grossProfit: 100_000_000, // 100 USDC = 1 SOL
  route: ['Raydium', 'Orca'],
  poolLiquidity: 500000,
  estimatedSlippage: 0.005,
  discoveredAt: Date.now(),
};

// Mock Arbitrage Opportunity - 不盈利机会
export const MOCK_UNPROFITABLE_OPPORTUNITY: ArbitrageOpportunity = {
  tokenPair: 'SOL/USDC',
  inputMint: MOCK_PUBLIC_KEYS.SOL.toBase58(),
  outputMint: MOCK_PUBLIC_KEYS.USDC.toBase58(),
  inputAmount: 1_000_000_000,
  expectedOutput: 100_010_000, // 仅0.01 USDC利润
  grossProfit: 10_000, // 0.01 USDC
  route: ['Raydium'],
  poolLiquidity: 10000,
  estimatedSlippage: 0.001,
  discoveredAt: Date.now(),
};

// Mock Cost Config - 标准配置
export const MOCK_COST_CONFIG: CostConfig = {
  signatureCount: 2,
  computeUnits: 300000,
  computeUnitPrice: 50, // 50 microlamports
  useFlashLoan: false,
  flashLoanAmount: 0,
  rpcCostPerTransaction: 100,
};

// Mock Cost Config - 闪电贷配置
export const MOCK_FLASHLOAN_COST_CONFIG: CostConfig = {
  signatureCount: 4,
  computeUnits: 500000,
  computeUnitPrice: 100,
  useFlashLoan: true,
  flashLoanAmount: 50_000_000_000, // 50 SOL
  rpcCostPerTransaction: 100,
};

// Mock Risk Config - 保守策略
export const MOCK_CONSERVATIVE_RISK_CONFIG: RiskCheckConfig = {
  minProfitThreshold: 100_000, // 0.0001 SOL
  maxGasPrice: 50_000, // 0.00005 SOL
  maxJitoTip: 50_000,
  maxSlippage: 0.005, // 0.5%
  minLiquidity: 10000, // 10K USD
  minROI: 5, // 5%
};

// Mock Risk Config - 激进策略
export const MOCK_AGGRESSIVE_RISK_CONFIG: RiskCheckConfig = {
  minProfitThreshold: 30_000,
  maxGasPrice: 200_000,
  maxJitoTip: 500_000,
  maxSlippage: 0.02, // 2%
  minLiquidity: 1000,
  minROI: 1, // 1%
};

// Mock Circuit Breaker Config
export const MOCK_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  maxConsecutiveFailures: 3,
  maxHourlyLoss: 1_000_000_000, // 1 SOL
  minSuccessRate: 0.3, // 30%
};

// Mock Jito Tip Data
export const MOCK_JITO_TIP_DATA: JitoTipData = {
  time: new Date().toISOString(),
  landed_tips_25th_percentile: 0.000005, // SOL
  landed_tips_50th_percentile: 0.00001,
  landed_tips_75th_percentile: 0.000025,
  landed_tips_95th_percentile: 0.0001,
  landed_tips_99th_percentile: 0.0005,
  ema_landed_tips_50th_percentile: 0.000015,
};

// Mock Jito Tip Data - 高竞争
export const MOCK_HIGH_COMPETITION_JITO_TIP_DATA: JitoTipData = {
  time: new Date().toISOString(),
  landed_tips_25th_percentile: 0.00005,
  landed_tips_50th_percentile: 0.0001,
  landed_tips_75th_percentile: 0.00025,
  landed_tips_95th_percentile: 0.001,
  landed_tips_99th_percentile: 0.005,
  ema_landed_tips_50th_percentile: 0.00015,
};

// Helper: 创建自定义机会
export function createMockOpportunity(overrides: Partial<ArbitrageOpportunity>): ArbitrageOpportunity {
  return {
    ...MOCK_SMALL_OPPORTUNITY,
    ...overrides,
    discoveredAt: Date.now(),
  };
}

// Helper: 创建自定义成本配置
export function createMockCostConfig(overrides: Partial<CostConfig>): CostConfig {
  return {
    ...MOCK_COST_CONFIG,
    ...overrides,
  };
}

// Helper: 创建自定义风险配置
export function createMockRiskConfig(overrides: Partial<RiskCheckConfig>): RiskCheckConfig {
  return {
    ...MOCK_CONSERVATIVE_RISK_CONFIG,
    ...overrides,
  };
}
