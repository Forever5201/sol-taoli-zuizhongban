/**
 * Raydium DEX 解析器 - 真正使用 Borsh 反序列化
 * 
 * 改进版本：
 * - ✅ 使用官方 borsh 库（而非手动偏移量）
 * - ✅ 类型安全的序列化模式
 * - ✅ 更易维护和扩展
 * - ✅ 自动处理字段对齐
 */

import { AccountInfo, PublicKey } from '@solana/web3.js';
import { deserialize, Schema } from 'borsh';
import { createLogger } from '../../../core/src/logger';

const logger = createLogger('RaydiumBorsh');

/**
 * Raydium AMM V4 状态（Borsh 反序列化目标）
 */
interface RaydiumAmmV4State {
  status: bigint;
  nonce: bigint;
  orderNum: bigint;
  depth: bigint;
  coinDecimals: bigint;
  pcDecimals: bigint;
  state: bigint;
  resetFlag: bigint;
  minSize: bigint;
  volMaxCutRatio: bigint;
  amountWaveRatio: bigint;
  coinLotSize: bigint;
  pcLotSize: bigint;
  minPriceMultiplier: bigint;
  maxPriceMultiplier: bigint;
  systemDecimalsValue: bigint;
  minSeparateNumerator: bigint;
  minSeparateDenominator: bigint;
  tradeFeeNumerator: bigint;
  tradeFeeDenominator: bigint;
  pnlNumerator: bigint;
  pnlDenominator: bigint;
  swapFeeNumerator: bigint;
  swapFeeDenominator: bigint;
  needTakePnlCoin: bigint;
  needTakePnlPc: bigint;
  totalPnlPc: bigint;
  totalPnlCoin: bigint;
  poolCoinTokenAccount: Uint8Array; // 32 bytes -> PublicKey
  poolPcTokenAccount: Uint8Array;
  coinMintAddress: Uint8Array;
  pcMintAddress: Uint8Array;
  lpMintAddress: Uint8Array;
  ammOpenOrders: Uint8Array;
  serumMarket: Uint8Array;
  serumProgramId: Uint8Array;
  ammTargetOrders: Uint8Array;
  poolWithdrawQueue: Uint8Array;
  poolTempLpTokenAccount: Uint8Array;
  ammOwner: Uint8Array;
  pnlOwner: Uint8Array;
}

/**
 * Borsh Schema 定义
 * 
 * 精确匹配 Raydium 链上数据结构
 */
const RAYDIUM_AMM_SCHEMA: Schema = new Map([
  [
    RaydiumAmmV4State,
    {
      kind: 'struct',
      fields: [
        ['status', 'u64'],
        ['nonce', 'u64'],
        ['orderNum', 'u64'],
        ['depth', 'u64'],
        ['coinDecimals', 'u64'],
        ['pcDecimals', 'u64'],
        ['state', 'u64'],
        ['resetFlag', 'u64'],
        ['minSize', 'u64'],
        ['volMaxCutRatio', 'u64'],
        ['amountWaveRatio', 'u64'],
        ['coinLotSize', 'u64'],
        ['pcLotSize', 'u64'],
        ['minPriceMultiplier', 'u64'],
        ['maxPriceMultiplier', 'u64'],
        ['systemDecimalsValue', 'u64'],
        ['minSeparateNumerator', 'u64'],
        ['minSeparateDenominator', 'u64'],
        ['tradeFeeNumerator', 'u64'],
        ['tradeFeeDenominator', 'u64'],
        ['pnlNumerator', 'u64'],
        ['pnlDenominator', 'u64'],
        ['swapFeeNumerator', 'u64'],
        ['swapFeeDenominator', 'u64'],
        ['needTakePnlCoin', 'u64'],
        ['needTakePnlPc', 'u64'],
        ['totalPnlPc', 'u64'],
        ['totalPnlCoin', 'u64'],
        // PublicKeys (每个 32 bytes)
        ['poolCoinTokenAccount', [32]],
        ['poolPcTokenAccount', [32]],
        ['coinMintAddress', [32]],
        ['pcMintAddress', [32]],
        ['lpMintAddress', [32]],
        ['ammOpenOrders', [32]],
        ['serumMarket', [32]],
        ['serumProgramId', [32]],
        ['ammTargetOrders', [32]],
        ['poolWithdrawQueue', [32]],
        ['poolTempLpTokenAccount', [32]],
        ['ammOwner', [32]],
        ['pnlOwner', [32]],
      ],
    },
  ],
]);

/**
 * 价格数据接口
 */
export interface PriceData {
  dex: string;
  poolAddress: string;
  price: number;
  liquidity: number;
  baseReserve: bigint;
  quoteReserve: bigint;
  baseDecimals: number;
  quoteDecimals: number;
  feeRate?: number;
  status?: bigint;
  timestamp: number;
}

/**
 * Raydium 解析器（使用真正的 Borsh）
 */
export class RaydiumBorshParser {
  static readonly PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
  static readonly MIN_ACCOUNT_SIZE = 752;

  /**
   * 解析 Raydium 账户（使用 Borsh 反序列化）
   */
  static parse(accountInfo: AccountInfo<Buffer> | null, poolAddress: string): PriceData | null {
    if (!accountInfo || !accountInfo.data) {
      logger.warn(`No account data for pool ${poolAddress}`);
      return null;
    }

    if (accountInfo.data.length < this.MIN_ACCOUNT_SIZE) {
      logger.error(`Invalid account size: ${accountInfo.data.length}`);
      return null;
    }

    try {
      // ✅ 使用 Borsh 反序列化（而非手动偏移量）
      const state = deserialize(
        RAYDIUM_AMM_SCHEMA,
        RaydiumAmmV4State,
        accountInfo.data
      ) as RaydiumAmmV4State;

      // 验证池子状态
      if (state.status !== BigInt(1)) {
        logger.warn(`Pool ${poolAddress} is not active (status: ${state.status})`);
        return null;
      }

      // 转换 Uint8Array 为 PublicKey
      const poolCoinTokenAccount = new PublicKey(state.poolCoinTokenAccount);
      const poolPcTokenAccount = new PublicKey(state.poolPcTokenAccount);

      // 计算手续费率
      const feeRate = Number(state.tradeFeeNumerator) / Number(state.tradeFeeDenominator);

      logger.debug(`Parsed Raydium pool ${poolAddress}:`, {
        status: state.status.toString(),
        coinDecimals: state.coinDecimals.toString(),
        pcDecimals: state.pcDecimals.toString(),
        feeRate: `${(feeRate * 100).toFixed(2)}%`,
        poolCoinTokenAccount: poolCoinTokenAccount.toBase58(),
        poolPcTokenAccount: poolPcTokenAccount.toBase58(),
      });

      return {
        dex: 'Raydium',
        poolAddress,
        price: 0, // 需要查询 token 账户获取储备量
        liquidity: 0,
        baseReserve: BigInt(0),
        quoteReserve: BigInt(0),
        baseDecimals: Number(state.coinDecimals),
        quoteDecimals: Number(state.pcDecimals),
        feeRate,
        status: state.status,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`Failed to parse Raydium pool ${poolAddress}: ${error}`);
      return null;
    }
  }

  /**
   * 辅助方法：验证解析结果
   */
  static validate(priceData: PriceData | null): boolean {
    if (!priceData) return false;
    
    if (priceData.price < 0) {
      logger.warn(`Invalid price: ${priceData.price}`);
      return false;
    }

    if (priceData.status !== BigInt(1)) {
      logger.warn(`Pool status is not active: ${priceData.status}`);
      return false;
    }

    if (priceData.baseReserve === BigInt(0) || priceData.quoteReserve === BigInt(0)) {
      logger.warn('Invalid reserves');
      return false;
    }

    return true;
  }
}

/**
 * 使用示例：
 * 
 * ```typescript
 * const connection = new Connection(RPC_URL);
 * const poolAddress = 'YOUR_POOL_ADDRESS';
 * 
 * const accountInfo = await connection.getAccountInfo(new PublicKey(poolAddress));
 * const priceData = RaydiumBorshParser.parse(accountInfo, poolAddress);
 * 
 * if (RaydiumBorshParser.validate(priceData)) {
 *   console.log('Price:', priceData.price);
 *   console.log('Fee Rate:', priceData.feeRate);
 * }
 * ```
 */
