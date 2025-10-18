/**
 * 套利引擎
 * 
 * 分析价格数据，发现套利机会，集成经济模型进行利润评估
 */

import { PublicKey } from '@solana/web3.js';
import { PriceData } from './parsers/raydium';
import { Market } from './market-scanner';
import { ArbitrageOpportunity } from '../../core/src/economics/types';
import { createLogger } from '../../core/src/logger';

const logger = createLogger('ArbitrageEngine');

/**
 * 套利路径
 */
export interface ArbitragePath {
  /** 路径描述（如 "SOL -> USDC -> SOL"） */
  description: string;
  /** 起始市场 */
  market1: Market;
  /** 返回市场 */
  market2: Market;
  /** 价格1 */
  price1: PriceData;
  /** 价格2 */
  price2: PriceData;
  /** 价差百分比 */
  spreadPercent: number;
}

/**
 * 套利引擎配置
 */
export interface ArbitrageEngineConfig {
  /** 最小价差阈值（百分比） */
  minSpreadPercent?: number;
  /** 最小流动性（USD） */
  minLiquidity?: number;
  /** 交易金额（lamports） */
  tradeAmount?: number;
}

/**
 * 套利引擎类
 */
export class ArbitrageEngine {
  private config: Required<ArbitrageEngineConfig>;

  constructor(config: ArbitrageEngineConfig = {}) {
    this.config = {
      minSpreadPercent: config.minSpreadPercent || 0.5, // 0.5%
      minLiquidity: config.minLiquidity || 5000, // $5000
      tradeAmount: config.tradeAmount || 1_000_000_000, // 1 SOL
    };

    logger.info(`Arbitrage engine initialized with min spread ${this.config.minSpreadPercent}%`);
  }

  /**
   * 发现2-hop套利机会
   * @param prices 价格数据列表
   * @param markets 市场列表
   * @returns 套利机会列表
   */
  findArbitrageOpportunities(
    prices: PriceData[],
    markets: Market[]
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const startTime = Date.now();

    // 为价格数据建立索引
    const priceMap = new Map<string, PriceData>();
    for (const price of prices) {
      priceMap.set(price.poolAddress, price);
    }

    // 找出所有可能的2-hop路径
    // 例如：SOL -> USDC (池子1) -> SOL (池子2)
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const market1 = markets[i];
        const market2 = markets[j];

        // 检查是否形成环路（A -> B -> A）
        if (!this.isCircularPath(market1, market2)) {
          continue;
        }

        const price1 = priceMap.get(market1.poolAddress);
        const price2 = priceMap.get(market2.poolAddress);

        if (!price1 || !price2) {
          continue;
        }

        // 计算套利机会
        const opportunity = this.calculateArbitrage(market1, market2, price1, price2);

        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    }

    const latency = Date.now() - startTime;
    logger.info(`Found ${opportunities.length} arbitrage opportunities in ${latency}ms`);

    // 按利润排序
    return opportunities.sort((a, b) => b.grossProfit - a.grossProfit);
  }

  /**
   * 检查是否形成环路
   * @param market1 市场1
   * @param market2 市场2
   * @returns 是否形成环路
   */
  private isCircularPath(market1: Market, market2: Market): boolean {
    // 简化检查：如果两个市场有共同的代币，可能形成环路
    // 例如：SOL/USDC 和 SOL/USDT 可以通过 SOL 连接
    
    const tokens1 = new Set([market1.baseMint, market1.quoteMint]);
    const tokens2 = new Set([market2.baseMint, market2.quoteMint]);

    // 检查是否有共同代币
    for (const token of tokens1) {
      if (tokens2.has(token)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 计算套利机会
   * @param market1 市场1
   * @param market2 市场2
   * @param price1 价格1
   * @param price2 价格2
   * @returns 套利机会或null
   */
  private calculateArbitrage(
    market1: Market,
    market2: Market,
    price1: PriceData,
    price2: PriceData
  ): ArbitrageOpportunity | null {
    try {
      // 简化的2-hop套利计算
      // 假设: SOL -> USDC (市场1) -> SOL (市场2)
      
      // 计算价差
      const buyPrice = price1.price; // 用 SOL 买 USDC 的价格
      const sellPrice = price2.price !== 0 ? 1 / price2.price : 0; // 用 USDC 卖 SOL 的价格

      if (sellPrice === 0) {
        return null;
      }

      const spread = (sellPrice - buyPrice) / buyPrice;
      const spreadPercent = spread * 100;

      // 检查是否满足最小价差
      if (spreadPercent < this.config.minSpreadPercent) {
        return null;
      }

      // 检查流动性
      if (price1.liquidity < this.config.minLiquidity || price2.liquidity < this.config.minLiquidity) {
        return null;
      }

      // 估算毛利润
      const inputAmount = this.config.tradeAmount;
      const outputAmount = inputAmount * (1 + spread);
      const grossProfit = outputAmount - inputAmount;

      // 估算滑点
      const slippage1 = this.estimateSlippage(inputAmount, price1.liquidity);
      const slippage2 = this.estimateSlippage(outputAmount * buyPrice / sellPrice, price2.liquidity);
      const totalSlippage = Math.max(slippage1, slippage2);

      // 创建套利机会对象
      const opportunity: ArbitrageOpportunity = {
        tokenPair: `${market1.name} <-> ${market2.name}`,
        inputMint: market1.baseMint,
        outputMint: market1.baseMint, // 环路，最终回到同一代币
        inputAmount,
        expectedOutput: outputAmount,
        grossProfit,
        route: [price1.dex, price2.dex],
        poolLiquidity: Math.min(price1.liquidity, price2.liquidity),
        estimatedSlippage: totalSlippage,
        discoveredAt: Date.now(),
      };

      logger.debug(
        `Arbitrage found: ${opportunity.tokenPair}, spread: ${spreadPercent.toFixed(2)}%, profit: ${grossProfit}`
      );

      return opportunity;
    } catch (error) {
      logger.error(`Failed to calculate arbitrage: ${error}`);
      return null;
    }
  }

  /**
   * 估算滑点
   * @param tradeAmount 交易金额（USD）
   * @param liquidity 流动性（USD）
   * @returns 滑点（0-1）
   */
  private estimateSlippage(tradeAmount: number, liquidity: number): number {
    if (liquidity === 0) {
      return 1;
    }

    // 将lamports转换为USD（假设1 SOL = $200）
    const SOL_PRICE = 200;
    const tradeAmountUSD = (tradeAmount / 1_000_000_000) * SOL_PRICE;

    // 简化的滑点模型
    const impactRatio = tradeAmountUSD / (2 * liquidity);
    const fee = 0.003; // 0.3% 交易费

    return Math.min(impactRatio + fee, 0.5); // 最大50%滑点
  }

  /**
   * 过滤套利机会
   * @param opportunities 套利机会列表
   * @param maxSlippage 最大滑点
   * @param minProfit 最小利润
   * @returns 过滤后的列表
   */
  filterOpportunities(
    opportunities: ArbitrageOpportunity[],
    maxSlippage: number = 0.02,
    minProfit: number = 100_000
  ): ArbitrageOpportunity[] {
    return opportunities.filter(
      (opp) =>
        opp.estimatedSlippage <= maxSlippage &&
        opp.grossProfit >= minProfit &&
        opp.poolLiquidity >= this.config.minLiquidity
    );
  }

  /**
   * 获取最佳套利机会
   * @param opportunities 套利机会列表
   * @returns 最佳机会或undefined
   */
  getBestOpportunity(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity | undefined {
    if (opportunities.length === 0) {
      return undefined;
    }

    // 返回利润最高的机会
    return opportunities.reduce((best, current) =>
      current.grossProfit > best.grossProfit ? current : best
    );
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<ArbitrageEngineConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Arbitrage engine config updated');
  }

  /**
   * 获取当前配置
   * @returns 配置对象
   */
  getConfig(): Required<ArbitrageEngineConfig> {
    return { ...this.config };
  }
}

export default ArbitrageEngine;


