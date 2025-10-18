/**
 * 风险管理器
 *
 * 实现多层次的风险检查和保护机制，包括：
 * - 交易前风险检查
 * - 流动性验证
 * - 滑点保护
 * - 成本效益分析
 */
import { ProfitAnalyzer } from './profit-analyzer';
import { ArbitrageOpportunity, RiskCheckConfig, RiskCheckResult, ProfitAnalysis } from './types';
/**
 * 风险管理器
 */
export declare class RiskManager {
    private readonly profitAnalyzer;
    constructor(profitAnalyzer?: ProfitAnalyzer);
    /**
     * 执行完整的交易前风险检查
     * @param opportunity 套利机会
     * @param analysis 利润分析结果
     * @param config 风险检查配置
     * @returns 风险检查结果
     */
    preExecutionCheck(opportunity: ArbitrageOpportunity, analysis: ProfitAnalysis, config: RiskCheckConfig): RiskCheckResult;
    /**
     * 检查利润门槛
     */
    private checkProfitThreshold;
    /**
     * 检查成本限制
     */
    private checkCostLimit;
    /**
     * 检查滑点
     */
    checkSlippage(opportunity: ArbitrageOpportunity, config: RiskCheckConfig): boolean;
    /**
     * 检查流动性
     */
    checkLiquidity(opportunity: ArbitrageOpportunity, config: RiskCheckConfig): boolean;
    /**
     * 检查 ROI
     */
    private checkROI;
    /**
     * 生成失败原因描述
     */
    private getFailureReason;
    /**
     * 验证机会有效性
     * @param opportunity 套利机会
     * @returns 是否有效
     */
    validateOpportunity(opportunity: ArbitrageOpportunity): {
        valid: boolean;
        reason?: string;
    };
    /**
     * 评估机会风险等级
     * @param opportunity 套利机会
     * @param analysis 利润分析
     * @returns 风险等级（low, medium, high）
     */
    assessRiskLevel(opportunity: ArbitrageOpportunity, analysis: ProfitAnalysis): 'low' | 'medium' | 'high';
    /**
     * 计算推荐的交易金额
     * @param opportunity 套利机会
     * @param availableCapital 可用资金（lamports）
     * @param riskTolerance 风险容忍度（0-1）
     * @returns 推荐交易金额（lamports）
     */
    calculateRecommendedAmount(opportunity: ArbitrageOpportunity, availableCapital: number, riskTolerance?: number): number;
    /**
     * 检查是否应该使用闪电贷
     * @param opportunityAmount 机会所需金额（lamports）
     * @param availableCapital 可用资金（lamports）
     * @param expectedProfit 预期利润（lamports）
     * @returns 是否应该使用闪电贷
     */
    shouldUseFlashLoan(opportunityAmount: number, availableCapital: number, expectedProfit: number): boolean;
    /**
     * 生成风险报告
     * @param opportunity 套利机会
     * @param analysis 利润分析
     * @param checkResult 风险检查结果
     * @returns 格式化的风险报告
     */
    generateRiskReport(opportunity: ArbitrageOpportunity, analysis: ProfitAnalysis, checkResult: RiskCheckResult): string;
}
//# sourceMappingURL=risk-manager.d.ts.map