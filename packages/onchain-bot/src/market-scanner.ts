/**
 * 市场扫描器
 * 
 * 负责批量获取链上市场数据，解析价格，维护价格缓存
 */

import { PublicKey } from '@solana/web3.js';
import { ConnectionPool, createLogger } from '@solana-arb-bot/core';
import { RaydiumParser, PriceData } from './parsers/raydium';

const logger = createLogger('MarketScanner');

/**
 * 市场配置
 */
export interface Market {
  name: string;
  dex: string;
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
}

/**
 * 扫描器配置
 */
export interface MarketScannerConfig {
  markets: Market[];
  scanIntervalMs?: number;
}

/**
 * 市场扫描器类
 */
export class MarketScanner {
  private connectionPool: ConnectionPool;
  private markets: Market[];
  private priceCache: Map<string, PriceData>;
  private scanIntervalMs: number;
  private isScanning: boolean = false;

  constructor(connectionPool: ConnectionPool, config: MarketScannerConfig) {
    this.connectionPool = connectionPool;
    this.markets = config.markets;
    this.priceCache = new Map();
    this.scanIntervalMs = config.scanIntervalMs || 100;

    logger.info(`Market scanner initialized with ${this.markets.length} markets`);
  }

  /**
   * 扫描所有市场
   * @returns 价格数据数组
   */
  async scanMarkets(): Promise<PriceData[]> {
    if (this.isScanning) {
      logger.warn('Scan already in progress, skipping');
      return Array.from(this.priceCache.values());
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      // 1. 提取所有池子地址
      const pubkeys = this.markets.map((market) => new PublicKey(market.poolAddress));

      // 2. 批量获取账户数据
      logger.debug(`Fetching ${pubkeys.length} pool accounts...`);
      const accounts = await this.connectionPool.getMultipleAccounts(pubkeys);

      // 3. 解析每个账户
      const priceDataList: PriceData[] = [];
      
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const market = this.markets[i];

        if (!account) {
          logger.warn(`No data for pool ${market.poolAddress}`);
          continue;
        }

        // 根据DEX类型选择解析器
        let priceData: PriceData | null = null;
        
        if (market.dex === 'Raydium') {
          priceData = RaydiumParser.parse(account, market.poolAddress);
        } else {
          logger.warn(`Unsupported DEX: ${market.dex}`);
          continue;
        }

        // 验证并缓存
        if (priceData && RaydiumParser.validate(priceData)) {
          this.priceCache.set(market.poolAddress, priceData);
          priceDataList.push(priceData);
        }
      }

      const latency = Date.now() - startTime;
      logger.info(`Scan completed: ${priceDataList.length}/${this.markets.length} pools in ${latency}ms`);

      return priceDataList;
    } catch (error) {
      logger.error(`Scan failed: ${error}`);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * 获取特定池子的价格
   * @param poolAddress 池子地址
   * @returns 价格数据或undefined
   */
  getPrice(poolAddress: string): PriceData | undefined {
    return this.priceCache.get(poolAddress);
  }

  /**
   * 获取所有缓存的价格
   * @returns 价格数据数组
   */
  getAllPrices(): PriceData[] {
    return Array.from(this.priceCache.values());
  }

  /**
   * 根据代币对查找市场
   * @param baseMint Base代币地址
   * @param quoteMint Quote代币地址
   * @returns 市场配置或undefined
   */
  findMarket(baseMint: string, quoteMint: string): Market | undefined {
    return this.markets.find(
      (m) => m.baseMint === baseMint && m.quoteMint === quoteMint
    );
  }

  /**
   * 获取市场数量
   * @returns 市场数量
   */
  getMarketCount(): number {
    return this.markets.length;
  }

  /**
   * 清空价格缓存
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('Price cache cleared');
  }

  /**
   * 获取缓存统计
   * @returns 缓存统计信息
   */
  getCacheStats(): {
    size: number;
    markets: number;
    cacheRate: number;
  } {
    return {
      size: this.priceCache.size,
      markets: this.markets.length,
      cacheRate: this.priceCache.size / this.markets.length,
    };
  }

  /**
   * 检查价格数据是否过期
   * @param priceData 价格数据
   * @param maxAgeMs 最大年龄（毫秒）
   * @returns 是否过期
   */
  static isPriceStale(priceData: PriceData, maxAgeMs: number = 5000): boolean {
    const age = Date.now() - priceData.timestamp;
    return age > maxAgeMs;
  }
}

export default MarketScanner;


