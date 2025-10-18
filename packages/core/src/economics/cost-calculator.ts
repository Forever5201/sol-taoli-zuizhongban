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

import {
  CostConfig,
  TransactionCosts,
  BASE_FEE_PER_SIGNATURE,
  FLASH_LOAN_FEE_RATE,
  formatLamportsToSOL,
} from './types';

export class CostCalculator {
  private static readonly DEFAULT_RPC_COST = 100; // lamports

  /**
   * 计算基础交易费
   * @param signatureCount 签名数量
   * @returns 基础费用（lamports）
   */
  static calculateBaseFee(signatureCount: number): number {
    return signatureCount * BASE_FEE_PER_SIGNATURE;
  }

  /**
   * 计算优先费
   * @param computeUnits 计算单元数量
   * @param computeUnitPrice 计算单元价格（microLamports）
   * @returns 优先费（lamports）
   */
  static calculatePriorityFee(
    computeUnits: number,
    computeUnitPrice: number
  ): number {
    // 公式：(computeUnits × computeUnitPrice) / 1,000,000
    return Math.ceil((computeUnits * computeUnitPrice) / 1_000_000);
  }

  /**
   * 估算交易所需的计算单元
   * @param config 成本配置
   * @returns 估算的计算单元数量
   */
  static estimateComputeUnits(config: CostConfig): number {
    if (config.computeUnits > 0) {
      return config.computeUnits;
    }

    // 基于交易类型估算
    let baseUnits = 200_000; // 简单 swap

    if (config.useFlashLoan) {
      baseUnits += 200_000; // 闪电贷增加复杂度
    }

    // 每增加一个签名，增加 50K CU
    baseUnits += (config.signatureCount - 2) * 50_000;

    return Math.min(baseUnits, 1_400_000); // Solana 交易上限
  }

  /**
   * 计算闪电贷费用
   * @param loanAmount 借款金额（lamports）
   * @returns 闪电贷费用（lamports）
   */
  static calculateFlashLoanFee(loanAmount: number): number {
    return Math.ceil(loanAmount * FLASH_LOAN_FEE_RATE);
  }

  /**
   * 计算交易总成本
   * @param config 成本配置
   * @param jitoTip Jito 小费（lamports）
   * @returns 完整的成本明细
   */
  static calculateTotalCost(
    config: CostConfig,
    jitoTip: number
  ): TransactionCosts {
    // 1. 基础交易费
    const baseFee = this.calculateBaseFee(config.signatureCount);

    // 2. 优先费
    const computeUnits = this.estimateComputeUnits(config);
    const priorityFee = this.calculatePriorityFee(
      computeUnits,
      config.computeUnitPrice
    );

    // 3. RPC 成本
    const rpcCost = config.rpcCostPerTransaction || this.DEFAULT_RPC_COST;

    // 4. 闪电贷费用（如果适用）
    let flashLoanFee: number | undefined;
    if (config.useFlashLoan && config.flashLoanAmount) {
      flashLoanFee = this.calculateFlashLoanFee(config.flashLoanAmount);
    }

    // 5. 总成本
    const total =
      baseFee +
      priorityFee +
      jitoTip +
      rpcCost +
      (flashLoanFee || 0);

    // 6. 构建成本明细（用于调试和日志）
    const breakdown = {
      baseFee: formatLamportsToSOL(baseFee),
      priorityFee: formatLamportsToSOL(priorityFee),
      jitoTip: formatLamportsToSOL(jitoTip),
      rpcCost: formatLamportsToSOL(rpcCost),
      ...(flashLoanFee && { flashLoanFee: formatLamportsToSOL(flashLoanFee) }),
      total: formatLamportsToSOL(total),
    };

    return {
      baseFee,
      priorityFee,
      jitoTip,
      rpcCost,
      ...(flashLoanFee && { flashLoanFee }),
      total,
      breakdown,
    };
  }

  /**
   * 计算最小盈利门槛
   * 考虑所有固定成本，返回必须达到的最小毛利润
   * @param config 成本配置
   * @param jitoTip Jito 小费（lamports）
   * @returns 最小毛利润门槛（lamports）
   */
  static calculateMinProfitThreshold(
    config: CostConfig,
    jitoTip: number
  ): number {
    const costs = this.calculateTotalCost(config, jitoTip);
    
    // 如果使用闪电贷，需要考虑费用是从利润中扣除的
    if (config.useFlashLoan && config.flashLoanAmount) {
      // 设 grossProfit 为毛利润，则：
      // netProfit = grossProfit - costs.total - flashLoanFee
      // flashLoanFee = flashLoanAmount × feeRate
      // 为了 netProfit >= 0，grossProfit >= costs.total + flashLoanFee
      // 但 flashLoanFee 依赖于 flashLoanAmount，不是 grossProfit
      // 这里简化：返回固定成本，闪电贷费用单独计算
      return costs.total - (costs.flashLoanFee || 0);
    }

    return costs.total;
  }

  /**
   * 快速估算成本（用于批量机会筛选）
   * @param signatureCount 签名数量
   * @param computeUnits 计算单元
   * @param computeUnitPrice 计算单元价格
   * @param jitoTip Jito 小费
   * @returns 估算总成本（lamports）
   */
  static quickEstimate(
    signatureCount: number,
    computeUnits: number,
    computeUnitPrice: number,
    jitoTip: number
  ): number {
    const baseFee = signatureCount * BASE_FEE_PER_SIGNATURE;
    const priorityFee = Math.ceil((computeUnits * computeUnitPrice) / 1_000_000);
    const rpcCost = this.DEFAULT_RPC_COST;
    
    return baseFee + priorityFee + jitoTip + rpcCost;
  }

  /**
   * 比较两个成本配置
   * @param config1 配置 1
   * @param config2 配置 2
   * @param jitoTip Jito 小费
   * @returns 成本差异（lamports，正数表示 config1 更贵）
   */
  static compareCosts(
    config1: CostConfig,
    config2: CostConfig,
    jitoTip: number
  ): number {
    const cost1 = this.calculateTotalCost(config1, jitoTip).total;
    const cost2 = this.calculateTotalCost(config2, jitoTip).total;
    return cost1 - cost2;
  }

  /**
   * 获取成本优化建议
   * @param config 当前配置
   * @returns 优化建议列表
   */
  static getOptimizationSuggestions(config: CostConfig): string[] {
    const suggestions: string[] = [];
    
    const estimatedCU = this.estimateComputeUnits(config);
    
    if (estimatedCU > 400_000) {
      suggestions.push('交易复杂度过高，考虑简化交易路径或使用 LUT');
    }
    
    if (config.computeUnitPrice > 10_000) {
      suggestions.push('计算单元价格较高，可能处于高竞争环境');
    }
    
    if (config.signatureCount > 3 && !config.useFlashLoan) {
      suggestions.push('签名数量较多，考虑优化交易结构');
    }
    
    if (config.useFlashLoan && config.flashLoanAmount) {
      const fee = this.calculateFlashLoanFee(config.flashLoanAmount);
      const feeInSOL = fee / 1_000_000_000;
      if (feeInSOL > 0.001) {
        suggestions.push(`闪电贷费用较高（${feeInSOL.toFixed(6)} SOL），确保利润足够覆盖`);
      }
    }
    
    return suggestions;
  }
}



