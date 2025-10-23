/**
 * 动态优先费估算器
 * 
 * 根据 Solana 网络拥堵情况和套利利润动态计算最优优先费
 * 参考官方文档: https://solana.com/developers/guides/advanced/how-to-use-priority-fees
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { createLogger } from '../logger';

const logger = createLogger('PriorityFeeEstimator');

/**
 * 紧急程度等级
 */
export type Urgency = 'low' | 'medium' | 'high' | 'veryHigh';

/**
 * 优先费估算结果
 */
export interface PriorityFeeEstimate {
  /** 每计算单元的费用 (micro-lamports) */
  feePerCU: number;
  /** 总费用 (lamports) */
  totalFee: number;
  /** 计算单元数 */
  computeUnits: number;
  /** 使用的策略描述 */
  strategy: string;
}

/**
 * 主流 DEX 程序账户（用于查询相关优先费）
 */
const DEX_PROGRAMS = [
  new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'), // Raydium AMM
  new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),   // Jupiter V6
  new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),   // Orca Whirlpool
  new PublicKey('Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'),   // Meteora
];

/**
 * 动态优先费估算器
 */
export class PriorityFeeEstimator {
  private readonly DEFAULT_COMPUTE_UNITS = 800_000;
  private readonly MIN_FEE_PER_CU = 20_000;      // 20k micro-lamports (最低保障)
  private readonly MAX_FEE_PER_CU = 100_000;     // 100k micro-lamports (防止极端情况)
  private readonly MAX_FEE_PROFIT_RATIO = 0.10;  // 优先费不超过利润的10%

  constructor(
    private connection: Connection,
    private computeUnits: number = 800_000
  ) {}

  /**
   * 估算最优优先费
   * 
   * @param profit 预期利润 (lamports)
   * @param urgency 紧急程度
   * @returns 优先费估算结果
   */
  async estimateOptimalFee(
    profit: number,
    urgency: Urgency = 'high'
  ): Promise<PriorityFeeEstimate> {
    try {
      // 1. 查询网络费用（基于DEX账户争用）
      const networkFee = await this.queryNetworkFee(urgency);
      
      // 2. 基于利润计算推荐费用
      const profitBasedFee = this.calculateProfitBasedFee(profit);
      
      // 3. 取两者中的较高值（确保既能上链，又不过度支付）
      const baseFeePerCU = Math.max(networkFee.feePerCU, profitBasedFee.feePerCU);
      
      // 4. 应用安全限制
      const finalFeePerCU = this.applySafetyLimits(baseFeePerCU, profit);
      
      // 5. 计算总费用（修复：micro-lamports → lamports，需要除以1,000,000）
      const totalFee = Math.floor((finalFeePerCU * this.computeUnits) / 1_000_000);
      
      // 6. 生成策略说明
      const strategy = this.explainStrategy(networkFee, profitBasedFee, finalFeePerCU, urgency);
      
      logger.debug(`优先费估算完成: ${finalFeePerCU} micro-lamports/CU, 总计 ${totalFee} lamports`);
      
      return {
        feePerCU: finalFeePerCU,
        totalFee,
        computeUnits: this.computeUnits,
        strategy,
      };
    } catch (error: any) {
      logger.warn(`优先费估算失败，使用降级策略: ${error.message}`);
      return this.getFallbackFee(profit);
    }
  }

  /**
   * 查询网络优先费（针对DEX程序账户）
   * 
   * @param urgency 紧急程度
   * @returns 网络费用信息
   */
  private async queryNetworkFee(urgency: Urgency): Promise<{ feePerCU: number }> {
    try {
      // 调用 Solana RPC 查询最近的优先费
      const fees = await this.connection.getRecentPrioritizationFees({
        lockedWritableAccounts: DEX_PROGRAMS,
      });

      if (!fees || fees.length === 0) {
        logger.warn('未获取到网络优先费数据，使用默认值');
        return { feePerCU: this.MIN_FEE_PER_CU };
      }

      // 提取优先费并排序
      const sortedFees = fees
        .map(f => f.prioritizationFee)
        .filter(f => f > 0) // 过滤掉0费用
        .sort((a, b) => a - b);

      if (sortedFees.length === 0) {
        return { feePerCU: this.MIN_FEE_PER_CU };
      }

      // 根据紧急程度选择百分位数
      const percentileMap: Record<Urgency, number> = {
        low: 0.50,      // 50th 百分位 (中位数)
        medium: 0.60,   // 60th 百分位
        high: 0.75,     // 75th 百分位 (推荐)
        veryHigh: 0.90, // 90th 百分位 (极高优先)
      };

      const percentile = percentileMap[urgency];
      const index = Math.floor(sortedFees.length * percentile);
      const selectedFee = sortedFees[Math.min(index, sortedFees.length - 1)];

      logger.debug(
        `网络优先费查询成功: ${sortedFees.length}个样本, ` +
        `${urgency}(${(percentile * 100).toFixed(0)}th) = ${selectedFee} micro-lamports/CU`
      );

      return { feePerCU: selectedFee };
    } catch (error: any) {
      // 尝试使用Helius专用Priority Fee API（如果使用的是Helius RPC）
      const rpcEndpoint = (this.connection as any)._rpcEndpoint;
      if (rpcEndpoint?.includes('helius')) {
        try {
          logger.debug('标准RPC方法失败，尝试Helius专用Priority Fee API');
          return await this.queryHeliusPriorityFee(urgency);
        } catch (heliusError: any) {
          logger.debug(`Helius Priority Fee API也失败: ${heliusError.message}`);
        }
      }
      
      // 添加关于RPC限制的上下文信息
      if (error.message?.includes('fetch failed')) {
        logger.warn(
          '免费RPC不支持getRecentPrioritizationFees方法。' +
          '建议使用付费RPC (Helius/QuickNode) 以获得更准确的优先费估算'
        );
      }
      logger.error(`查询网络优先费失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 使用Helius专用API查询优先费
   * 
   * @param urgency 紧急程度
   * @returns 优先费信息
   */
  private async queryHeliusPriorityFee(urgency: Urgency): Promise<{ feePerCU: number }> {
    try {
      const endpoint = (this.connection as any)._rpcEndpoint;
      const baseUrl = endpoint.split('?')[0]; // 移除查询参数
      
      // Helius Priority Fee API: https://docs.helius.dev/solana-rpc-nodes/alpha-priority-fee-api
      const response = await fetch(`${baseUrl}/v0/getPriorityFeeEstimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountKeys: DEX_PROGRAMS.map(p => p.toBase58()),
          options: {
            recommended: urgency === 'high' || urgency === 'veryHigh',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Helius API返回错误: ${response.status}`);
      }

      const data = await response.json() as any;
      
      // Helius返回的priorityFeeEstimate已经是micro-lamports/CU
      const feePerCU = data.priorityFeeEstimate || this.MIN_FEE_PER_CU;
      
      logger.debug(
        `Helius Priority Fee API查询成功: ${feePerCU} micro-lamports/CU ` +
        `(urgency: ${urgency})`
      );

      return { feePerCU };
    } catch (error: any) {
      logger.error(`Helius Priority Fee API查询失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 基于利润计算推荐费用
   * 
   * @param profit 预期利润 (lamports)
   * @returns 推荐费用信息
   */
  private calculateProfitBasedFee(profit: number): { feePerCU: number } {
    // 策略: 利润的 5% 作为优先费预算
    const feesBudget = profit * 0.05;
    const feePerCU = Math.floor(feesBudget / this.computeUnits);

    logger.debug(
      `利润基准费用: 利润 ${profit} lamports × 5% = ` +
      `${feesBudget} lamports → ${feePerCU} micro-lamports/CU`
    );

    return { feePerCU };
  }

  /**
   * 应用安全限制
   * 
   * @param baseFeePerCU 基准费用
   * @param profit 预期利润
   * @returns 最终费用（经过限制）
   */
  private applySafetyLimits(baseFeePerCU: number, profit: number): number {
    // 1. 应用下限（确保能上链）
    let finalFee = Math.max(baseFeePerCU, this.MIN_FEE_PER_CU);

    // 2. 应用上限（防止极端情况）
    finalFee = Math.min(finalFee, this.MAX_FEE_PER_CU);

    // 3. 确保总费用不超过利润的10%
    const maxAllowedFee = Math.floor((profit * this.MAX_FEE_PROFIT_RATIO) / this.computeUnits);
    if (maxAllowedFee > 0) {
      finalFee = Math.min(finalFee, maxAllowedFee);
    }

    logger.debug(
      `安全限制应用: ${baseFeePerCU} → ${finalFee} micro-lamports/CU ` +
      `(范围: ${this.MIN_FEE_PER_CU}-${this.MAX_FEE_PER_CU}, 利润限制: ${maxAllowedFee})`
    );

    return finalFee;
  }

  /**
   * 降级策略：网络查询失败时使用
   * 
   * @param profit 预期利润
   * @returns 降级费用估算
   */
  private getFallbackFee(profit: number): PriorityFeeEstimate {
    // 基于利润的动态降级策略
    const profitBasedFee = this.calculateProfitBasedFee(profit);
    const feePerCU = Math.max(profitBasedFee.feePerCU, this.MIN_FEE_PER_CU);
    const finalFeePerCU = Math.min(feePerCU, this.MAX_FEE_PER_CU);
    const totalFee = Math.floor((finalFeePerCU * this.computeUnits) / 1_000_000);

    logger.info(
      `使用降级策略: ${finalFeePerCU} micro-lamports/CU ` +
      `(总计 ${totalFee} lamports = ${(totalFee / 1e9).toFixed(6)} SOL)`
    );

    return {
      feePerCU: finalFeePerCU,
      totalFee,
      computeUnits: this.computeUnits,
      strategy: `降级策略(网络查询失败): 基于利润${profit} lamports的5%, 限制在${this.MIN_FEE_PER_CU}-${this.MAX_FEE_PER_CU}范围内`,
    };
  }

  /**
   * 生成策略说明
   */
  private explainStrategy(
    networkFee: { feePerCU: number },
    profitBasedFee: { feePerCU: number },
    finalFeePerCU: number,
    urgency: string
  ): string {
    const source = networkFee.feePerCU >= profitBasedFee.feePerCU
      ? `网络争用(${urgency}, ${networkFee.feePerCU} μL/CU)`
      : `利润基准(5%, ${profitBasedFee.feePerCU} μL/CU)`;

    const limited = finalFeePerCU !== Math.max(networkFee.feePerCU, profitBasedFee.feePerCU)
      ? `, 已限制至${finalFeePerCU} μL/CU`
      : '';

    return `动态估算: ${source}${limited}`;
  }

  /**
   * 设置计算单元数
   * 
   * @param units 计算单元数
   */
  setComputeUnits(units: number): void {
    this.computeUnits = units;
    logger.debug(`计算单元数已更新: ${units}`);
  }
}

