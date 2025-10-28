/**
 * 市场扫描器
 * 
 * 负责批量获取链上市场数据，解析价格，维护价格缓存
 */

import { PublicKey } from '@solana/web3.js';
import { ConnectionPool, createLogger } from '@solana-arb-bot/core';
import { parseTokenAccount } from './parsers/spl-token';
import type { PriceData } from './parsers/raydium';

const logger = createLogger('MarketScanner');

/**
 * Raydium AMM V4 池子状态（简化版，仅用于提取关键字段）
 */
interface RaydiumPoolState {
  status: bigint;
  coinDecimals: bigint;
  pcDecimals: bigint;
  poolCoinTokenAccount: PublicKey;
  poolPcTokenAccount: PublicKey;
}

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
      const poolPubkeys = this.markets.map((market) => new PublicKey(market.poolAddress));

      // 2. 批量获取池子账户数据
      logger.debug(`Fetching ${poolPubkeys.length} pool accounts...`);
      const poolAccounts = await this.connectionPool.getMultipleAccounts(poolPubkeys);

      // 3. 提取所有 token 账户地址（用于获取实际储备量）
      const tokenAccountPubkeys: PublicKey[] = [];
      const poolStates: (RaydiumPoolState | null)[] = [];
      
      for (let i = 0; i < poolAccounts.length; i++) {
        const account = poolAccounts[i];
        const market = this.markets[i];

        if (!account || !account.data || market.dex !== 'Raydium') {
          logger.debug(`Skipping ${market.name}: account=${!!account}, data=${!!(account?.data)}, dex=${market.dex}`);
          poolStates.push(null);
          continue;
        }

        // 解析池子状态以获取 token 账户地址
        try {
          const state = this.parseRaydiumPoolState(account.data);
          poolStates.push(state);
          
          // 添加两个 token 账户地址到批量查询列表
          tokenAccountPubkeys.push(state.poolCoinTokenAccount);
          tokenAccountPubkeys.push(state.poolPcTokenAccount);
        } catch (error) {
          logger.warn(`Failed to parse pool state for ${market.poolAddress}: ${error}`);
          poolStates.push(null);
        }
      }

      // 4. 批量获取所有 token 账户数据
      logger.debug(`Fetching ${tokenAccountPubkeys.length} token accounts...`);
      const tokenAccounts = await this.connectionPool.getMultipleAccounts(tokenAccountPubkeys);

      // 5. 解析并组合数据
      const priceDataList: PriceData[] = [];
      let tokenAccountIndex = 0;
      
      for (let i = 0; i < this.markets.length; i++) {
        const market = this.markets[i];
        const poolState = poolStates[i];

        if (!poolState) {
          continue;
        }

        // 获取对应的 token 账户（每个池子对应两个 token 账户）
        const coinTokenAccount = tokenAccounts[tokenAccountIndex];
        const pcTokenAccount = tokenAccounts[tokenAccountIndex + 1];
        tokenAccountIndex += 2;

        if (!coinTokenAccount || !pcTokenAccount) {
          logger.warn(`Missing token account data for pool ${market.poolAddress}`);
          continue;
        }

        // 解析 token 账户获取储备量
        const coinReserve = parseTokenAccount(coinTokenAccount.data);
        const pcReserve = parseTokenAccount(pcTokenAccount.data);

        if (!coinReserve || !pcReserve) {
          logger.warn(`Failed to parse token accounts for pool ${market.poolAddress}`);
          continue;
        }

        // 验证储备量非零
        if (coinReserve.amount === BigInt(0) || pcReserve.amount === BigInt(0)) {
          logger.warn(`Zero reserves for pool ${market.poolAddress}`);
          continue;
        }

        // 计算价格和流动性
        const price = this.calculatePrice(
          coinReserve.amount,
          pcReserve.amount,
          Number(poolState.coinDecimals),
          Number(poolState.pcDecimals)
        );

        const liquidity = this.estimateLiquidity(
          pcReserve.amount,
          Number(poolState.pcDecimals)
        );

        // 构建价格数据
        const priceData: PriceData = {
          dex: market.dex,
          poolAddress: market.poolAddress,
          price,
          liquidity,
          baseReserve: coinReserve.amount,
          quoteReserve: pcReserve.amount,
          baseDecimals: Number(poolState.coinDecimals),
          quoteDecimals: Number(poolState.pcDecimals),
          timestamp: Date.now(),
        };

        // 验证并缓存
        if (this.validatePriceData(priceData)) {
          this.priceCache.set(market.poolAddress, priceData);
          priceDataList.push(priceData);
          
          logger.debug(`✅ ${market.name}: ${price.toFixed(2)} (Liquidity: $${liquidity.toFixed(0)})`);
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
   * 解析 Raydium 池子状态（提取关键字段）
   */
  private parseRaydiumPoolState(data: Buffer): RaydiumPoolState {
    try {
      // 验证数据长度
      if (!data || data.length < 752) {
        throw new Error(`Invalid pool account size: ${data?.length || 0} bytes (expected >= 752)`);
      }

      let offset = 0;

      // 读取 u64
      const readU64 = (): bigint => {
        if (offset + 8 > data.length) {
          throw new Error(`Buffer overflow at offset ${offset}`);
        }
        const value = data.readBigUInt64LE(offset);
        offset += 8;
        return value;
      };

      // 读取 PublicKey
      const readPubkey = (): PublicKey => {
        if (offset + 32 > data.length) {
          throw new Error(`Buffer overflow at offset ${offset}`);
        }
        const key = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        return key;
      };

      // 解析关键字段（基于 Raydium AMM V4 布局）
      const status = readU64();           // offset 0
      readU64();                          // nonce
      readU64();                          // orderNum
      readU64();                          // depth
      const coinDecimals = readU64();     // offset 32
      const pcDecimals = readU64();       // offset 40
      
      // 继续读取必要字段直到 token 账户地址
      // offset 48-128: 其他 u64 字段 (10 * 8 = 80 bytes)
      readU64(); // state
      readU64(); // resetFlag
      readU64(); // minSize
      readU64(); // volMaxCutRatio
      readU64(); // amountWaveRatio
      readU64(); // coinLotSize
      readU64(); // pcLotSize
      readU64(); // minPriceMultiplier
      readU64(); // maxPriceMultiplier
      readU64(); // systemDecimalsValue
      // offset 现在是 128
      
      // 跳过 AMM 相关公钥到 token 账户地址 (offset 256)
      readPubkey(); // ammId (offset 128-160)
      readPubkey(); // ammAuthority (offset 160-192)
      readPubkey(); // ammOpenOrders (offset 192-224)
      readPubkey(); // ammTargetOrders (offset 224-256)
      
      // 读取 token 账户地址 (offset 256-320)
      const poolCoinTokenAccount = readPubkey();
      const poolPcTokenAccount = readPubkey();

      logger.debug(`Parsed pool state: status=${status}, coinDecimals=${coinDecimals}, pcDecimals=${pcDecimals}`);

      return {
        status,
        coinDecimals,
        pcDecimals,
        poolCoinTokenAccount,
        poolPcTokenAccount,
      };
    } catch (error) {
      logger.error(`Failed to parse Raydium pool state: ${error}`);
      logger.error(`Data buffer length: ${data?.length}, type: ${typeof data}`);
      throw error;
    }
  }

  /**
   * 计算价格
   */
  private calculatePrice(
    baseReserve: bigint,
    quoteReserve: bigint,
    baseDecimals: number,
    quoteDecimals: number
  ): number {
    if (baseReserve === BigInt(0)) {
      return 0;
    }

    const adjustedQuote = Number(quoteReserve) / Math.pow(10, quoteDecimals);
    const adjustedBase = Number(baseReserve) / Math.pow(10, baseDecimals);

    return adjustedQuote / adjustedBase;
  }

  /**
   * 估算流动性（假设 quote 是稳定币）
   */
  private estimateLiquidity(
    quoteReserve: bigint,
    quoteDecimals: number
  ): number {
    const quoteInUSD = Number(quoteReserve) / Math.pow(10, quoteDecimals);
    return quoteInUSD * 2; // TVL ≈ 2x quote reserve
  }

  /**
   * 验证价格数据
   */
  private validatePriceData(priceData: PriceData): boolean {
    // 检查价格是否合理
    if (priceData.price <= 0 || !isFinite(priceData.price)) {
      logger.warn(`Invalid price: ${priceData.price}`);
      return false;
    }

    // 检查流动性
    if (priceData.liquidity < 0) {
      logger.warn(`Invalid liquidity: ${priceData.liquidity}`);
      return false;
    }

    // 检查储备量
    if (priceData.baseReserve <= BigInt(0) || priceData.quoteReserve <= BigInt(0)) {
      logger.warn('Invalid reserves');
      return false;
    }

    return true;
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


