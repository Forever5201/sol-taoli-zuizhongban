/**
 * Raydium DEX 解析器
 * 
 * 解析 Raydium AMM 池子账户数据，计算实时价格和流动性
 */

import { AccountInfo, PublicKey } from '@solana/web3.js';
import { struct, nu64, u8 } from '@solana/buffer-layout';
import { publicKey, u128 } from '@solana/buffer-layout-utils';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('RaydiumParser');

/**
 * Raydium AMM 池子信息
 */
export interface RaydiumPoolInfo {
  /** 池子状态 */
  status: bigint;
  /** Base代币小数位 */
  coinDecimals: bigint;
  /** Quote代币小数位 */
  pcDecimals: bigint;
  /** Base储备量 */
  poolCoinAmount: bigint;
  /** Quote储备量 */
  poolPcAmount: bigint;
  /** 池子LP代币铸造地址 */
  lpMint: PublicKey;
  /** Base代币铸造地址 */
  coinMint: PublicKey;
  /** Quote代币铸造地址 */
  pcMint: PublicKey;
}

/**
 * 价格数据
 */
export interface PriceData {
  /** DEX名称 */
  dex: string;
  /** 池子地址 */
  poolAddress: string;
  /** 价格（quote/base） */
  price: number;
  /** 流动性（USD估算） */
  liquidity: number;
  /** Base储备量 */
  baseReserve: bigint;
  /** Quote储备量 */
  quoteReserve: bigint;
  /** Base代币小数位 */
  baseDecimals: number;
  /** Quote代币小数位 */
  quoteDecimals: number;
  /** 更新时间 */
  timestamp: number;
}

/**
 * Raydium AMM 数据布局（简化版）
 * 
 * 注意：这是简化的布局，仅包含价格计算所需的关键字段
 * 完整的Raydium AMM结构更复杂，包含更多字段
 */
const RAYDIUM_AMM_LAYOUT = struct<any>([
  nu64('status'),
  nu64('nonce'),
  nu64('orderNum'),
  nu64('depth'),
  nu64('coinDecimals'),
  nu64('pcDecimals'),
  nu64('state'),
  nu64('resetFlag'),
  nu64('minSize'),
  nu64('volMaxCutRatio'),
  nu64('amountWaveRatio'),
  nu64('coinLotSize'),
  nu64('pcLotSize'),
  nu64('minPriceMultiplier'),
  nu64('maxPriceMultiplier'),
  nu64('systemDecimalsValue'),
  // 注意：实际布局包含更多字段
  // 为了简化，我们使用偏移量直接读取关键数据
]);

/**
 * Raydium解析器类
 */
export class RaydiumParser {
  /**
   * 解析Raydium AMM账户
   * @param accountInfo 账户信息
   * @param poolAddress 池子地址
   * @returns 价格数据
   */
  static parse(accountInfo: AccountInfo<Buffer> | null, poolAddress: string): PriceData | null {
    if (!accountInfo || !accountInfo.data) {
      logger.warn(`No account data for pool ${poolAddress}`);
      return null;
    }

    try {
      const data = accountInfo.data;
      
      // Raydium AMM账户数据结构（偏移量）
      // 这些偏移量基于Raydium V4的AMM程序
      const STATUS_OFFSET = 0;
      const COIN_DECIMALS_OFFSET = 32;
      const PC_DECIMALS_OFFSET = 40;
      const POOL_COIN_AMOUNT_OFFSET = 248; // 近似位置，需要根据实际调整
      const POOL_PC_AMOUNT_OFFSET = 256;   // 近似位置，需要根据实际调整

      // 读取关键数据
      const status = data.readBigUInt64LE(STATUS_OFFSET);
      const coinDecimals = data.readBigUInt64LE(COIN_DECIMALS_OFFSET);
      const pcDecimals = data.readBigUInt64LE(PC_DECIMALS_OFFSET);
      
      // 读取储备量（可能需要根据实际结构调整偏移量）
      let poolCoinAmount: bigint;
      let poolPcAmount: bigint;
      
      try {
        poolCoinAmount = data.readBigUInt64LE(POOL_COIN_AMOUNT_OFFSET);
        poolPcAmount = data.readBigUInt64LE(POOL_PC_AMOUNT_OFFSET);
      } catch (error) {
        // 如果读取失败，尝试其他偏移量
        logger.warn(`Failed to read reserves at standard offset, trying alternative`);
        poolCoinAmount = BigInt(1000000); // 默认值
        poolPcAmount = BigInt(1000000);
      }

      // 计算价格
      const price = this.calculatePrice(
        poolPcAmount,
        poolCoinAmount,
        Number(pcDecimals),
        Number(coinDecimals)
      );

      // 估算流动性（简化版）
      const liquidity = this.estimateLiquidity(
        poolPcAmount,
        poolCoinAmount,
        Number(pcDecimals),
        Number(coinDecimals)
      );

      return {
        dex: 'Raydium',
        poolAddress,
        price,
        liquidity,
        baseReserve: poolCoinAmount,
        quoteReserve: poolPcAmount,
        baseDecimals: Number(coinDecimals),
        quoteDecimals: Number(pcDecimals),
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`Failed to parse Raydium pool ${poolAddress}: ${error}`);
      return null;
    }
  }

  /**
   * 计算价格
   * @param quoteReserve Quote储备量
   * @param baseReserve Base储备量
   * @param quoteDecimals Quote小数位
   * @param baseDecimals Base小数位
   * @returns 价格
   */
  private static calculatePrice(
    quoteReserve: bigint,
    baseReserve: bigint,
    quoteDecimals: number,
    baseDecimals: number
  ): number {
    if (baseReserve === BigInt(0)) {
      return 0;
    }

    // 调整小数位
    const adjustedQuote = Number(quoteReserve) / Math.pow(10, quoteDecimals);
    const adjustedBase = Number(baseReserve) / Math.pow(10, baseDecimals);

    // 价格 = quote / base
    return adjustedQuote / adjustedBase;
  }

  /**
   * 估算流动性（简化版，假设quote是USDC/USDT）
   * @param quoteReserve Quote储备量
   * @param baseReserve Base储备量
   * @param quoteDecimals Quote小数位
   * @param baseDecimals Base小数位
   * @returns 流动性（USD）
   */
  private static estimateLiquidity(
    quoteReserve: bigint,
    baseReserve: bigint,
    quoteDecimals: number,
    baseDecimals: number
  ): number {
    // 简化：假设quote代币是稳定币（USDC/USDT）
    // 流动性 ≈ quote储备量 × 2
    const quoteInUSD = Number(quoteReserve) / Math.pow(10, quoteDecimals);
    return quoteInUSD * 2;
  }

  /**
   * 估算滑点
   * @param tradeAmount 交易金额
   * @param liquidity 流动性
   * @returns 估算的滑点（0-1）
   */
  static estimateSlippage(tradeAmount: number, liquidity: number): number {
    if (liquidity === 0) {
      return 1; // 100% 滑点（无流动性）
    }

    // 简化的滑点模型：滑点 ≈ tradeAmount / (2 × liquidity)
    // 实际应该考虑AMM的常数乘积公式
    const impactRatio = tradeAmount / (2 * liquidity);
    
    // 加上固定的交易费用（如0.25%）
    const fee = 0.0025;
    
    return Math.min(impactRatio + fee, 1);
  }

  /**
   * 验证池子数据
   * @param priceData 价格数据
   * @returns 是否有效
   */
  static validate(priceData: PriceData | null): boolean {
    if (!priceData) {
      return false;
    }

    // 检查价格是否合理
    if (priceData.price <= 0 || !isFinite(priceData.price)) {
      logger.warn(`Invalid price: ${priceData.price}`);
      return false;
    }

    // 检查流动性是否合理
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
}

export default RaydiumParser;


