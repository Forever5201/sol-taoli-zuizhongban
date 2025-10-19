/**
 * 经济模型核心模块
 * 
 * 导出所有经济模型相关的类、类型和工具函数
 */

import { CostCalculator } from './cost-calculator';
import { JitoTipOptimizer } from './jito-tip-optimizer';
import { ProfitAnalyzer } from './profit-analyzer';
import { RiskManager } from './risk-manager';
import { CircuitBreaker, type ExtendedCircuitBreakerConfig } from './circuit-breaker';

// 类型定义
export * from './types';

// 核心模块
export { CostCalculator } from './cost-calculator';
export { JitoTipOptimizer, type JitoTipOptimizerConfig } from './jito-tip-optimizer';
export { ProfitAnalyzer, type ProfitAnalyzerConfig } from './profit-analyzer';
export { RiskManager } from './risk-manager';
export { CircuitBreaker, type ExtendedCircuitBreakerConfig } from './circuit-breaker';

// Factory function to create complete economics system
export function createEconomicsSystem(config: {
  jitoApi?: string;
  slippageBuffer?: number;
  circuitBreaker: ExtendedCircuitBreakerConfig;
}) {
  return {
    costCalculator: CostCalculator,
    jitoTipOptimizer: new JitoTipOptimizer({
      jitoApiBaseUrl: config.jitoApi,
    }),
    profitAnalyzer: new ProfitAnalyzer({
      slippageBuffer: config.slippageBuffer,
    }),
    riskManager: new RiskManager(
      new ProfitAnalyzer({
        slippageBuffer: config.slippageBuffer,
      })
    ),
    circuitBreaker: new CircuitBreaker(config.circuitBreaker),
  };
}

/**
 * 版本信息
 */
export const VERSION = '1.0.0';

/**
 * 模块元数据
 */
export const METADATA = {
  name: 'Solana Arbitrage Economics',
  version: VERSION,
  description: '专业级 Solana DEX 套利经济模型',
  author: 'Solana Arbitrage Bot Team',
};



