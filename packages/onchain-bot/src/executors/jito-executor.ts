/**
 * Jito执行器
 * 
 * 通过Jito MEV优先通道执行交易，提供更高的成功率
 * 设计文档：第3.3节 - 路径A: Jito优先通道
 * 
 * 核心优势：
 * - 优先打包（80-95%成功率 vs 50-60% RPC Spam）
 * - 失败不收费
 * - 动态小费优化（集成JitoTipOptimizer）
 * - 验证者直接通道
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  TransactionSignature,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { JitoTipOptimizer, createLogger } from '@solana-arb-bot/core';
import type { TransactionResult } from '@solana-arb-bot/core';
import { JitoLeaderScheduler } from './jito-leader-scheduler';

const logger = createLogger('JitoExecutor');

/**
 * Jito Tip账户列表
 * 来源：https://jito-labs.gitbook.io/mev/searcher-resources/tips
 */
const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

/**
 * Jito配置
 */
export interface JitoExecutorConfig {
  /** Block Engine URL */
  blockEngineUrl: string;
  /** 认证密钥对（可选） */
  authKeypair?: Keypair;
  /** 最大重试次数 */
  maxRetries?: number;
  /** Bundle确认超时（ms） */
  confirmationTimeout?: number;
  /** 是否启用Jito领导者检查 */
  checkJitoLeader?: boolean;
  /** 最小小费（lamports） */
  minTipLamports?: number;
  /** 最大小费（lamports） */
  maxTipLamports?: number;
  /** 资金量级 */
  capitalSize?: 'small' | 'medium' | 'large';
  /** 利润分成比例（0-1） */
  profitSharePercentage?: number;
  /** 竞争强度倍数 */
  competitionMultiplier?: number;
  /** 紧迫性倍数 */
  urgencyMultiplier?: number;
  /** 是否使用历史学习 */
  useHistoricalLearning?: boolean;
  /** 🔥 深度模拟模式：执行所有步骤直到发送Bundle，但不实际发送到链上 */
  simulateToBundle?: boolean;
  /** 历史数据权重（0-1） */
  historicalWeight?: number;
}

/**
 * Bundle执行结果
 */
export interface BundleExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** Bundle ID */
  bundleId?: string;
  /** 交易签名 */
  signature?: TransactionSignature;
  /** 使用的小费（lamports） */
  tipUsed: number;
  /** 总延迟（ms） */
  latency: number;
  /** 错误信息 */
  error?: string;
  /** Bundle状态 */
  bundleStatus?: string;
}

/**
 * 竞争评估指标
 */
interface CompetitionMetrics {
  /** 交易对热度（0-1） */
  pairPopularity: number;
  /** 历史套利频率（0-1） */
  historicalArbFrequency: number;
  /** 利润大小因子（0-1） */
  profitSizeFactor: number;
}

/**
 * Jito执行器类
 */
export class JitoExecutor {
  private connection: Connection;
  private wallet: Keypair;
  private config: Required<JitoExecutorConfig>;
  private jitoTipOptimizer: JitoTipOptimizer;
  private client: ReturnType<typeof searcherClient>;
  private leaderScheduler?: JitoLeaderScheduler;
  
  // 统计数据
  private stats = {
    totalBundles: 0,
    successfulBundles: 0,
    failedBundles: 0,
    totalTipSpent: 0,
    totalProfit: 0,
    leaderCheckSkips: 0,  // Leader 检查导致的跳过次数
  };

  constructor(
    connection: Connection,
    wallet: Keypair,
    jitoTipOptimizer: JitoTipOptimizer,
    config: JitoExecutorConfig
  ) {
    this.connection = connection;
    this.wallet = wallet;
    
    this.config = {
      blockEngineUrl: config.blockEngineUrl,
      authKeypair: config.authKeypair || wallet,
      maxRetries: config.maxRetries || 3,
      confirmationTimeout: config.confirmationTimeout || 30000,
      checkJitoLeader: config.checkJitoLeader !== false,
      minTipLamports: config.minTipLamports || 1_000, // 0.000001 SOL
      maxTipLamports: config.maxTipLamports || 100_000_000, // 0.1 SOL
      capitalSize: config.capitalSize || 'medium',
      profitSharePercentage: config.profitSharePercentage ?? 0.35, // 35% 激进策略
      competitionMultiplier: config.competitionMultiplier ?? 2.5,
      urgencyMultiplier: config.urgencyMultiplier ?? 1.8,
      useHistoricalLearning: config.useHistoricalLearning !== false,
      historicalWeight: config.historicalWeight ?? 0.4,
      simulateToBundle: config.simulateToBundle || false,  // 🔥 深度模拟模式，默认关闭
    };
    
    // 初始化或使用传入的 JitoTipOptimizer
    if (jitoTipOptimizer) {
      this.jitoTipOptimizer = jitoTipOptimizer;
    } else {
      // 如果没有传入，使用配置创建新实例
      this.jitoTipOptimizer = new JitoTipOptimizer({
        minTipLamports: this.config.minTipLamports,
        maxTipLamports: this.config.maxTipLamports,
        profitSharePercentage: this.config.profitSharePercentage,
        competitionMultiplier: this.config.competitionMultiplier,
        urgencyMultiplier: this.config.urgencyMultiplier,
        useHistoricalLearning: this.config.useHistoricalLearning,
        historicalWeight: this.config.historicalWeight,
      });
    }

    // 初始化Jito客户端
    this.client = searcherClient(
      this.config.blockEngineUrl,
      this.config.authKeypair
    );

    // 初始化 Leader 调度器（如果启用）
    if (this.config.checkJitoLeader) {
      this.leaderScheduler = new JitoLeaderScheduler(
        this.connection,
        this.client,
        {
          maxAcceptableWaitSlots: 5,
          enableCache: true,
        }
      );
      logger.info('✅ Jito Leader Scheduler enabled (4x success rate boost expected)');
    } else {
      logger.warn('⚠️  Jito Leader Scheduler disabled (success rate will be lower)');
    }

    logger.info(
      `Jito executor initialized | Block Engine: ${config.blockEngineUrl} | ` +
      `Min Tip: ${this.config.minTipLamports} lamports | ` +
      `Max Tip: ${this.config.maxTipLamports} lamports | ` +
      `Leader Check: ${this.config.checkJitoLeader ? 'ON' : 'OFF'}`
    );
  }

  /**
   * 执行套利交易
   * @param arbitrageTx 套利交易
   * @param expectedProfit 预期利润（lamports）
   * @param competitionLevel 竞争强度（0-1）
   * @param urgency 紧迫性（0-1）
   * @returns 执行结果
   */
  async execute(
    arbitrageTx: Transaction | VersionedTransaction,
    expectedProfit: number,
    competitionLevel: number = 0.5,
    urgency: number = 0.7
  ): Promise<BundleExecutionResult> {
    const startTime = Date.now();
    this.stats.totalBundles++;

    try {
      // 1. 检查 Jito Leader（关键：避免浪费 tip）
      if (this.config.checkJitoLeader && this.leaderScheduler) {
        const leaderInfo = await this.leaderScheduler.shouldSendBundle();
        
        if (!leaderInfo.shouldSend) {
          this.stats.leaderCheckSkips++;
          logger.debug(
            `⏭️  Skipping bundle: ${leaderInfo.reason} ` +
            `(${this.stats.leaderCheckSkips} skips total)`
          );
          
          // 直接返回，不浪费 tip
          return {
            success: false,
            tipUsed: 0,
            latency: Date.now() - startTime,
            error: `Not Jito Leader slot: ${leaderInfo.reason}`,
            bundleStatus: 'skipped',
          };
        }

        // 是 Jito Leader，继续执行
        logger.debug(
          `✅ Jito Leader check passed: ${leaderInfo.reason}`
        );
      }

      // 2. 计算最优小费（传递 tokenPair 以支持历史学习）
      // TODO: 从上下文中获取真实的 tokenPair
      const tokenPair = 'UNKNOWN'; // 暂时使用占位符
      const optimalTip = await this.calculateOptimalTip(
        expectedProfit,
        competitionLevel,
        urgency,
        tokenPair
      );

      if (optimalTip < this.config.minTipLamports) {
        throw new Error(
          `Calculated tip ${optimalTip} is below minimum ${this.config.minTipLamports}`
        );
      }

      if (optimalTip > this.config.maxTipLamports) {
        logger.warn(
          `Calculated tip ${optimalTip} exceeds maximum ${this.config.maxTipLamports}, capping`
        );
      }

      const tipToUse = Math.min(optimalTip, this.config.maxTipLamports);

      logger.info(
        `Executing bundle | Expected Profit: ${expectedProfit} lamports | ` +
        `Tip: ${tipToUse} lamports | Competition: ${(competitionLevel * 100).toFixed(1)}%`
      );

      // 3. 构建Bundle
      const bundle = await this.buildBundle(arbitrageTx, tipToUse);

      // 🔥 深度模拟模式：显示bundle详情但不发送
      if (this.config.simulateToBundle) {
        const latency = Date.now() - startTime;
        logger.info('🎭 [SIMULATE_TO_BUNDLE] Bundle built successfully but NOT sending to chain');
        logger.info(`📦 Bundle Details:`);
        logger.info(`   - Tip: ${tipToUse} lamports (${(tipToUse / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
        logger.info(`   - Expected Profit: ${expectedProfit} lamports (${(expectedProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
        logger.info(`   - Net Profit: ${expectedProfit - tipToUse} lamports (${((expectedProfit - tipToUse) / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
        logger.info(`   - Latency (build only): ${latency}ms`);
        logger.info(`   - Bundle: Successfully constructed with arbitrage + tip transactions`);
        
        // 记录模拟成功到统计
        this.stats.successfulBundles++;
        
        // 返回模拟成功
        return {
          success: true,
          bundleId: 'SIMULATED',
          signature: 'SIMULATED_NOT_SENT',
          tipUsed: tipToUse,
          latency,
          bundleStatus: 'simulated',
        };
      }

      // 4. 发送Bundle（真实模式）
      const bundleId = await this.sendBundle(bundle);
      
      logger.info(`Bundle sent successfully | ID: ${bundleId}`);

      // 5. 等待Bundle确认
      const bundleStatus = await this.waitForBundleConfirmation(bundleId);

      const latency = Date.now() - startTime;

      if (bundleStatus.success) {
        this.stats.successfulBundles++;
        this.stats.totalTipSpent += tipToUse;
        this.stats.totalProfit += (expectedProfit - tipToUse);

        // 记录成功结果到JitoTipOptimizer（历史学习）
        this.jitoTipOptimizer.recordBundleResult({
          bundleId,
          tip: tipToUse,
          success: true,
          profit: expectedProfit,
          tokenPair: tokenPair || 'UNKNOWN',
          timestamp: Date.now(),
        });

        logger.info(
          `✅ Bundle landed successfully! | ` +
          `Signature: ${bundleStatus.signature} | ` +
          `Net Profit: ${expectedProfit - tipToUse} lamports | ` +
          `Latency: ${latency}ms`
        );

        return {
          success: true,
          bundleId,
          signature: bundleStatus.signature,
          tipUsed: tipToUse,
          latency,
          bundleStatus: bundleStatus.status,
        };
      } else {
        this.stats.failedBundles++;

        // 记录失败结果（历史学习）
        this.jitoTipOptimizer.recordBundleResult({
          bundleId,
          tip: tipToUse,
          success: false,
          profit: 0,
          tokenPair: tokenPair || 'UNKNOWN',
          timestamp: Date.now(),
        });

        logger.warn(
          `❌ Bundle failed to land | ` +
          `ID: ${bundleId} | Status: ${bundleStatus.status} | ` +
          `Latency: ${latency}ms`
        );

        return {
          success: false,
          bundleId,
          tipUsed: tipToUse,
          latency,
          error: bundleStatus.error,
          bundleStatus: bundleStatus.status,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      this.stats.failedBundles++;

      logger.error(`Bundle execution failed: ${error}`);

      return {
        success: false,
        tipUsed: 0,
        latency,
        error: String(error),
      };
    }
  }

  /**
   * 执行VersionedTransaction（用于Jupiter Swap）
   */
  async executeVersionedTransaction(
    versionedTx: VersionedTransaction,
    expectedProfit: number,
    competitionLevel: number = 0.5,
    urgency: number = 0.7
  ): Promise<TransactionResult> {
    const result = await this.execute(versionedTx, expectedProfit, competitionLevel, urgency);
    
    return {
      success: result.success,
      signature: result.signature,
      profit: result.success ? expectedProfit - result.tipUsed : 0,
      cost: result.tipUsed,
      timestamp: Date.now(),
      error: result.error,
    };
  }

  /**
   * 执行交易并转换为TransactionResult格式
   */
  async executeAndConvert(
    arbitrageTx: Transaction | VersionedTransaction,
    expectedProfit: number,
    competitionLevel: number = 0.5,
    urgency: number = 0.7
  ): Promise<TransactionResult> {
    const result = await this.execute(arbitrageTx, expectedProfit, competitionLevel, urgency);

    return {
      success: result.success,
      profit: result.success ? expectedProfit - result.tipUsed : undefined,
      cost: result.tipUsed,
      signature: result.signature,
      timestamp: Date.now(),
      error: result.error,
    };
  }

  /**
   * 构建Jito Bundle
   * @param arbitrageTx 套利交易
   * @param tipLamports 小费金额
   * @returns Bundle对象
   */
  private async buildBundle(
    arbitrageTx: Transaction | VersionedTransaction,
    tipLamports: number
  ): Promise<Bundle> {
    // 1. 转换并签名套利交易
    let versionedArbitrageTx: VersionedTransaction;
    
    if (arbitrageTx instanceof Transaction) {
      // 将Transaction转换为VersionedTransaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: arbitrageTx.instructions,
      }).compileToV0Message();
      
      versionedArbitrageTx = new VersionedTransaction(messageV0);
      versionedArbitrageTx.sign([this.wallet]);
    } else {
      versionedArbitrageTx = arbitrageTx;
      // 确保已签名
      if (!versionedArbitrageTx.signatures || versionedArbitrageTx.signatures.length === 0) {
        versionedArbitrageTx.sign([this.wallet]);
      }
    }

    // 2. 创建小费交易
    const tipTx = await this.createTipTransaction(tipLamports);

    // 3. 构建Bundle
    const bundle = new Bundle(
      [versionedArbitrageTx, tipTx],
      5 // 最多尝试5个slot
    );

    return bundle;
  }

  /**
   * 创建小费交易
   * @param tipLamports 小费金额
   * @returns 小费交易
   */
  private async createTipTransaction(tipLamports: number): Promise<VersionedTransaction> {
    const tipAccount = this.selectTipAccount();
    
    const tipInstruction = SystemProgram.transfer({
      fromPubkey: this.wallet.publicKey,
      toPubkey: new PublicKey(tipAccount),
      lamports: tipLamports,
    });

    const { blockhash } = await this.connection.getLatestBlockhash();

    // 创建TransactionMessage并转换为VersionedTransaction
    const messageV0 = new TransactionMessage({
      payerKey: this.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [tipInstruction],
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([this.wallet]);

    return versionedTx;
  }

  /**
   * 随机选择一个Jito Tip账户
   * @returns Tip账户地址
   */
  private selectTipAccount(): string {
    const randomIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
    return JITO_TIP_ACCOUNTS[randomIndex];
  }

  /**
   * 发送Bundle
   * @param bundle Bundle对象
   * @returns Bundle ID
   */
  private async sendBundle(bundle: Bundle): Promise<string> {
    try {
      const bundleId = await this.client.sendBundle(bundle);
      return bundleId;
    } catch (error) {
      logger.error(`Failed to send bundle: ${error}`);
      throw error;
    }
  }

  /**
   * 等待Bundle确认（优化版：WebSocket + 轮询双保险）
   * @param bundleId Bundle ID
   * @returns Bundle状态
   */
  private async waitForBundleConfirmation(bundleId: string): Promise<{
    success: boolean;
    signature?: TransactionSignature;
    status: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const timeout = this.config.confirmationTimeout;

    // 尝试从 Bundle 状态中提取第一个交易签名
    let transactionSignature: string | undefined;

    // 首先快速查询一次获取交易签名
    try {
      const statuses = await (this.client as any).getBundleStatuses?.([bundleId]);
      if (statuses?.value?.[0]?.transactions?.[0]) {
        transactionSignature = statuses.value[0].transactions[0];
      }
    } catch (error) {
      // 如果获取失败，回退到轮询模式
      logger.debug(`Failed to get transaction signature from bundle: ${error}`);
    }

    // 如果获取到了交易签名，使用 WebSocket 订阅（更快）
    if (transactionSignature) {
      try {
        logger.debug(`Using WebSocket subscription for signature: ${transactionSignature}`);
        return await this.waitViaWebSocket(transactionSignature, timeout);
      } catch (error) {
        logger.debug(`WebSocket subscription failed, falling back to polling: ${error}`);
        // WebSocket 失败，继续使用轮询
      }
    }

    // 回退到轮询模式
    logger.debug('Using polling mode for bundle confirmation');
    return await this.waitViaPolling(bundleId, timeout);
  }

  /**
   * 通过 WebSocket 等待确认（新增方法）
   * 优化：实时接收交易确认，无轮询延迟
   */
  private async waitViaWebSocket(
    signature: string, 
    timeout: number
  ): Promise<{
    success: boolean;
    signature?: string;
    status: string;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.connection.removeSignatureListener(subscriptionId);
        reject(new Error('WebSocket confirmation timeout'));
      }, timeout);

      const subscriptionId = this.connection.onSignature(
        signature,
        (result, context) => {
          clearTimeout(timeoutId);
          this.connection.removeSignatureListener(subscriptionId);
          
          if (result.err) {
            resolve({
              success: false,
              status: 'failed',
              error: JSON.stringify(result.err),
            });
          } else {
            resolve({
              success: true,
              signature: signature,
              status: 'processed',
            });
          }
        },
        'processed' // 优化：使用 processed 级别（节省 200-400ms）
      );
    });
  }

  /**
   * 通过轮询等待确认（保留原有逻辑作为回退）
   */
  private async waitViaPolling(
    bundleId: string,
    timeout: number
  ): Promise<{
    success: boolean;
    signature?: string;
    status: string;
    error?: string;
  }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // jito-ts@3.0.1 API可能不同，使用类型any暂时绕过
        const statuses = await (this.client as any).getBundleStatuses?.([bundleId]);
        
        if (statuses && statuses.value && statuses.value.length > 0) {
          const bundleStatus = statuses.value[0];
          
          // 优化：接受 processed 或 confirmed 级别（节省 200-400ms）
          // processed: 交易已被接受并包含在区块中
          // confirmed: 交易已获得 2/3 验证者确认
          if (bundleStatus.confirmation_status === 'processed' || 
              bundleStatus.confirmation_status === 'confirmed') {
            return {
              success: true,
              signature: bundleStatus.transactions?.[0],
              status: bundleStatus.confirmation_status,
            };
          }
          
          if (bundleStatus.err) {
            return {
              success: false,
              status: 'failed',
              error: JSON.stringify(bundleStatus.err),
            };
          }
        }

        // 优化：缩短轮询间隔至 200ms（节省 100-300ms）
        // 更快检测到 Bundle 确认状态
        await this.sleep(200);
      } catch (error) {
        logger.debug(`Error checking bundle status: ${error}`);
      }
    }

    return {
      success: false,
      status: 'timeout',
      error: 'Bundle confirmation timeout',
    };
  }

  /**
   * 计算最优小费（增强版 - 添加日志和 tokenPair 支持）
   * @param expectedProfit 预期利润
   * @param competitionLevel 竞争强度（0-1）
   * @param urgency 紧迫性（0-1）
   * @param tokenPair 交易对（用于历史学习）
   * @returns 最优小费金额
   */
  private async calculateOptimalTip(
    expectedProfit: number,
    competitionLevel: number,
    urgency: number,
    tokenPair: string = 'UNKNOWN'
  ): Promise<number> {
    // 记录决策输入
    logger.debug(
      `Calculating tip | Profit: ${expectedProfit} lamports (${(expectedProfit / 1e9).toFixed(6)} SOL) | ` +
      `Competition: ${(competitionLevel * 100).toFixed(1)}% | ` +
      `Urgency: ${(urgency * 100).toFixed(1)}% | ` +
      `TokenPair: ${tokenPair}`
    );

    // 使用 JitoTipOptimizer 计算最优 tip
    const optimalTip = await this.jitoTipOptimizer.calculateOptimalTip(
      expectedProfit,
      competitionLevel,
      urgency,
      this.config.capitalSize,
      tokenPair
    );

    // 记录决策输出
    logger.info(
      `Tip calculated | Amount: ${optimalTip} lamports (${(optimalTip / 1e9).toFixed(6)} SOL) | ` +
      `Profit Share: ${((optimalTip / expectedProfit) * 100).toFixed(1)}% | ` +
      `TokenPair: ${tokenPair}`
    );

    return optimalTip;
  }

  /**
   * 评估竞争强度
   * @param poolVolume 池子24h成交量（USD）
   * @param grossProfit 毛利润
   * @returns 竞争强度（0-1）
   */
  assessCompetition(poolVolume: number, grossProfit: number): number {
    // 基于池子流行度
    const volumeFactor = Math.min(poolVolume / 10_000_000, 1); // 1000万USD为上限
    
    // 基于利润大小（利润越大，竞争越激烈）
    const profitFactor = Math.min(grossProfit / 1_000_000, 1); // 0.001 SOL为上限
    
    // 综合评估
    const competition = (volumeFactor * 0.6 + profitFactor * 0.4);
    
    return Math.max(0, Math.min(1, competition));
  }

  /**
   * 检查下一个出块者是否是Jito验证者
   * @returns 是否是Jito验证者
   */
  private async checkNextLeaderIsJito(): Promise<boolean> {
    try {
      const nextLeader = await this.client.getNextScheduledLeader();
      
      if (nextLeader) {
        logger.debug(`Next leader slot: ${nextLeader.nextLeaderSlot}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.debug(`Failed to check next Jito leader: ${error}`);
      return false; // 默认继续执行
    }
  }

  /**
   * 获取执行统计
   */
  getStats(): {
    totalBundles: number;
    successfulBundles: number;
    failedBundles: number;
    successRate: number;
    totalTipSpent: number;
    totalProfit: number;
    netProfit: number;
    averageTipPerBundle: number;
    leaderCheckSkips: number;
    leaderSchedulerStats?: any;
  } {
    const successRate = this.stats.totalBundles > 0
      ? (this.stats.successfulBundles / this.stats.totalBundles) * 100
      : 0;

    const averageTipPerBundle = this.stats.successfulBundles > 0
      ? this.stats.totalTipSpent / this.stats.successfulBundles
      : 0;

    const leaderSchedulerStats = this.leaderScheduler?.getStats();

    return {
      ...this.stats,
      successRate,
      netProfit: this.stats.totalProfit - this.stats.totalTipSpent,
      averageTipPerBundle,
      leaderSchedulerStats,
    };
  }

  /**
   * 获取详细的 Tip 统计（新增）
   */
  getTipStatistics(): {
    overallStats: {
      totalBundles: number;
      successRate: number;
      avgTipPerBundle: number;
      totalTipSpent: number;
      tipEfficiency: number;
    };
    jitoOptimizerStats: any;
  } {
    const jitoOptimizerStats = this.jitoTipOptimizer.getHistoryStats();

    return {
      overallStats: {
        totalBundles: this.stats.totalBundles,
        successRate: this.stats.totalBundles > 0
          ? (this.stats.successfulBundles / this.stats.totalBundles) * 100
          : 0,
        avgTipPerBundle: this.stats.successfulBundles > 0
          ? this.stats.totalTipSpent / this.stats.successfulBundles
          : 0,
        totalTipSpent: this.stats.totalTipSpent,
        tipEfficiency: this.stats.totalTipSpent > 0
          ? (this.stats.totalProfit / this.stats.totalTipSpent) * 100
          : 0,
      },
      jitoOptimizerStats,
    };
  }

  /**
   * 周期性打印统计报告（新增）
   */
  printStatisticsReport(): void {
    const stats = this.getTipStatistics();
    const leaderStats = this.leaderScheduler?.getStats();

    logger.info('========================================');
    logger.info('Jito Executor Statistics Report');
    logger.info('========================================');
    logger.info(`Total Bundles: ${stats.overallStats.totalBundles}`);
    logger.info(`Success Rate: ${stats.overallStats.successRate.toFixed(1)}%`);
    logger.info(`Avg Tip: ${(stats.overallStats.avgTipPerBundle / 1e9).toFixed(6)} SOL`);
    logger.info(`Total Tip Spent: ${(stats.overallStats.totalTipSpent / 1e9).toFixed(6)} SOL`);
    logger.info(`Tip Efficiency: ${stats.overallStats.tipEfficiency.toFixed(1)}% (profit/tip)`);
    logger.info(`Leader Check Skips: ${this.stats.leaderCheckSkips}`);
    
    if (leaderStats) {
      logger.info(`Jito Slot Ratio: ${leaderStats.jitoSlotRatio.toFixed(1)}%`);
      logger.info(`Avg Check Time: ${leaderStats.avgCheckTimeMs.toFixed(1)}ms`);
    }

    logger.info('');
    logger.info('JitoTipOptimizer Stats:');
    logger.info(`  Total Bundles: ${stats.jitoOptimizerStats.totalBundles}`);
    logger.info(`  Success Rate: ${(stats.jitoOptimizerStats.successRate * 100).toFixed(1)}%`);
    logger.info(`  Avg Success Tip: ${(stats.jitoOptimizerStats.avgSuccessTip / 1e9).toFixed(6)} SOL`);
    logger.info(`  Avg Failed Tip: ${(stats.jitoOptimizerStats.avgFailedTip / 1e9).toFixed(6)} SOL`);
    logger.info('========================================');
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.stats = {
      totalBundles: 0,
      successfulBundles: 0,
      failedBundles: 0,
      totalTipSpent: 0,
      totalProfit: 0,
      leaderCheckSkips: 0,
    };
    
    // 重置 Leader 调度器统计
    if (this.leaderScheduler) {
      this.leaderScheduler.resetStats();
    }
    
    logger.info('Statistics reset');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<JitoExecutorConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Jito executor config updated');
  }

  /**
   * Sleep辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default JitoExecutor;
