/**
 * 成本计算器
 *
 * 负责精确计算 Solana 交易的所有成本，包括：
 * - 基础交易费（Base Fee）
 * - 优先费（Priority Fee）
 * - Jito 小费
 * - RPC 成本
 * - 闪电贷费用
 */
import { CostConfig, TransactionCosts } from './types';
export declare class CostCalculator {
    private static readonly DEFAULT_RPC_COST;
    /**
     * 计算基础交易费
     * @param signatureCount 签名数量
     * @returns 基础费用（lamports）
     */
    static calculateBaseFee(signatureCount: number): number;
    /**
     * 计算优先费
     * @param computeUnits 计算单元数量
     * @param computeUnitPrice 计算单元价格（microLamports）
     * @returns 优先费（lamports）
     */
    static calculatePriorityFee(computeUnits: number, computeUnitPrice: number): number;
    /**
     * 估算交易所需的计算单元
     * @param config 成本配置
     * @returns 估算的计算单元数量
     */
    static estimateComputeUnits(config: CostConfig): number;
    /**
     * 计算闪电贷费用
     * @param loanAmount 借款金额（lamports）
     * @returns 闪电贷费用（lamports）
     */
    static calculateFlashLoanFee(loanAmount: number): number;
    /**
     * 计算交易总成本
     * @param config 成本配置
     * @param jitoTip Jito 小费（lamports）
     * @returns 完整的成本明细
     */
    static calculateTotalCost(config: CostConfig, jitoTip: number): TransactionCosts;
    /**
     * 计算最小盈利门槛
     * 考虑所有固定成本，返回必须达到的最小毛利润
     * @param config 成本配置
     * @param jitoTip Jito 小费（lamports）
     * @returns 最小毛利润门槛（lamports）
     */
    static calculateMinProfitThreshold(config: CostConfig, jitoTip: number): number;
    /**
     * 快速估算成本（用于批量机会筛选）
     * @param signatureCount 签名数量
     * @param computeUnits 计算单元
     * @param computeUnitPrice 计算单元价格
     * @param jitoTip Jito 小费
     * @returns 估算总成本（lamports）
     */
    static quickEstimate(signatureCount: number, computeUnits: number, computeUnitPrice: number, jitoTip: number): number;
    /**
     * 比较两个成本配置
     * @param config1 配置 1
     * @param config2 配置 2
     * @param jitoTip Jito 小费
     * @returns 成本差异（lamports，正数表示 config1 更贵）
     */
    static compareCosts(config1: CostConfig, config2: CostConfig, jitoTip: number): number;
    /**
     * 获取成本优化建议
     * @param config 当前配置
     * @returns 优化建议列表
     */
    static getOptimizationSuggestions(config: CostConfig): string[];
}
//# sourceMappingURL=cost-calculator.d.ts.map