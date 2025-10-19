// Re-export all types
export * from './types';

// Re-export all classes
export { CostCalculator } from './cost-calculator';
export { JitoTipOptimizer, type JitoTipOptimizerConfig } from './jito-tip-optimizer';
export { ProfitAnalyzer, type ProfitAnalyzerConfig } from './profit-analyzer';
export { RiskManager } from './risk-manager';
export { CircuitBreaker, type ExtendedCircuitBreakerConfig } from './circuit-breaker';

// Factory function
export function createEconomicsSystem(config: {
  jitoApi?: string;
  slippageBuffer?: number;
  circuitBreaker: import('./circuit-breaker').ExtendedCircuitBreakerConfig;
}) {
  const CC = require('./cost-calculator').CostCalculator;
  const JTO = require('./jito-tip-optimizer').JitoTipOptimizer;
  const PA = require('./profit-analyzer').ProfitAnalyzer;
  const RM = require('./risk-manager').RiskManager;
  const CB = require('./circuit-breaker').CircuitBreaker;
  
  const profitAnalyzer = new PA({ slippageBuffer: config.slippageBuffer });
  
  return {
    costCalculator: CC,
    jitoTipOptimizer: new JTO({ jitoApiBaseUrl: config.jitoApi }),
    profitAnalyzer,
    riskManager: new RM(profitAnalyzer),
    circuitBreaker: new CB(config.circuitBreaker),
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



