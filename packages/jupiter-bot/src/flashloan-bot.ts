/**
 * 闪电贷套利机器人
 * 
 * 基于 Jupiter + Solend 闪电贷的无本金套利
 * 设计文档：sol设计文档_修正版_实战.md
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import { OpportunityFinder, ArbitrageOpportunity } from './opportunity-finder';
import { JitoExecutor } from '@solana-arb-bot/onchain-bot';
import { JupiterServerManager } from '@solana-arb-bot/jupiter-server';
import {
  SolendAdapter,
  JupiterLendAdapter,
  FlashLoanTransactionBuilder,
  FlashLoanProtocol,
} from '@solana-arb-bot/core';
import { MonitoringService } from '@solana-arb-bot/core';
import { createEconomicsSystem, createLogger, JitoTipOptimizer } from '@solana-arb-bot/core';
import { readFileSync } from 'fs';
import axios from 'axios';
import * as toml from 'toml';

const logger = createLogger('FlashloanBot');

/**
 * 闪电贷机器人配置
 */
export interface FlashloanBotConfig {
  // 基础配置
  rpcUrl: string;
  keypairPath: string;
  dryRun?: boolean;

  // Jupiter Server配置
  jupiterServer: {
    rpcUrl: string;
    port?: number;
    enableCircularArbitrage?: boolean;
  };

  // 代币列表
  mintsFile: string;

  // 机会发现配置
  opportunityFinder: {
    workerCount?: number;
    queryIntervalMs?: number;
    minProfitLamports: number;
    slippageBps?: number;
  };

  // 闪电贷配置
  flashloan: {
    provider: 'solend' | 'jupiter-lend';
    solend: {
      minBorrowAmount: number;
      maxBorrowAmount: number;
      feeRate: number;
    };
    jupiter_lend?: {
      minBorrowAmount: number;
      maxBorrowAmount: number;
      feeRate: number; // Always 0
    };
    dynamicSizing?: {
      enabled: boolean;
      minMultiplier: number;
      maxMultiplier: number;
      safetyMargin: number;
    };
  };

  // Jito配置
  jito: {
    blockEngineUrl: string;
    authKeypairPath: string;
    checkJitoLeader: boolean;
    minTipLamports: number;
    maxTipLamports: number;
    confirmationTimeout?: number;
  };

  // 监控配置
  monitoring?: {
    enabled: boolean;
    serverchan?: {
      sendKey: string;
      enabled: boolean;
    };
    minProfitForAlert?: number;
  };

  // 经济模型配置
  economics: {
    capitalSize: 'small' | 'medium' | 'large';
    cost: {
      signatureCount: number;
      computeUnits: number;
      computeUnitPrice: number;
    };
    profit: {
      minROI: number;
      maxSlippage: number;
      minLiquidityUsd: number;
    };
    risk: {
      maxConsecutiveFailures: number;
      maxHourlyLossLamports: number;
      minSuccessRate: number;
      cooldownPeriod: number;
    };
  };
}

/**
 * 闪电贷套利机器人
 */
export class FlashloanBot {
  private config: FlashloanBotConfig;
  private connection: Connection;
  private keypair: Keypair;
  private finder: OpportunityFinder;
  private executor: JitoExecutor;
  private jupiterServerManager: JupiterServerManager;
  private monitoring?: MonitoringService;
  private economics: ReturnType<typeof createEconomicsSystem>;
  private isRunning = false;

  private stats = {
    opportunitiesFound: 0,
    opportunitiesFiltered: 0,
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalBorrowedSol: 0,
    totalFlashloanFees: 0,
    totalProfitSol: 0,
    totalLossSol: 0,
    startTime: Date.now(),
  };

  constructor(config: FlashloanBotConfig) {
    this.config = config;

    // 初始化连接
    this.connection = new Connection(config.rpcUrl, 'processed');
    logger.info(`Connected to RPC: ${config.rpcUrl}`);

    // 加载钱包
    this.keypair = this.loadKeypair(config.keypairPath);
    logger.info(`Wallet loaded: ${this.keypair.publicKey.toBase58()}`);

    // 加载代币列表
    const mints = this.loadMints(config.mintsFile);
    logger.info(`Loaded ${mints.length} mints for arbitrage`);

    // 初始化 Jupiter Server Manager
    this.jupiterServerManager = new JupiterServerManager({
      rpcUrl: config.jupiterServer.rpcUrl,
      port: config.jupiterServer.port || 8080,
      enableCircularArbitrage:
        config.jupiterServer.enableCircularArbitrage !== false,
    });

    // 初始化机会发现器（使用 Ultra API）
    // 注意：查询阶段使用接近闪电贷规模的金额获取更准确的报价，执行阶段会动态计算最优借款金额
    // 使用 10 SOL (10_000_000_000 lamports) 作为查询基准：
    // - 对 SOL (9 decimals)：10 SOL (~$1800)
    // - 对 USDC/USDT (6 decimals)：10,000 USDC/USDT (10 SOL等值)
    // - 对 JUP (6 decimals)：按比例调整
    // 更大的金额能更准确反映实际套利机会（0.1%价差 = 0.01 SOL利润 = 10,000,000 lamports）
    const queryAmount = 10_000_000_000; // 10 SOL - 接近真实闪电贷规模
    
    this.finder = new OpportunityFinder({
      jupiterApiUrl: 'https://api.jup.ag/ultra', // ✅ 升级到 Ultra API (Juno 引擎: Metis + JupiterZ + Hashflow + DFlow)
      apiKey: '3cf45ad3-12bc-4832-9307-d0b76357e005', // ✅ Ultra API Key
      mints,
      amount: queryAmount, // 使用小额作为查询基准，避免流动性不足
      minProfitLamports: config.opportunityFinder.minProfitLamports,
      workerCount: config.opportunityFinder.workerCount || 4,
      slippageBps: config.opportunityFinder.slippageBps || 50,
    });

    // 初始化 Jito Tip Optimizer
    const jitoTipOptimizer = new JitoTipOptimizer({
      minTipLamports: config.jito.minTipLamports,
      maxTipLamports: config.jito.maxTipLamports,
      profitSharePercentage: 0.3, // 30% profit share
      competitionMultiplier: 2.0,
      urgencyMultiplier: 1.5,
      useHistoricalLearning: true,
      historicalWeight: 0.4,
    });

    // 初始化 Jito 执行器（修复：使用正确的4参数构造函数）
    this.executor = new JitoExecutor(
      this.connection,
      this.keypair,
      jitoTipOptimizer,
      {
        blockEngineUrl: config.jito.blockEngineUrl,
        authKeypair: this.keypair,
        minTipLamports: config.jito.minTipLamports,
        maxTipLamports: config.jito.maxTipLamports,
        checkJitoLeader: config.jito.checkJitoLeader,
        confirmationTimeout: config.jito.confirmationTimeout || 45,
        capitalSize: config.economics.capitalSize,
      }
    );

    // 初始化监控服务
    if (config.monitoring?.enabled) {
      this.monitoring = new MonitoringService({
        serverChan: config.monitoring.serverchan?.enabled
          ? {
              sendKey: config.monitoring.serverchan.sendKey,
              enabled: true,
            }
          : undefined,
      });
      logger.info('Monitoring service enabled');
    }

    // 初始化经济系统
    this.economics = createEconomicsSystem({
      slippageBuffer: config.economics.profit.maxSlippage,
      circuitBreaker: {
        maxConsecutiveFailures: config.economics.risk.maxConsecutiveFailures,
        maxHourlyLoss: config.economics.risk.maxHourlyLossLamports,
        minSuccessRate: config.economics.risk.minSuccessRate,
        cooldownPeriod: config.economics.risk.cooldownPeriod,
      },
    });

    logger.info('💰 Flashloan Bot initialized');
  }

  /**
   * 加载配置文件
   */
  static loadConfig(path: string): FlashloanBotConfig {
    try {
      const content = readFileSync(path, 'utf-8');
      const config = toml.parse(content);

      // 映射 TOML 配置到类型化配置
      return {
        rpcUrl: config.rpc.urls[0],
        keypairPath: config.keypair.path,
        dryRun: config.bot.dry_run,
        jupiterServer: config.jupiter_server,
        mintsFile: config.opportunity_finder.mints_file,
        opportunityFinder: {
          workerCount: config.opportunity_finder.worker_count,
          queryIntervalMs: config.opportunity_finder.query_interval_ms,
          minProfitLamports: config.opportunity_finder.min_profit_lamports,
          slippageBps: config.opportunity_finder.slippage_bps,
        },
        flashloan: config.flashloan,
        jito: {
          blockEngineUrl: config.jito.block_engine_url,
          authKeypairPath: config.jito.auth_keypair_path,
          checkJitoLeader: config.jito.check_jito_leader,
          minTipLamports: config.jito.min_tip_lamports,
          maxTipLamports: config.jito.max_tip_lamports,
          confirmationTimeout: config.jito.confirmation_timeout,
        },
        monitoring: config.monitoring,
        economics: config.economics,
      } as FlashloanBotConfig;
    } catch (error: any) {
      logger.error(`Failed to load config from ${path}:`, error);
      throw error;
    }
  }

  /**
   * 加载密钥对
   */
  private loadKeypair(path: string): Keypair {
    try {
      const secretKeyString = readFileSync(path, 'utf-8');
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      logger.error(`Failed to load keypair from ${path}:`, error);
      throw error;
    }
  }

  /**
   * 加载代币列表
   */
  private loadMints(path: string): PublicKey[] {
    try {
      const content = readFileSync(path, 'utf-8');
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

      return lines.map((line) => new PublicKey(line));
    } catch (error) {
      logger.error(`Failed to load mints from ${path}:`, error);
      throw error;
    }
  }

  /**
   * 启动机器人
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot already running');
      return;
    }

    logger.info('🚀 Starting Flashloan Arbitrage Bot...');

    // 发送启动通知
    if (this.monitoring) {
      await this.monitoring.sendAlert({
        type: 'info',
        title: '🚀 闪电贷机器人已启动',
        description: `机器人已成功启动，开始扫描套利机会`,
        fields: [
          { name: '钱包地址', value: this.keypair.publicKey.toBase58() },
          { name: '模式', value: this.config.dryRun ? '模拟运行' : '真实交易' },
          {
            name: '借款范围',
            value: `${this.config.flashloan.solend.minBorrowAmount / LAMPORTS_PER_SOL} - ${this.config.flashloan.solend.maxBorrowAmount / LAMPORTS_PER_SOL} SOL`,
          },
        ],
        level: 'high',
      });
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    // 检查钱包余额（干运行模式跳过）
    if (!this.config.dryRun) {
      await this.checkWalletBalance();
    } else {
      logger.info('💡 Dry run mode: skipping wallet balance check');
    }

    // 使用官方 Jupiter API（跳过自托管）
    logger.info('Using official Jupiter API (no local server needed)');
    logger.info('✅ Jupiter API ready');

    // 等待服务稳定
    await this.sleep(2000);

    // 启动机会发现器
    await this.finder.start(async (opportunity) => {
      await this.handleOpportunity(opportunity);
    });

    // 定期输出统计
    const statsInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statsInterval);
        return;
      }
      this.printStats();
    }, 60000); // 每分钟

    logger.info('✅ Flashloan Bot started successfully');
    logger.info('📱 监控您的微信"服务通知"以接收实时告警');
  }

  /**
   * 检查钱包余额
   */
  private async checkWalletBalance(): Promise<void> {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    const balanceSol = balance / LAMPORTS_PER_SOL;

    logger.info(`Wallet balance: ${balanceSol.toFixed(4)} SOL`);

    if (balanceSol < 0.05) {
      logger.warn(
        `⚠️  Wallet balance is low (${balanceSol} SOL). Minimum 0.1 SOL recommended for gas fees.`
      );

      if (this.monitoring) {
        await this.monitoring.sendAlert({
          type: 'warning',
          title: '⚠️ 钱包余额过低',
          description: `钱包余额不足，可能无法支付交易费用`,
          fields: [
            { name: '当前余额', value: `${balanceSol.toFixed(4)} SOL` },
            { name: '建议余额', value: '至少 0.1 SOL' },
          ],
          level: 'medium',
        });
      }
    }
  }

  /**
   * 处理发现的机会
   */
  private async handleOpportunity(
    opportunity: ArbitrageOpportunity
  ): Promise<void> {
    this.stats.opportunitiesFound++;

    // 验证输入数据
    if (!opportunity.inputAmount || opportunity.inputAmount <= 0) {
      logger.error('Invalid inputAmount in opportunity');
      return;
    }

    if (!opportunity.profit || opportunity.profit <= 0) {
      logger.error('Invalid profit in opportunity');
      return;
    }

    // 计算最优借款金额
    const borrowAmount = this.calculateOptimalBorrowAmount(opportunity);

    // 计算基于借款金额的预期利润
    // 利润率 = 查询利润 / 查询金额
    // 预期利润 = 利润率 × 借款金额
    const profitRate = opportunity.profit / opportunity.inputAmount;
    const expectedProfit = Math.floor(profitRate * borrowAmount);

    logger.debug(
      `Profit calculation: query ${opportunity.inputAmount / LAMPORTS_PER_SOL} SOL -> ` +
      `profit ${opportunity.profit / LAMPORTS_PER_SOL} SOL (${(profitRate * 100).toFixed(4)}%), ` +
      `borrow ${borrowAmount / LAMPORTS_PER_SOL} SOL -> ` +
      `expected ${expectedProfit / LAMPORTS_PER_SOL} SOL`
    );

    // 验证闪电贷是否可行
    const validation = this.config.flashloan.provider === 'jupiter-lend'
      ? JupiterLendAdapter.validateFlashLoan(borrowAmount, expectedProfit)
      : SolendAdapter.validateFlashLoan(borrowAmount, expectedProfit);

    if (!validation.valid) {
      this.stats.opportunitiesFiltered++;
      logger.debug(
        `Opportunity filtered: ${validation.reason || 'unknown'}, expected profit: ${expectedProfit / LAMPORTS_PER_SOL} SOL`
      );
      return;
    }

    const flashLoanFee = validation.fee;
    const roi = flashLoanFee > 0 
      ? ((validation.netProfit / flashLoanFee) * 100).toFixed(1)
      : 'Infinite'; // Jupiter Lend 0% fee = infinite ROI

    logger.info(
      `💰 Processing opportunity: ` +
        `Borrow ${borrowAmount / LAMPORTS_PER_SOL} SOL, ` +
        `Expected profit ${validation.netProfit / LAMPORTS_PER_SOL} SOL ` +
        `(ROI: ${roi}%)`
    );

    // 模拟模式
    if (this.config.dryRun) {
      logger.info(
        `[DRY RUN] Would execute flashloan arbitrage with ${borrowAmount / LAMPORTS_PER_SOL} SOL`
      );
      this.stats.tradesSuccessful++;
      this.stats.totalProfitSol += validation.netProfit / LAMPORTS_PER_SOL;
      return;
    }

    // 检查熔断器
    if (!this.economics.circuitBreaker.canAttempt()) {
      logger.warn('🚨 Circuit breaker activated, skipping trade');
      return;
    }

    try {
      // 构建套利指令（简化版，实际需要调用 Jupiter API）
      const arbitrageInstructions = await this.buildArbitrageInstructions(
        opportunity
      );

      // 构建闪电贷交易
      const recentBlockhash = await this.connection.getLatestBlockhash();
      const userTokenAccount = await this.getOrCreateTokenAccount(
        opportunity.inputMint
      );

      const transaction = FlashLoanTransactionBuilder.buildAtomicArbitrageTx(
        {
          useFlashLoan: true,
          flashLoanConfig: {
            protocol: this.config.flashloan.provider === 'jupiter-lend'
              ? FlashLoanProtocol.JUPITER_LEND
              : FlashLoanProtocol.SOLEND,
            amount: borrowAmount,
            tokenMint: opportunity.inputMint,
          },
          arbitrageInstructions,
          wallet: this.keypair.publicKey,
        },
        recentBlockhash.blockhash,
        userTokenAccount
      );

      // 签名交易
      transaction.sign([this.keypair]);

      // 执行交易
      this.stats.tradesAttempted++;
      const result = await this.executor.executeVersionedTransaction(
        transaction,
        validation.netProfit / LAMPORTS_PER_SOL
      );

      // 记录结果
      this.economics.circuitBreaker.recordTransaction({
        success: result.success,
        profit: result.success ? validation.netProfit : 0,
        timestamp: Date.now(),
      });

      if (result.success) {
        this.stats.tradesSuccessful++;
        this.stats.totalBorrowedSol += borrowAmount / LAMPORTS_PER_SOL;
        this.stats.totalFlashloanFees += flashLoanFee / LAMPORTS_PER_SOL;
        this.stats.totalProfitSol += validation.netProfit / LAMPORTS_PER_SOL;

        logger.info(
          `✅ Flashloan trade successful! ` +
            `Signature: ${result.signature}, ` +
            `Net profit: ${validation.netProfit / LAMPORTS_PER_SOL} SOL`
        );

        // 发送利润通知
        if (
          this.monitoring &&
          this.config.monitoring &&
          validation.netProfit >= (this.config.monitoring.minProfitForAlert || 0)
        ) {
          await this.monitoring.sendAlert({
            type: 'success',
            title: '🎉 闪电贷套利成功！',
            description: `成功完成一笔闪电贷套利交易`,
            fields: [
              { name: '借款金额', value: `${borrowAmount / LAMPORTS_PER_SOL} SOL` },
              {
                name: '闪电贷费用',
                value: `${flashLoanFee / LAMPORTS_PER_SOL} SOL`,
              },
              { name: '净利润', value: `${validation.netProfit / LAMPORTS_PER_SOL} SOL` },
              {
                name: 'ROI',
                value: flashLoanFee > 0 
                  ? `${((validation.netProfit / flashLoanFee) * 100).toFixed(1)}%`
                  : 'Infinite (0% fee)',
              },
              { name: '交易签名', value: result.signature || 'N/A' },
            ],
            level: 'high',
          });
        }
      } else {
        this.stats.tradesFailed++;
        this.stats.totalLossSol += flashLoanFee / LAMPORTS_PER_SOL;

        logger.warn(`❌ Flashloan trade failed: ${result.errors?.join(', ') || 'Unknown error'}`);

        // 发送失败告警
        if (this.monitoring) {
          await this.monitoring.sendAlert({
            type: 'error',
            title: '❌ 闪电贷交易失败',
            description: `闪电贷交易执行失败`,
            fields: [
              { name: '借款金额', value: `${borrowAmount / LAMPORTS_PER_SOL} SOL` },
              { name: '预期利润', value: `${validation.netProfit / LAMPORTS_PER_SOL} SOL` },
              { name: '失败原因', value: result.errors?.join(', ') || '未知' },
            ],
            level: 'medium',
          });
        }
      }
    } catch (error: any) {
      this.stats.tradesFailed++;
      logger.error(`Error handling opportunity: ${error.message}`);

      // 记录失败
      this.economics.circuitBreaker.recordTransaction({
        success: false,
        profit: 0,
        timestamp: Date.now(),
      });
    }

    // 检查熔断器状态
    const breakerStatus = this.economics.circuitBreaker.shouldBreak();
    if (breakerStatus.shouldBreak && this.monitoring) {
      await this.monitoring.sendAlert({
        type: 'warning',
        title: '🚨 触发熔断保护',
        description: `机器人已触发熔断，暂停交易`,
        fields: [
          { name: '触发原因', value: breakerStatus.reason || 'Circuit breaker triggered' },
          {
            name: '冷却时间',
            value: `${this.config.economics.risk.cooldownPeriod / 60000} 分钟`,
          },
        ],
        level: 'high',
      });
    }
  }

  /**
   * 计算最优借款金额（改进版 - 基于利润率动态计算）
   */
  private calculateOptimalBorrowAmount(
    opportunity: ArbitrageOpportunity
  ): number {
    const providerConfig = this.config.flashloan.provider === 'jupiter-lend'
      ? this.config.flashloan.jupiter_lend
      : this.config.flashloan.solend;
    const { minBorrowAmount, maxBorrowAmount } = providerConfig || this.config.flashloan.solend;
    const dynamicConfig = this.config.flashloan.dynamicSizing;

    // 添加输入验证，防止NaN
    if (!opportunity.inputAmount || opportunity.inputAmount <= 0) {
      logger.error('Invalid inputAmount in opportunity, using minBorrowAmount');
      return minBorrowAmount || 10_000_000_000; // 默认10 SOL
    }

    if (!opportunity.profit || opportunity.profit <= 0) {
      logger.error('Invalid profit in opportunity, using minBorrowAmount');
      return minBorrowAmount || 10_000_000_000;
    }

    if (dynamicConfig?.enabled) {
      // 计算利润率（ROI）
      const profitRate = opportunity.profit / opportunity.inputAmount;
      
      // 根据利润率决定借款金额
      // 策略：利润率越高，借款越多（基于查询金额的倍数）
      const { minMultiplier, maxMultiplier, safetyMargin } = dynamicConfig;
      
      // 基于输入金额（查询金额）按比例放大
      // 例如：查询10 SOL，利润率0.02%，借款100 SOL预期利润0.02 SOL
      let borrowAmount: number;
      
      // 根据利润率分级决定借款倍数
      if (profitRate > 0.01) {
        // >1% ROI：高利润率，借最大倍数
        borrowAmount = opportunity.inputAmount * maxMultiplier;
      } else if (profitRate > 0.005) {
        // 0.5-1% ROI：中等利润率，借中等倍数
        borrowAmount = opportunity.inputAmount * ((minMultiplier + maxMultiplier) / 2);
      } else if (profitRate > 0.001) {
        // 0.1-0.5% ROI：较低利润率，借较小倍数
        borrowAmount = opportunity.inputAmount * (minMultiplier * 1.5);
      } else {
        // <0.1% ROI：低利润率，借最小倍数
        borrowAmount = opportunity.inputAmount * minMultiplier;
      }
      
      // 应用安全边际（降低风险）
      borrowAmount = Math.floor(borrowAmount * safetyMargin);
      
      // 限制在配置范围内
      borrowAmount = Math.min(
        Math.max(borrowAmount, minBorrowAmount || 10_000_000_000),
        maxBorrowAmount || 1_000_000_000_000
      );
      
      return borrowAmount;
    }

    // 默认：使用最小借款金额
    return minBorrowAmount || 10_000_000_000; // 添加默认值防止NaN
  }

  /**
   * 构建套利指令
   */
  private async buildArbitrageInstructions(
    opportunity: ArbitrageOpportunity
  ): Promise<TransactionInstruction[]> {
    // TODO: 调用 Jupiter API 获取实际的 swap 指令
    // 这里是简化版，实际需要：
    // 1. 调用 Jupiter quote API
    // 2. 调用 Jupiter swap API
    // 3. 反序列化得到指令

    logger.debug('Building arbitrage instructions...');

    // 返回空数组作为占位
    // 实际实现需要从 Jupiter API 获取
    return [];
  }

  /**
   * 获取或创建代币账户
   */
  private async getOrCreateTokenAccount(mint: PublicKey): Promise<PublicKey> {
    // TODO: 实现代币账户查询/创建逻辑
    // 简化版：返回钱包地址
    return this.keypair.publicKey;
  }

  /**
   * 休眠辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 输出统计信息
   */
  private printStats(): void {
    const successRate =
      this.stats.tradesAttempted > 0
        ? (
            (this.stats.tradesSuccessful / this.stats.tradesAttempted) *
            100
          ).toFixed(1)
        : '0.0';

    const netProfit = this.stats.totalProfitSol - this.stats.totalLossSol;
    const uptimeHours = (Date.now() - this.stats.startTime) / (1000 * 60 * 60);

    logger.info('═══════════════════════════════════════════');
    logger.info('📊 Flashloan Bot Statistics');
    logger.info('═══════════════════════════════════════════');
    logger.info(`Uptime: ${uptimeHours.toFixed(2)} hours`);
    logger.info(`Opportunities Found: ${this.stats.opportunitiesFound}`);
    logger.info(`Opportunities Filtered: ${this.stats.opportunitiesFiltered}`);
    logger.info(`Trades Attempted: ${this.stats.tradesAttempted}`);
    logger.info(`Trades Successful: ${this.stats.tradesSuccessful}`);
    logger.info(`Trades Failed: ${this.stats.tradesFailed}`);
    logger.info(`Success Rate: ${successRate}%`);
    logger.info(
      `Total Borrowed: ${this.stats.totalBorrowedSol.toFixed(4)} SOL`
    );
    logger.info(
      `Total Fees: ${this.stats.totalFlashloanFees.toFixed(4)} SOL`
    );
    logger.info(`Total Profit: ${this.stats.totalProfitSol.toFixed(4)} SOL`);
    logger.info(`Net Profit: ${netProfit.toFixed(4)} SOL`);
    logger.info('═══════════════════════════════════════════');
  }

  /**
   * 停止机器人
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping Flashloan Bot...');
    this.isRunning = false;

    await this.finder.stop();

    logger.info('Stopping Jupiter Server...');
    await this.jupiterServerManager.stop();
    logger.info('✅ Jupiter Server stopped');

    this.printStats();

    // 发送停止通知
    if (this.monitoring) {
      const netProfit = this.stats.totalProfitSol - this.stats.totalLossSol;
      await this.monitoring.sendAlert({
        type: 'info',
        title: '🛑 闪电贷机器人已停止',
        description: `机器人已安全停止运行`,
        fields: [
          { name: '总交易次数', value: `${this.stats.tradesAttempted}` },
          { name: '成功次数', value: `${this.stats.tradesSuccessful}` },
          {
            name: '成功率',
            value: `${((this.stats.tradesSuccessful / Math.max(this.stats.tradesAttempted, 1)) * 100).toFixed(1)}%`,
          },
          { name: '净利润', value: `${netProfit.toFixed(4)} SOL` },
        ],
        level: 'medium',
      });
    }

    logger.info('✅ Flashloan Bot stopped');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }
}

// ==================== CLI Entry Point ====================

/**
 * 命令行入口
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const configPath =
    args.find((arg) => arg.startsWith('--config='))?.split('=')[1] ||
    'configs/flashloan-serverchan.toml';

  logger.info(`Loading config from: ${configPath}`);

  // 加载配置
  const config = FlashloanBot.loadConfig(configPath);

  // 创建机器人实例
  const bot = new FlashloanBot(config);

  // 处理退出信号
  process.on('SIGINT', async () => {
    logger.info('\n\nReceived SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\n\nReceived SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  // 启动机器人
  try {
    await bot.start();
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`, error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行 main
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    console.error('Full error details:', error);
    console.error('Error stack:', error?.stack);
    process.exit(1);
  });
}

// 导出类和类型
export * from './opportunity-finder';

