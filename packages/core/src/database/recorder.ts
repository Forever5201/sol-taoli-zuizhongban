/**
 * 数据记录服务
 * 
 * 记录套利机会和交易到数据库
 */

import { getDatabase } from './index';
import { createLogger } from '../logger';
import type { Prisma } from '@prisma/client';

const logger = createLogger('DatabaseRecorder');

/**
 * 机会记录数据
 */
export interface OpportunityData {
  inputMint: string;
  outputMint: string;
  bridgeToken?: string;
  bridgeMint?: string;
  inputAmount: bigint;
  outputAmount: bigint;
  bridgeAmount?: bigint;
  expectedProfit: bigint;
  expectedRoi: number;
  executed?: boolean;
  filtered?: boolean;
  filterReason?: string;
  metadata?: any;
}

/**
 * 交易记录数据
 */
export interface TradeData {
  signature: string;
  status: 'success' | 'failed' | 'timeout' | 'rejected';
  errorMessage?: string;
  inputMint: string;
  outputMint: string;
  bridgeToken?: string;
  bridgeMint?: string;
  inputAmount: bigint;
  outputAmount: bigint;
  bridgeAmount?: bigint;
  grossProfit: bigint;
  netProfit: bigint;
  roi?: number;
  flashloanFee?: bigint;
  flashloanAmount?: bigint;
  flashloanProvider?: string;
  jitoTip?: bigint;
  gasFee?: bigint;
  priorityFee?: bigint;
  totalFee: bigint;
  computeUnitsUsed?: number;
  computeUnitPrice?: number;
  opportunityId?: bigint;
  metadata?: any;
}

/**
 * 路由记录数据
 */
export interface RouteData {
  stepNumber: number;
  direction: 'outbound' | 'return';
  dexName: string;
  poolAddress?: string;
  inputMint: string;
  outputMint: string;
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact?: number;
}

/**
 * 二次验证记录数据
 */
export interface ValidationData {
  opportunityId: bigint;
  firstDetectedAt: Date;
  firstProfit: bigint;
  firstRoi: number;
  secondCheckedAt: Date;
  stillExists: boolean;
  secondProfit?: bigint;
  secondRoi?: number;
  validationDelayMs: number;
}

/**
 * 数据库记录器类
 */
export class DatabaseRecorder {
  /**
   * 记录发现的套利机会
   */
  async recordOpportunity(data: OpportunityData): Promise<bigint> {
    try {
      const db = getDatabase();
      
      const opportunity = await db.opportunity.create({
        data: {
          inputMint: data.inputMint,
          outputMint: data.outputMint,
          bridgeToken: data.bridgeToken,
          bridgeMint: data.bridgeMint,
          inputAmount: data.inputAmount,
          outputAmount: data.outputAmount,
          bridgeAmount: data.bridgeAmount,
          expectedProfit: data.expectedProfit,
          expectedRoi: data.expectedRoi,
          executed: data.executed || false,
          filtered: data.filtered || false,
          filterReason: data.filterReason,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
      });

      logger.debug('Opportunity recorded', { id: opportunity.id });
      return opportunity.id;
    } catch (error) {
      logger.error('Failed to record opportunity:', error);
      throw error;
    }
  }

  /**
   * 记录交易
   */
  async recordTrade(data: TradeData): Promise<bigint> {
    try {
      const db = getDatabase();
      
      const now = new Date();
      const tradeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hourOfDay = now.getHours();

      const trade = await db.trade.create({
        data: {
          signature: data.signature,
          executedAt: now,
          confirmedAt: data.status === 'success' ? now : undefined,
          status: data.status,
          errorMessage: data.errorMessage,
          inputMint: data.inputMint,
          outputMint: data.outputMint,
          bridgeToken: data.bridgeToken,
          bridgeMint: data.bridgeMint,
          inputAmount: data.inputAmount,
          outputAmount: data.outputAmount,
          bridgeAmount: data.bridgeAmount,
          grossProfit: data.grossProfit,
          netProfit: data.netProfit,
          roi: data.roi,
          flashloanFee: data.flashloanFee || 0n,
          flashloanAmount: data.flashloanAmount || 0n,
          flashloanProvider: data.flashloanProvider,
          jitoTip: data.jitoTip || 0n,
          gasFee: data.gasFee || 0n,
          priorityFee: data.priorityFee || 0n,
          totalFee: data.totalFee,
          computeUnitsUsed: data.computeUnitsUsed,
          computeUnitPrice: data.computeUnitPrice,
          opportunityId: data.opportunityId,
          tradeDate,
          hourOfDay,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
      });

      logger.info('Trade recorded', { 
        id: trade.id, 
        signature: data.signature,
        status: data.status,
      });

      return trade.id;
    } catch (error) {
      logger.error('Failed to record trade:', error);
      throw error;
    }
  }

  /**
   * 更新交易状态
   */
  async updateTradeStatus(
    tradeId: bigint,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const db = getDatabase();
      
      await db.trade.update({
        where: { id: tradeId },
        data: {
          status,
          errorMessage,
          confirmedAt: status === 'success' ? new Date() : undefined,
        },
      });

      logger.debug('Trade status updated', { tradeId, status });
    } catch (error) {
      logger.error('Failed to update trade status:', error);
      throw error;
    }
  }

  /**
   * 记录交易路由详情
   */
  async recordTradeRoutes(tradeId: bigint, routes: RouteData[]): Promise<void> {
    try {
      const db = getDatabase();
      
      await db.tradeRoute.createMany({
        data: routes.map(route => ({
          tradeId,
          stepNumber: route.stepNumber,
          direction: route.direction,
          dexName: route.dexName,
          poolAddress: route.poolAddress,
          inputMint: route.inputMint,
          outputMint: route.outputMint,
          inputAmount: route.inputAmount,
          outputAmount: route.outputAmount,
          priceImpact: route.priceImpact,
        })),
      });

      logger.debug('Trade routes recorded', { tradeId, count: routes.length });
    } catch (error) {
      logger.error('Failed to record trade routes:', error);
      throw error;
    }
  }

  /**
   * 标记机会为已执行
   */
  async markOpportunityExecuted(opportunityId: bigint, tradeId: bigint): Promise<void> {
    try {
      const db = getDatabase();
      
      await db.opportunity.update({
        where: { id: opportunityId },
        data: {
          executed: true,
          tradeId,
        },
      });

      logger.debug('Opportunity marked as executed', { opportunityId, tradeId });
    } catch (error) {
      logger.error('Failed to mark opportunity as executed:', error);
      throw error;
    }
  }

  /**
   * 标记机会为已过滤
   */
  async markOpportunityFiltered(opportunityId: bigint, reason: string): Promise<void> {
    try {
      const db = getDatabase();
      
      await db.opportunity.update({
        where: { id: opportunityId },
        data: {
          filtered: true,
          filterReason: reason,
        },
      });

      logger.debug('Opportunity marked as filtered', { opportunityId, reason });
    } catch (error) {
      logger.error('Failed to mark opportunity as filtered:', error);
      throw error;
    }
  }

  /**
   * 记录机会二次验证结果
   */
  async recordOpportunityValidation(data: ValidationData): Promise<bigint> {
    try {
      const db = getDatabase();
      
      const validation = await db.opportunityValidation.create({
        data: {
          opportunityId: data.opportunityId,
          firstDetectedAt: data.firstDetectedAt,
          firstProfit: data.firstProfit,
          firstRoi: data.firstRoi,
          secondCheckedAt: data.secondCheckedAt,
          stillExists: data.stillExists,
          secondProfit: data.secondProfit,
          secondRoi: data.secondRoi,
          validationDelayMs: data.validationDelayMs,
        },
      });

      logger.debug('Opportunity validation recorded', { 
        id: validation.id,
        opportunityId: data.opportunityId,
        stillExists: data.stillExists,
        delayMs: data.validationDelayMs,
      });

      return validation.id;
    } catch (error) {
      logger.error('Failed to record opportunity validation:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const databaseRecorder = new DatabaseRecorder();



