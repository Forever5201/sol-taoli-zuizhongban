/**
 * 经济模型核心模块
 * 
 * 导出所有经济模型相关的类、类型和工具函数
 */

import { CostCalculator as CostCalcClass } from './cost-calculator';
import { JitoTipOptimizer as JitoTipOptimizerClass } from './jito-tip-optimizer';
import { ProfitAnalyzer as ProfitAnalyzerClass } from './profit-analyzer';
import { RiskManager as RiskManagerClass } from './risk-manager';
import { CircuitBreaker as CircuitBreakerClass, type ExtendedCircuitBreakerConfig as ExtCircuitBreakerCfg } from './circuit-breaker';

// 类型定义
export * from './types';

// 核心模块
export { CostCalculator } from './cost-calculator';
export { JitoTipOptimizer, type JitoTipOptimizerConfig } from './jito-tip-optimizer';
export { ProfitAnalyzer, type ProfitAnalyzerConfig } from './profit-analyzer';
export { RiskManager } from './risk-manager';
export { CircuitBreaker, type ExtendedCircuitBreakerConfig } from './circuit-breaker';

/**
 * 便捷的工厂函数：创建完整的经济模型系统
 */

export function createEconomicsSystem(config: {
  jitoApi?: string;
  slippageBuffer?: number;
  circuitBreaker: ExtCircuitBreakerCfg;
}) {
  const costCalculator = CostCalcClass; // Static class reference
  const jitoTipOptimizer = new JitoTipOptimizerClass({
    jitoApiBaseUrl: config.jitoApi,
  });
  
  const profitAnalyzer = new ProfitAnalyzerClass({
    slippageBuffer: config.slippageBuffer,
  });
  
  const riskManager = new RiskManagerClass(profitAnalyzer);
  
  const circuitBreaker = new CircuitBreakerClass(config.circuitBreaker);

  return {
    costCalculator,
    jitoTipOptimizer,
    profitAnalyzer,
    riskManager,
    circuitBreaker,
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



