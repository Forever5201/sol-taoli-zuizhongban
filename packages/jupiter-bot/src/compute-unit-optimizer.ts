/**
 * 计算单元优化器
 * 
 * 通过RPC模拟获取真实CU消耗，动态优化交易CU预算
 * 降低优先费成本，提高交易性价比
 */

import { Connection, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('ComputeUnitOptimizer');

/**
 * CU优化结果
 */
export interface CUOptimizationResult {
  /** 原始预算 (CU) */
  originalBudget: number;
  /** 模拟实际消耗 (CU) */
  actualConsumed: number;
  /** 优化后的预算 (CU) */
  optimizedBudget: number;
  /** 安全边际百分比 */
  safetyMargin: number;
  /** 节省的CU */
  savedCU: number;
  /** 节省的费用 (lamports) */
  savedFee: number;
  /** 优化策略 */
  strategy: string;
}

/**
 * CU优化器配置
 */
export interface CUOptimizerConfig {
  /** 安全边际（默认1.1，即增加10%） */
  safetyMargin?: number;
  /** 最小CU预算（防止过低） */
  minBudget?: number;
  /** 最大CU预算（防止过高） */
  maxBudget?: number;
  /** 是否启用优化 */
  enabled?: boolean;
}

/**
 * 计算单元优化器
 */
export class ComputeUnitOptimizer {
  private static readonly DEFAULT_SAFETY_MARGIN = 1.1;  // 10% 安全边际
  private static readonly MIN_BUDGET = 200_000;          // 最小20万CU
  private static readonly MAX_BUDGET = 1_400_000;        // Solana上限140万CU
  
  private readonly safetyMargin: number;
  private readonly minBudget: number;
  private readonly maxBudget: number;
  private readonly enabled: boolean;
  
  // 统计数据
  private stats = {
    totalOptimizations: 0,
    totalSavedCU: 0,
    totalSavedFee: 0,
  };

  constructor(config: CUOptimizerConfig = {}) {
    this.safetyMargin = config.safetyMargin || ComputeUnitOptimizer.DEFAULT_SAFETY_MARGIN;
    this.minBudget = config.minBudget || ComputeUnitOptimizer.MIN_BUDGET;
    this.maxBudget = config.maxBudget || ComputeUnitOptimizer.MAX_BUDGET;
    this.enabled = config.enabled !== false;
    
    logger.info(
      `CU优化器初始化: ` +
      `安全边际=${((this.safetyMargin - 1) * 100).toFixed(0)}%, ` +
      `范围=${this.minBudget}-${this.maxBudget} CU`
    );
  }

  /**
   * 从模拟结果中提取实际CU消耗
   * 
   * @param simulationResult RPC simulateTransaction 的返回值
   * @returns 实际消耗的CU，如果无法获取则返回 null
   */
  extractConsumedCU(simulationResult: any): number | null {
    try {
      // RPC返回结构：simulation.value.unitsConsumed
      const consumed = simulationResult?.value?.unitsConsumed;
      
      if (typeof consumed === 'number' && consumed > 0) {
        logger.debug(`提取到实际CU消耗: ${consumed}`);
        return consumed;
      }
      
      logger.warn('模拟结果中未找到 unitsConsumed 字段');
      return null;
    } catch (error: any) {
      logger.error(`提取CU消耗失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 计算优化后的CU预算
   * 
   * @param actualConsumed 实际消耗的CU（从模拟中获取）
   * @param originalBudget 原始配置的CU预算
   * @param pricePerCU 单位CU的价格（micro-lamports）
   * @returns 优化结果
   */
  optimizeBudget(
    actualConsumed: number,
    originalBudget: number,
    pricePerCU: number
  ): CUOptimizationResult {
    if (!this.enabled) {
      return {
        originalBudget,
        actualConsumed,
        optimizedBudget: originalBudget,
        safetyMargin: 1.0,
        savedCU: 0,
        savedFee: 0,
        strategy: 'CU优化已禁用',
      };
    }

    // 1. 计算优化后的预算（实际消耗 × 安全边际）
    let optimizedBudget = Math.ceil(actualConsumed * this.safetyMargin);
    
    // 2. 应用边界限制
    optimizedBudget = Math.max(optimizedBudget, this.minBudget);
    optimizedBudget = Math.min(optimizedBudget, this.maxBudget);
    
    // 3. 如果优化后的预算反而更高，保持原预算
    if (optimizedBudget > originalBudget) {
      logger.debug(
        `优化后预算(${optimizedBudget})高于原预算(${originalBudget})，` +
        `保持原预算（可能是模拟环境差异）`
      );
      optimizedBudget = originalBudget;
    }
    
    // 4. 计算节省
    const savedCU = originalBudget - optimizedBudget;
    const savedFee = Math.floor((savedCU * pricePerCU) / 1_000_000);
    
    // 5. 更新统计
    this.stats.totalOptimizations++;
    this.stats.totalSavedCU += savedCU;
    this.stats.totalSavedFee += savedFee;
    
    // 6. 生成策略说明
    const strategy = this.generateStrategy(actualConsumed, optimizedBudget, originalBudget);
    
    logger.info(
      `✅ CU优化完成: ${originalBudget} → ${optimizedBudget} CU ` +
      `(节省 ${savedCU} CU = ${savedFee} lamports = ${(savedFee / 1e9).toFixed(9)} SOL)`
    );
    
    return {
      originalBudget,
      actualConsumed,
      optimizedBudget,
      safetyMargin: this.safetyMargin,
      savedCU,
      savedFee,
      strategy,
    };
  }

  /**
   * 应用CU预算到交易（修改交易的ComputeBudget指令）
   * 
   * @param transaction 交易对象
   * @param optimizedBudget 优化后的CU预算
   */
  applyOptimizedBudget(
    transaction: VersionedTransaction,
    optimizedBudget: number
  ): void {
    try {
      // ⚠️ VersionedTransaction 不支持直接修改指令
      // 需要在构建交易时就设置正确的CU预算
      // 这里只是记录日志，实际应用在构建阶段
      
      logger.debug(
        `应用优化CU预算: ${optimizedBudget} CU ` +
        `(注意: 需要在交易构建时设置)`
      );
      
      // TODO: 实际实现需要在 FlashLoanTransactionBuilder 中集成
    } catch (error: any) {
      logger.error(`应用CU预算失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成优化策略说明
   */
  private generateStrategy(
    actualConsumed: number,
    optimizedBudget: number,
    originalBudget: number
  ): string {
    const savingPercent = ((originalBudget - optimizedBudget) / originalBudget * 100).toFixed(1);
    
    return (
      `基于模拟(${actualConsumed} CU) + ` +
      `安全边际(${((this.safetyMargin - 1) * 100).toFixed(0)}%) = ` +
      `${optimizedBudget} CU，节省 ${savingPercent}%`
    );
  }

  /**
   * 获取优化统计
   */
  getStats() {
    return {
      ...this.stats,
      averageSavedCU: this.stats.totalOptimizations > 0
        ? Math.floor(this.stats.totalSavedCU / this.stats.totalOptimizations)
        : 0,
      averageSavedFee: this.stats.totalOptimizations > 0
        ? Math.floor(this.stats.totalSavedFee / this.stats.totalOptimizations)
        : 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalOptimizations: 0,
      totalSavedCU: 0,
      totalSavedFee: 0,
    };
  }
}

/**
 * 辅助函数：为交易添加ComputeBudget指令
 * 
 * @param instructions 现有指令数组
 * @param computeUnitLimit CU预算
 * @param computeUnitPrice CU单价（micro-lamports）
 * @returns 包含ComputeBudget指令的新数组
 */
export function addComputeBudgetInstructions(
  instructions: any[],
  computeUnitLimit: number,
  computeUnitPrice: number
): any[] {
  const budgetInstructions = [
    // 1. 设置CU限制
    ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnitLimit,
    }),
    
    // 2. 设置CU价格
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: computeUnitPrice,
    }),
  ];
  
  // ComputeBudget指令必须在交易的最前面
  return [...budgetInstructions, ...instructions];
}

