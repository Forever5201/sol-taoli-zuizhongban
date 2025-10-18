"use strict";
/**
 * 经济模型核心模块
 *
 * 导出所有经济模型相关的类、类型和工具函数
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.METADATA = exports.VERSION = exports.CircuitBreaker = exports.RiskManager = exports.ProfitAnalyzer = exports.JitoTipOptimizer = exports.CostCalculator = void 0;
exports.createEconomicsSystem = createEconomicsSystem;
// 类型定义
__exportStar(require("./types"), exports);
// 核心模块
var cost_calculator_1 = require("./cost-calculator");
Object.defineProperty(exports, "CostCalculator", { enumerable: true, get: function () { return cost_calculator_1.CostCalculator; } });
var jito_tip_optimizer_1 = require("./jito-tip-optimizer");
Object.defineProperty(exports, "JitoTipOptimizer", { enumerable: true, get: function () { return jito_tip_optimizer_1.JitoTipOptimizer; } });
var profit_analyzer_1 = require("./profit-analyzer");
Object.defineProperty(exports, "ProfitAnalyzer", { enumerable: true, get: function () { return profit_analyzer_1.ProfitAnalyzer; } });
var risk_manager_1 = require("./risk-manager");
Object.defineProperty(exports, "RiskManager", { enumerable: true, get: function () { return risk_manager_1.RiskManager; } });
var circuit_breaker_1 = require("./circuit-breaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return circuit_breaker_1.CircuitBreaker; } });
/**
 * 便捷的工厂函数：创建完整的经济模型系统
 */
function createEconomicsSystem(config) {
    const costCalculator = CostCalculator;
    const jitoTipOptimizer = new JitoTipOptimizer({
        jitoApiBaseUrl: config.jitoApi,
    });
    const profitAnalyzer = new ProfitAnalyzer({
        slippageBuffer: config.slippageBuffer,
    });
    const riskManager = new RiskManager(profitAnalyzer);
    const circuitBreaker = new CircuitBreaker(config.circuitBreaker);
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
exports.VERSION = '1.0.0';
/**
 * 模块元数据
 */
exports.METADATA = {
    name: 'Solana Arbitrage Economics',
    version: exports.VERSION,
    description: '专业级 Solana DEX 套利经济模型',
    author: 'Solana Arbitrage Bot Team',
};
//# sourceMappingURL=index.js.map