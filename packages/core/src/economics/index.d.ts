/**
 * 经济模型核心模块
 *
 * 导出所有经济模型相关的类、类型和工具函数
 */
export * from './types';
export { CostCalculator } from './cost-calculator';
export { JitoTipOptimizer, type JitoTipOptimizerConfig } from './jito-tip-optimizer';
export { ProfitAnalyzer, type ProfitAnalyzerConfig } from './profit-analyzer';
export { RiskManager } from './risk-manager';
export { CircuitBreaker, type ExtendedCircuitBreakerConfig } from './circuit-breaker';
/**
 * 便捷的工厂函数：创建完整的经济模型系统
 */
export declare function createEconomicsSystem(config: {
    jitoApi?: string;
    slippageBuffer?: number;
    circuitBreaker: ExtendedCircuitBreakerConfig;
}): {
    costCalculator: any;
    jitoTipOptimizer: any;
    profitAnalyzer: any;
    riskManager: any;
    circuitBreaker: any;
};
/**
 * 版本信息
 */
export declare const VERSION = "1.0.0";
/**
 * 模块元数据
 */
export declare const METADATA: {
    name: string;
    version: string;
    description: string;
    author: string;
};
//# sourceMappingURL=index.d.ts.map