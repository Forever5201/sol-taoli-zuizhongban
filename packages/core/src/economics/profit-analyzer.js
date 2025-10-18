"use strict";
/**
 * 利润分析器
 *
 * 负责计算和分析套利机会的盈利能力，包括：
 * - 毛利润和净利润计算
 * - ROI 分析
 * - 滑点估算
 * - 执行决策
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfitAnalyzer = void 0;
const cost_calculator_1 = require("./cost-calculator");
const types_1 = require("./types");
/**
 * 利润分析器
 */
class ProfitAnalyzer {
    static DEFAULT_SLIPPAGE_BUFFER = 1.2;
    slippageBuffer;
    conservativeEstimate;
    constructor(config = {}) {
        this.slippageBuffer = config.slippageBuffer || ProfitAnalyzer.DEFAULT_SLIPPAGE_BUFFER;
        this.conservativeEstimate = config.conservativeEstimate || false;
    }
    /**
     * 计算毛利润
     * @param opportunity 套利机会
     * @returns 毛利润（lamports）
     */
    calculateGrossProfit(opportunity) {
        return opportunity.grossProfit;
    }
    /**
     * 估算实际滑点影响
     * @param opportunity 套利机会
     * @returns 滑点影响（lamports，负数）
     */
    estimateSlippageImpact(opportunity) {
        const { estimatedSlippage, grossProfit } = opportunity;
        // 基础滑点
        let slippageImpact = grossProfit * estimatedSlippage;
        // 如果使用保守估计，增加缓冲
        if (this.conservativeEstimate) {
            slippageImpact *= this.slippageBuffer;
        }
        return -Math.ceil(slippageImpact);
    }
    /**
     * 计算净利润
     * @param opportunity 套利机会
     * @param costs 交易成本
     * @returns 净利润（lamports）
     */
    calculateNetProfit(opportunity, costs) {
        const grossProfit = this.calculateGrossProfit(opportunity);
        const slippageImpact = this.estimateSlippageImpact(opportunity);
        // 净利润 = 毛利润 - 滑点影响 - 总成本
        return grossProfit + slippageImpact - costs.total;
    }
    /**
     * 计算投资回报率（ROI）
     * @param netProfit 净利润（lamports）
     * @param totalCost 总成本（lamports）
     * @returns ROI（百分比，如 50 表示 50%）
     */
    calculateROI(netProfit, totalCost) {
        if (totalCost === 0)
            return 0;
        return (netProfit / totalCost) * 100;
    }
    /**
     * 完整的利润分析
     * @param opportunity 套利机会
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费（lamports）
     * @returns 详细的利润分析结果
     */
    analyzeProfitability(opportunity, costConfig, jitoTip) {
        // 1. 计算总成本
        const costs = cost_calculator_1.CostCalculator.calculateTotalCost(costConfig, jitoTip);
        // 2. 计算毛利润
        const grossProfit = this.calculateGrossProfit(opportunity);
        // 3. 计算净利润（考虑滑点）
        const netProfit = this.calculateNetProfit(opportunity, costs);
        // 4. 计算 ROI
        const roi = this.calculateROI(netProfit, costs.total);
        // 5. 计算成本占比
        const costRatio = costs.total / grossProfit;
        // 6. 判断是否盈利
        const isProfitable = netProfit > 0;
        return {
            grossProfit,
            totalCost: costs.total,
            netProfit,
            roi,
            costRatio,
            isProfitable,
            costs,
        };
    }
    /**
     * 快速判断是否应该执行
     * @param analysis 利润分析结果
     * @param minProfitThreshold 最小利润门槛（lamports）
     * @param minROI 最小 ROI（百分比）
     * @returns 是否应该执行
     */
    shouldExecute(analysis, minProfitThreshold, minROI) {
        return (analysis.isProfitable &&
            analysis.netProfit >= minProfitThreshold &&
            analysis.roi >= minROI);
    }
    /**
     * 批量评估多个机会
     * @param opportunities 套利机会列表
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费
     * @returns 按净利润排序的分析结果
     */
    evaluateMultipleOpportunities(opportunities, costConfig, jitoTip) {
        const results = opportunities.map((opportunity) => ({
            opportunity,
            analysis: this.analyzeProfitability(opportunity, costConfig, jitoTip),
        }));
        // 按净利润降序排序
        return results.sort((a, b) => b.analysis.netProfit - a.analysis.netProfit);
    }
    /**
     * 获取最佳机会
     * @param opportunities 套利机会列表
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费
     * @param minProfitThreshold 最小利润门槛
     * @param minROI 最小 ROI
     * @returns 最佳机会（如果存在）
     */
    getBestOpportunity(opportunities, costConfig, jitoTip, minProfitThreshold, minROI) {
        const evaluated = this.evaluateMultipleOpportunities(opportunities, costConfig, jitoTip);
        // 找到第一个满足条件的机会
        const best = evaluated.find((item) => this.shouldExecute(item.analysis, minProfitThreshold, minROI));
        return best || null;
    }
    /**
     * 计算盈亏平衡点
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费
     * @param estimatedSlippage 预估滑点
     * @returns 盈亏平衡所需的毛利润（lamports）
     */
    calculateBreakEvenProfit(costConfig, jitoTip, estimatedSlippage) {
        const costs = cost_calculator_1.CostCalculator.calculateTotalCost(costConfig, jitoTip);
        // 盈亏平衡：grossProfit × (1 - slippage) = costs.total
        // 因此：grossProfit = costs.total / (1 - slippage)
        const breakEvenGrossProfit = costs.total / (1 - estimatedSlippage);
        // 如果使用保守估计，增加缓冲
        if (this.conservativeEstimate) {
            return Math.ceil(breakEvenGrossProfit * this.slippageBuffer);
        }
        return Math.ceil(breakEvenGrossProfit);
    }
    /**
     * 生成利润分析报告
     * @param analysis 利润分析结果
     * @returns 格式化的报告字符串
     */
    generateReport(analysis) {
        const { grossProfit, totalCost, netProfit, roi, costRatio, costs } = analysis;
        const lines = [
            '========== 利润分析报告 ==========',
            `毛利润: ${costs.breakdown.total} (${grossProfit} lamports)`,
            `总成本: ${costs.breakdown.total} (${totalCost} lamports)`,
            `  - 基础费: ${costs.breakdown.baseFee}`,
            `  - 优先费: ${costs.breakdown.priorityFee}`,
            `  - Jito 小费: ${costs.breakdown.jitoTip}`,
            `  - RPC 成本: ${costs.breakdown.rpcCost}`,
        ];
        if (costs.flashLoanFee) {
            lines.push(`  - 闪电贷费用: ${costs.breakdown.flashLoanFee}`);
        }
        lines.push(`净利润: ${netProfit > 0 ? '+' : ''}${netProfit} lamports`, `ROI: ${roi.toFixed(2)}%`, `成本占比: ${(0, types_1.formatPercentage)(costRatio)}`, `结论: ${analysis.isProfitable ? '✅ 盈利' : '❌ 亏损'}`, '=================================');
        return lines.join('\n');
    }
    /**
     * 模拟不同小费下的利润情况
     * @param opportunity 套利机会
     * @param costConfig 成本配置
     * @param tipRange 小费范围 [min, max]（lamports）
     * @param steps 模拟步数
     * @returns 利润曲线数据
     */
    simulateProfitCurve(opportunity, costConfig, tipRange, steps = 10) {
        const [minTip, maxTip] = tipRange;
        const stepSize = (maxTip - minTip) / (steps - 1);
        const curve = [];
        for (let i = 0; i < steps; i++) {
            const tip = minTip + stepSize * i;
            const analysis = this.analyzeProfitability(opportunity, costConfig, tip);
            curve.push({
                tip: Math.ceil(tip),
                netProfit: analysis.netProfit,
                roi: analysis.roi,
            });
        }
        return curve;
    }
    /**
     * 估算最大可承受的小费
     * @param opportunity 套利机会
     * @param costConfig 成本配置
     * @param minAcceptableProfit 最小可接受利润（lamports）
     * @returns 最大小费（lamports）
     */
    calculateMaxAffordableTip(opportunity, costConfig, minAcceptableProfit) {
        const grossProfit = this.calculateGrossProfit(opportunity);
        const slippageImpact = this.estimateSlippageImpact(opportunity);
        // 计算不含 Jito 小费的成本
        const costsWithoutTip = cost_calculator_1.CostCalculator.calculateTotalCost(costConfig, 0);
        const baseCost = costsWithoutTip.total - costsWithoutTip.jitoTip;
        // 最大小费 = 毛利润 - 滑点影响 - 基础成本 - 最小可接受利润
        const maxTip = grossProfit + slippageImpact - baseCost - minAcceptableProfit;
        return Math.max(maxTip, 0);
    }
}
exports.ProfitAnalyzer = ProfitAnalyzer;
//# sourceMappingURL=profit-analyzer.js.map