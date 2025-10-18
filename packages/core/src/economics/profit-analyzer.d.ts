/**
 * 利润分析器
 *
 * 负责计算和分析套利机会的盈利能力，包括：
 * - 毛利润和净利润计算
 * - ROI 分析
 * - 滑点估算
 * - 执行决策
 */
import { ArbitrageOpportunity, ProfitAnalysis, CostConfig, TransactionCosts } from './types';
/**
 * 利润分析器配置
 */
export interface ProfitAnalyzerConfig {
    /** 滑点缓冲系数（默认 1.2，即预留 20% 的滑点缓冲） */
    slippageBuffer?: number;
    /** 是否使用保守估计 */
    conservativeEstimate?: boolean;
}
/**
 * 利润分析器
 */
export declare class ProfitAnalyzer {
    private static readonly DEFAULT_SLIPPAGE_BUFFER;
    private readonly slippageBuffer;
    private readonly conservativeEstimate;
    constructor(config?: ProfitAnalyzerConfig);
    /**
     * 计算毛利润
     * @param opportunity 套利机会
     * @returns 毛利润（lamports）
     */
    calculateGrossProfit(opportunity: ArbitrageOpportunity): number;
    /**
     * 估算实际滑点影响
     * @param opportunity 套利机会
     * @returns 滑点影响（lamports，负数）
     */
    estimateSlippageImpact(opportunity: ArbitrageOpportunity): number;
    /**
     * 计算净利润
     * @param opportunity 套利机会
     * @param costs 交易成本
     * @returns 净利润（lamports）
     */
    calculateNetProfit(opportunity: ArbitrageOpportunity, costs: TransactionCosts): number;
    /**
     * 计算投资回报率（ROI）
     * @param netProfit 净利润（lamports）
     * @param totalCost 总成本（lamports）
     * @returns ROI（百分比，如 50 表示 50%）
     */
    calculateROI(netProfit: number, totalCost: number): number;
    /**
     * 完整的利润分析
     * @param opportunity 套利机会
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费（lamports）
     * @returns 详细的利润分析结果
     */
    analyzeProfitability(opportunity: ArbitrageOpportunity, costConfig: CostConfig, jitoTip: number): ProfitAnalysis;
    /**
     * 快速判断是否应该执行
     * @param analysis 利润分析结果
     * @param minProfitThreshold 最小利润门槛（lamports）
     * @param minROI 最小 ROI（百分比）
     * @returns 是否应该执行
     */
    shouldExecute(analysis: ProfitAnalysis, minProfitThreshold: number, minROI: number): boolean;
    /**
     * 批量评估多个机会
     * @param opportunities 套利机会列表
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费
     * @returns 按净利润排序的分析结果
     */
    evaluateMultipleOpportunities(opportunities: ArbitrageOpportunity[], costConfig: CostConfig, jitoTip: number): Array<{
        opportunity: ArbitrageOpportunity;
        analysis: ProfitAnalysis;
    }>;
    /**
     * 获取最佳机会
     * @param opportunities 套利机会列表
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费
     * @param minProfitThreshold 最小利润门槛
     * @param minROI 最小 ROI
     * @returns 最佳机会（如果存在）
     */
    getBestOpportunity(opportunities: ArbitrageOpportunity[], costConfig: CostConfig, jitoTip: number, minProfitThreshold: number, minROI: number): {
        opportunity: ArbitrageOpportunity;
        analysis: ProfitAnalysis;
    } | null;
    /**
     * 计算盈亏平衡点
     * @param costConfig 成本配置
     * @param jitoTip Jito 小费
     * @param estimatedSlippage 预估滑点
     * @returns 盈亏平衡所需的毛利润（lamports）
     */
    calculateBreakEvenProfit(costConfig: CostConfig, jitoTip: number, estimatedSlippage: number): number;
    /**
     * 生成利润分析报告
     * @param analysis 利润分析结果
     * @returns 格式化的报告字符串
     */
    generateReport(analysis: ProfitAnalysis): string;
    /**
     * 模拟不同小费下的利润情况
     * @param opportunity 套利机会
     * @param costConfig 成本配置
     * @param tipRange 小费范围 [min, max]（lamports）
     * @param steps 模拟步数
     * @returns 利润曲线数据
     */
    simulateProfitCurve(opportunity: ArbitrageOpportunity, costConfig: CostConfig, tipRange: [number, number], steps?: number): Array<{
        tip: number;
        netProfit: number;
        roi: number;
    }>;
    /**
     * 估算最大可承受的小费
     * @param opportunity 套利机会
     * @param costConfig 成本配置
     * @param minAcceptableProfit 最小可接受利润（lamports）
     * @returns 最大小费（lamports）
     */
    calculateMaxAffordableTip(opportunity: ArbitrageOpportunity, costConfig: CostConfig, minAcceptableProfit: number): number;
}
//# sourceMappingURL=profit-analyzer.d.ts.map