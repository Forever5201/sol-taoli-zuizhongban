/**
 * Jupiter Swap集成
 * 
 * 提供真实的DEX Swap指令生成
 * 支持所有主流DEX: Raydium, Orca, Meteora等
 */

import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import { logger } from '../logger';

const jupiterLogger = logger.child({ module: 'JupiterSwap' });

/**
 * Jupiter Quote响应
 */
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

/**
 * Jupiter Swap配置
 */
export interface JupiterSwapConfig {
  /** Jupiter API URL (可选，默认使用公共API) */
  apiUrl?: string;
  /** 滑点容差（basis points，默认50 = 0.5%） */
  slippageBps?: number;
  /** 是否只使用直接路由 */
  onlyDirectRoutes?: boolean;
  /** 最大账户数限制 */
  maxAccounts?: number;
}

/**
 * Swap结果
 */
export interface SwapResult {
  /** 序列化的交易 */
  transaction: VersionedTransaction;
  /** Quote信息 */
  quote: JupiterQuote;
  /** 预期输入金额 */
  inputAmount: number;
  /** 预期输出金额 */
  outputAmount: number;
  /** 价格影响（%） */
  priceImpact: number;
  /** 使用的DEX */
  dexes: string[];
}

/**
 * Jupiter Swap客户端
 */
export class JupiterSwapClient {
  private apiUrl: string;
  private connection: Connection;
  private defaultConfig: Required<JupiterSwapConfig>;

  constructor(connection: Connection, config?: JupiterSwapConfig) {
    this.connection = connection;
    this.apiUrl = config?.apiUrl || 'https://quote-api.jup.ag/v6';
    this.defaultConfig = {
      apiUrl: this.apiUrl,
      slippageBps: config?.slippageBps || 50, // 0.5%
      onlyDirectRoutes: config?.onlyDirectRoutes || false,
      maxAccounts: config?.maxAccounts || 64,
    };

    jupiterLogger.info(`Jupiter client initialized with API: ${this.apiUrl}`);
  }

  /**
   * 获取Swap Quote
   */
  async getQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    slippageBps?: number
  ): Promise<JupiterQuote> {
    try {
      const params = new URLSearchParams({
        inputMint: inputMint.toBase58(),
        outputMint: outputMint.toBase58(),
        amount: amount.toString(),
        slippageBps: (slippageBps || this.defaultConfig.slippageBps).toString(),
        onlyDirectRoutes: this.defaultConfig.onlyDirectRoutes.toString(),
        maxAccounts: this.defaultConfig.maxAccounts.toString(),
      });

      const response = await axios.get(`${this.apiUrl}/quote?${params}`, {
        timeout: 5000,
      });

      if (!response.data) {
        throw new Error('No quote data received');
      }

      jupiterLogger.debug(`Quote received: ${response.data.outAmount} for ${amount}`);
      return response.data;
    } catch (error: any) {
      jupiterLogger.error(`Failed to get quote: ${error.message}`);
      throw new Error(`Jupiter quote failed: ${error.message}`);
    }
  }

  /**
   * 构建Swap交易
   */
  async buildSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: PublicKey,
    wrapUnwrapSOL?: boolean
  ): Promise<VersionedTransaction> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/swap`,
        {
          quoteResponse: quote,
          userPublicKey: userPublicKey.toBase58(),
          wrapAndUnwrapSol: wrapUnwrapSOL ?? true,
          // 可选：添加优先费指令（在外部添加更灵活）
          // computeUnitPriceMicroLamports: 10000,
        },
        {
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.swapTransaction) {
        throw new Error('No swap transaction received');
      }

      // 反序列化交易
      const swapTransactionBuf = Buffer.from(
        response.data.swapTransaction,
        'base64'
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      jupiterLogger.debug('Swap transaction built successfully');
      return transaction;
    } catch (error: any) {
      jupiterLogger.error(`Failed to build swap transaction: ${error.message}`);
      throw new Error(`Jupiter swap transaction failed: ${error.message}`);
    }
  }

  /**
   * 一站式获取Swap交易（Quote + Build）
   */
  async getSwapTransaction(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    userPublicKey: PublicKey,
    slippageBps?: number
  ): Promise<SwapResult> {
    const startTime = Date.now();

    try {
      // 1. 获取Quote
      const quote = await this.getQuote(
        inputMint,
        outputMint,
        amount,
        slippageBps
      );

      // 2. 构建交易
      const transaction = await this.buildSwapTransaction(
        quote,
        userPublicKey,
        true // 自动wrap/unwrap SOL
      );

      // 3. 解析DEX列表
      const dexes = quote.routePlan.map((step) => step.swapInfo.label);

      const result: SwapResult = {
        transaction,
        quote,
        inputAmount: parseInt(quote.inAmount),
        outputAmount: parseInt(quote.outAmount),
        priceImpact: quote.priceImpactPct,
        dexes: [...new Set(dexes)], // 去重
      };

      const latency = Date.now() - startTime;
      jupiterLogger.info(
        `Swap transaction ready: ${result.dexes.join(' -> ')} ` +
        `(${latency}ms, impact: ${result.priceImpact.toFixed(3)}%)`
      );

      return result;
    } catch (error: any) {
      jupiterLogger.error(`Get swap transaction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 计算价格（不构建交易，仅获取价格）
   */
  async getPrice(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number
  ): Promise<number> {
    try {
      const quote = await this.getQuote(inputMint, outputMint, amount, 50);
      const outputAmount = parseInt(quote.outAmount);
      const inputAmount = parseInt(quote.inAmount);
      
      // 返回价格比率
      return outputAmount / inputAmount;
    } catch (error) {
      jupiterLogger.error(`Failed to get price: ${error}`);
      throw error;
    }
  }

  /**
   * 验证路由是否可行
   */
  async validateRoute(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number
  ): Promise<boolean> {
    try {
      const quote = await this.getQuote(inputMint, outputMint, amount, 50);
      const outputAmount = parseInt(quote.outAmount);
      
      // 检查是否有有效输出
      return outputAmount > 0 && quote.priceImpactPct < 5.0; // 价格影响<5%
    } catch (error) {
      return false;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<JupiterSwapConfig>): void {
    if (config.apiUrl) this.apiUrl = config.apiUrl;
    if (config.slippageBps) this.defaultConfig.slippageBps = config.slippageBps;
    if (config.onlyDirectRoutes !== undefined) {
      this.defaultConfig.onlyDirectRoutes = config.onlyDirectRoutes;
    }
    if (config.maxAccounts) this.defaultConfig.maxAccounts = config.maxAccounts;

    jupiterLogger.info('Jupiter config updated');
  }
}

/**
 * 创建Jupiter客户端（工厂函数）
 */
export function createJupiterClient(
  connection: Connection,
  config?: JupiterSwapConfig
): JupiterSwapClient {
  return new JupiterSwapClient(connection, config);
}
