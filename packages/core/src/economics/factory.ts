/**
 * 经济系统工厂函数
 * 创建完整配置的经济系统实例
 */

import { CostCalculator } from './cost-calculator';
import { JitoTipOptimizer } from './jito-tip-optimizer';
import { ProfitAnalyzer } from './profit-analyzer';
import { RiskManager } from './risk-manager';
import { CircuitBreaker, type ExtendedCircuitBreakerConfig } from './circuit-breaker';

/**
 * 创建经济系统实例
 */
export function createEconomicsSystem(config: {
  jitoApi?: string;
  slippageBuffer?: number;
  circuitBreaker: ExtendedCircuitBreakerConfig;
}) {
  const profitAnalyzer = new ProfitAnalyzer({ slippageBuffer: config.slippageBuffer });
  
  return {
    costCalculator: CostCalculator,
    jitoTipOptimizer: new JitoTipOptimizer({ jitoApiBaseUrl: config.jitoApi }),
    profitAnalyzer,
    riskManager: new RiskManager(profitAnalyzer),
    circuitBreaker: new CircuitBreaker(config.circuitBreaker),
  };
}
