/**
 * 数据查询服务
 * 
 * 提供多维度的数据查询功能
 */

import { getDatabase } from './index';
import { createLogger } from '../logger';
import type { Trade, Opportunity, TradeRoute } from '@prisma/client';

const logger = createLogger('DatabaseQuery');

/**
 * 交易查询结果（包含路由）
 */
export type TradeWithRoutes = Trade & {
  routes: TradeRoute[];
  opportunity?: Opportunity | null;
};

/**
 * 日期范围
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 数据库查询服务类
 */
export class DatabaseQuery {
  /**
   * 按日期范围查询交易
   */
  async getTradesByDateRange(
    dateRange: DateRange,
    pagination?: PaginationParams
  ): Promise<{ trades: TradeWithRoutes[]; total: number }> {
    try {
      const db = getDatabase();
      const { start, end } = dateRange;
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 50;
      const skip = (page - 1) * pageSize;

      const [trades, total] = await Promise.all([
        db.trade.findMany({
          where: {
            tradeDate: {
              gte: start,
              lte: end,
            },
          },
          include: {
            routes: true,
            opportunity: true,
          },
          orderBy: {
            executedAt: 'desc',
          },
          skip,
          take: pageSize,
        }),
        db.trade.count({
          where: {
            tradeDate: {
              gte: start,
              lte: end,
            },
          },
        }),
      ]);

      return { trades, total };
    } catch (error) {
      logger.error('Failed to query trades by date range:', error);
      throw error;
    }
  }

  /**
   * 按代币查询交易
   */
  async getTradesByToken(
    tokenMint: string,
    pagination?: PaginationParams
  ): Promise<{ trades: TradeWithRoutes[]; total: number }> {
    try {
      const db = getDatabase();
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 50;
      const skip = (page - 1) * pageSize;

      const [trades, total] = await Promise.all([
        db.trade.findMany({
          where: {
            OR: [
              { inputMint: tokenMint },
              { outputMint: tokenMint },
              { bridgeMint: tokenMint },
            ],
          },
          include: {
            routes: true,
            opportunity: true,
          },
          orderBy: {
            executedAt: 'desc',
          },
          skip,
          take: pageSize,
        }),
        db.trade.count({
          where: {
            OR: [
              { inputMint: tokenMint },
              { outputMint: tokenMint },
              { bridgeMint: tokenMint },
            ],
          },
        }),
      ]);

      return { trades, total };
    } catch (error) {
      logger.error('Failed to query trades by token:', error);
      throw error;
    }
  }

  /**
   * 按状态查询交易
   */
  async getTradesByStatus(
    status: string,
    pagination?: PaginationParams
  ): Promise<{ trades: TradeWithRoutes[]; total: number }> {
    try {
      const db = getDatabase();
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 50;
      const skip = (page - 1) * pageSize;

      const [trades, total] = await Promise.all([
        db.trade.findMany({
          where: { status },
          include: {
            routes: true,
            opportunity: true,
          },
          orderBy: {
            executedAt: 'desc',
          },
          skip,
          take: pageSize,
        }),
        db.trade.count({
          where: { status },
        }),
      ]);

      return { trades, total };
    } catch (error) {
      logger.error('Failed to query trades by status:', error);
      throw error;
    }
  }

  /**
   * 获取最近的交易
   */
  async getRecentTrades(limit: number = 20): Promise<TradeWithRoutes[]> {
    try {
      const db = getDatabase();
      
      const trades = await db.trade.findMany({
        include: {
          routes: true,
          opportunity: true,
        },
        orderBy: {
          executedAt: 'desc',
        },
        take: limit,
      });

      return trades;
    } catch (error) {
      logger.error('Failed to query recent trades:', error);
      throw error;
    }
  }

  /**
   * 根据签名查询交易
   */
  async getTradeBySignature(signature: string): Promise<TradeWithRoutes | null> {
    try {
      const db = getDatabase();
      
      const trade = await db.trade.findUnique({
        where: { signature },
        include: {
          routes: true,
          opportunity: true,
        },
      });

      return trade;
    } catch (error) {
      logger.error('Failed to query trade by signature:', error);
      throw error;
    }
  }

  /**
   * 获取交易汇总
   */
  async getTradeSummary(dateRange?: DateRange): Promise<{
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    successRate: number;
    totalNetProfit: bigint;
    totalFees: bigint;
    avgProfit: bigint;
  }> {
    try {
      const db = getDatabase();
      
      const where = dateRange
        ? {
            tradeDate: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          }
        : {};

      const [totalTrades, successfulTrades, failedTrades, profitStats] = await Promise.all([
        db.trade.count({ where }),
        db.trade.count({ where: { ...where, status: 'success' } }),
        db.trade.count({ where: { ...where, status: 'failed' } }),
        db.trade.aggregate({
          where,
          _sum: {
            netProfit: true,
            totalFee: true,
          },
          _avg: {
            netProfit: true,
          },
        }),
      ]);

      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

      return {
        totalTrades,
        successfulTrades,
        failedTrades,
        successRate,
        totalNetProfit: BigInt(profitStats._sum.netProfit || 0),
        totalFees: BigInt(profitStats._sum.totalFee || 0),
        avgProfit: BigInt(Math.floor(profitStats._avg.netProfit || 0)),
      };
    } catch (error) {
      logger.error('Failed to get trade summary:', error);
      throw error;
    }
  }

  /**
   * 查询高质量机会
   */
  async getHighQualityOpportunities(
    minProfit: bigint,
    limit: number = 50
  ): Promise<Opportunity[]> {
    try {
      const db = getDatabase();
      
      const opportunities = await db.opportunity.findMany({
        where: {
          expectedProfit: {
            gte: minProfit,
          },
          executed: false,
        },
        orderBy: {
          expectedProfit: 'desc',
        },
        take: limit,
      });

      return opportunities;
    } catch (error) {
      logger.error('Failed to query high quality opportunities:', error);
      throw error;
    }
  }

  /**
   * 获取执行率最高的代币对
   */
  async getTopTokenPairs(limit: number = 10): Promise<
    Array<{
      inputMint: string;
      bridgeToken: string | null;
      count: number;
      totalProfit: bigint;
      avgProfit: bigint;
    }>
  > {
    try {
      const db = getDatabase();
      
      const result = await (db.trade.groupBy as any)({
        by: ['inputMint', 'bridgeToken'],
        where: {
          status: 'success',
        },
        _count: true,
        _sum: {
          netProfit: true,
        },
        _avg: {
          netProfit: true,
        },
        orderBy: {
          _count: {
            _all: 'desc',
          },
        },
        take: limit,
      });

      return (result as any[]).map((item: any) => ({
        inputMint: item.inputMint,
        bridgeToken: item.bridgeToken,
        count: (item._count as any)._all as number,
        totalProfit: BigInt(item._sum?.netProfit || 0),
        avgProfit: BigInt(Math.floor(Number(item._avg?.netProfit || 0))),
      }));
    } catch (error) {
      logger.error('Failed to get top token pairs:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const databaseQuery = new DatabaseQuery();



