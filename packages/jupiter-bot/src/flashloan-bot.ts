/**
 * 闪电贷套利机器人
 * 
 * 基于 Jupiter + Solend 闪电贷的无本金套利
 * 设计文档：sol设计文档_修正版_实战.md
 */

import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  VersionedTransaction,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { OpportunityFinder, ArbitrageOpportunity } from './opportunity-finder';
import { JitoExecutor } from '@solana-arb-bot/onchain-bot';
import { JupiterServerManager } from '@solana-arb-bot/jupiter-server';
import {
  SolendAdapter,
  JupiterLendAdapter,
  FlashLoanTransactionBuilder,
  FlashLoanProtocol,
  networkConfig,
  initDatabase,
  databaseRecorder,
} from '@solana-arb-bot/core';
// 直接从源文件导入PriorityFeeEstimator,因为它未从core/index导出
import { PriorityFeeEstimator } from '@solana-arb-bot/core/dist/utils/priority-fee-estimator';
import { MonitoringService } from '@solana-arb-bot/core';
import { createEconomicsSystem, createLogger, JitoTipOptimizer } from '@solana-arb-bot/core';
import { readFileSync } from 'fs';
import { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
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

  // Jupiter API 配置（Ultra API）
  jupiterApi?: {
    apiKey?: string;
    endpoint?: string;
  };

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
    alert_on_opportunity_found?: boolean;
    min_opportunity_profit_for_alert?: number;
    opportunity_alert_rate_limit_ms?: number;
    alert_on_opportunity_validated?: boolean;
    min_validated_profit_for_alert?: number;
    validated_alert_rate_limit_ms?: number;
  };

  // 数据库配置（可选）
  database?: {
    enabled: boolean;
    url?: string;
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
    jito: {
      profitSharePercentage: number;
    };
  };
}

/**
 * 闪电贷套利机器人
 */
export class FlashloanBot {
  private config: FlashloanBotConfig;
  private connection: any; // Connection类型从networkConfig获取
  private keypair: Keypair;
  private finder: OpportunityFinder;
  private executor: JitoExecutor;
  private jupiterServerManager: JupiterServerManager;
  private monitoring?: MonitoringService;
  private economics: ReturnType<typeof createEconomicsSystem>;
  private priorityFeeEstimator: PriorityFeeEstimator;
  private axiosInstance: AxiosInstance;
  private jupiterSwapAxios: AxiosInstance;
  private jupiterApiStats = {
    total: 0,
    success: 0,
    tlsErrors: 0,
    serverErrors: 0,
    routeNotFound: 0,
  };
  private isRunning = false;

  // ALT 缓存（避免重复 RPC 查询，提升性能）
  private altCache = new Map<string, {
    account: AddressLookupTableAccount;
    timestamp: number;
  }>();
  private readonly ALT_CACHE_TTL = 300000; // 5分钟过期

  private stats = {
    opportunitiesFound: 0,
    opportunitiesFiltered: 0,
    simulationFiltered: 0,  // 🆕 RPC模拟过滤的机会数
    savedGasSol: 0,  // 🆕 通过RPC模拟节省的Gas（SOL）
    tradesAttempted: 0,
    tradesSuccessful: 0,
    tradesFailed: 0,
    totalBorrowedSol: 0,
    totalFlashloanFees: 0,
    totalProfitSol: 0,
    totalLossSol: 0,
    startTime: Date.now(),
  };

  /**
   * Create dedicated Jupiter Swap API client
   * Isolated connection pool prevents TLS handshake failures
   */
  private createJupiterSwapClient(): AxiosInstance {
    const proxyUrl = networkConfig.getProxyUrl();
    
    let httpsAgent: any;
    if (proxyUrl) {
      httpsAgent = new HttpsProxyAgent(proxyUrl, {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        timeout: 6000,        // 提高到6秒（应对国内代理延迟）
        keepAlive: true,      // Reuse connections (critical)
        keepAliveMsecs: 1000,
        maxSockets: 4,        // Dedicated pool
        maxFreeSockets: 2,
        scheduling: 'lifo',
      });
    }
    
    // ✅ 使用稳定的Lite API（免费，官方推荐）
    // 注意：Ultra API用于高频Quote查询（/v1/order），Lite API用于Swap指令生成
    const baseURL = 'https://lite-api.jup.ag/swap/v1';
    
    // ✅ 构建headers，包含API Key（如果配置了）
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate',
    };
    
    // ✅ 如果配置了API Key，添加到headers（Lite API兼容但不强制要求）
    if (this.config.jupiterApi?.apiKey) {
      headers['X-API-Key'] = this.config.jupiterApi.apiKey;
      logger.info('✅ Swap API using Lite API endpoint (API Key provided but not required)');
    } else {
      logger.info('✅ Swap API using Lite API endpoint (free tier)');
    }
    
    return axios.create({
      baseURL,
      timeout: 6000,        // 提高到6秒（应对Swap API构建交易延迟）
      headers,
      httpsAgent,
      httpAgent: httpsAgent,
      proxy: false,
      validateStatus: (status) => status < 500,
      maxRedirects: 0,
    });
  }

  constructor(config: FlashloanBotConfig) {
    this.config = config;

    // 使用统一的网络配置管理器创建连接（自动配置代理）
    this.connection = networkConfig.createConnection(config.rpcUrl, 'processed');
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

    // 初始化数据库（如果配置了）
    if (config.database?.enabled) {
      try {
        initDatabase({
          url: config.database.url || process.env.DATABASE_URL,
          poolSize: 10,
        });
        logger.info('✅ Database initialized for opportunity recording');
      } catch (error) {
        logger.warn('⚠️ Database initialization failed (optional):', error);
      }
    }

    // 初始化机会发现器（使用 Lite API + 多跳路由）
    // 注意：查询阶段使用接近闪电贷规模的金额获取更准确的报价
    // 使用 10 SOL (10_000_000_000 lamports) 作为查询基准：
    // - 对 SOL (9 decimals)：10 SOL (~$1800)
    // - 对 USDC/USDT (6 decimals)：10,000 USDC/USDT (10 SOL等值)
    // - 对 JUP (6 decimals)：按比例调整
    // 
    // ⚡ 关键优化：
    // - 已启用多跳路由 (onlyDirectRoutes=false)
    // - 利润阈值已降至 500,000 lamports
    // - 配合多跳路由，10 SOL 可获得 1.5M+ lamports 利润
    const queryAmount = 10_000_000_000; // 10 SOL - 配合多跳路由优化
    
    // 从配置文件读取 Jupiter API 配置（最佳实践）
    const jupiterApiUrl = config.jupiterApi?.endpoint || 'https://api.jup.ag/ultra';
    const jupiterApiKey = config.jupiterApi?.apiKey;
    
    this.finder = new OpportunityFinder({
      jupiterApiUrl, // ✅ 从配置读取 Ultra API 端点
      apiKey: jupiterApiKey, // ✅ 从配置读取 API Key
      mints,
      amount: queryAmount, // 使用小额作为查询基准，避免流动性不足
      minProfitLamports: config.opportunityFinder.minProfitLamports,
      workerCount: config.opportunityFinder.workerCount || 4,
      slippageBps: config.opportunityFinder.slippageBps || 50,
      monitoring: undefined, // 先设置为 undefined，稍后在监控服务初始化后更新
      databaseEnabled: config.database?.enabled || false,
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
        alertOnOpportunityFound: config.monitoring.alert_on_opportunity_found,
        minOpportunityProfitForAlert: config.monitoring.min_opportunity_profit_for_alert,
        opportunityAlertRateLimitMs: config.monitoring.opportunity_alert_rate_limit_ms,
        alertOnOpportunityValidated: config.monitoring.alert_on_opportunity_validated,
        minValidatedProfitForAlert: config.monitoring.min_validated_profit_for_alert,
        validatedAlertRateLimitMs: config.monitoring.validated_alert_rate_limit_ms,
      });
      
      // 将 monitoring 传递给 finder
      (this.finder as any).monitoring = this.monitoring;
      
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

    // 初始化优先费估算器（从配置读取计算单元数）
    this.priorityFeeEstimator = new PriorityFeeEstimator(
      this.connection,
      config.economics.cost.computeUnits || 800_000
    );
    logger.info(`✅ Priority Fee Estimator initialized (${config.economics.cost.computeUnits || 800_000} CU)`);

    // 使用统一的网络配置管理器获取axios实例（自动配置代理）
    this.axiosInstance = networkConfig.getAxiosInstance();
    logger.info(`✅ Network config: proxy ${networkConfig.isProxyEnabled() ? 'enabled' : 'disabled'} ${networkConfig.isProxyEnabled() ? `(${networkConfig.getProxyUrl()})` : ''}`);

    // Create dedicated Jupiter Swap API client
    this.jupiterSwapAxios = this.createJupiterSwapClient();
    logger.info('✅ Jupiter Swap API client initialized (dedicated connection pool)');

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
        jupiterApi: config.jupiter_api ? {
          apiKey: config.jupiter_api.api_key,
          endpoint: config.jupiter_api.endpoint,
        } : undefined,
        jupiterServer: config.jupiter_server,
        mintsFile: config.opportunity_finder.mints_file,
        opportunityFinder: {
          workerCount: config.opportunity_finder.worker_count,
          queryIntervalMs: config.opportunity_finder.query_interval_ms,
          minProfitLamports: config.opportunity_finder.min_profit_lamports,
          slippageBps: config.opportunity_finder.slippage_bps,
        },
        flashloan: {
          provider: config.flashloan.provider,
          solend: config.flashloan.solend,
          jupiter_lend: config.flashloan.jupiter_lend,
          // 转换蛇形命名为驼峰命名
          dynamicSizing: config.flashloan.dynamic_sizing ? {
            enabled: config.flashloan.dynamic_sizing.enabled,
            minMultiplier: config.flashloan.dynamic_sizing.min_multiplier,
            maxMultiplier: config.flashloan.dynamic_sizing.max_multiplier,
            safetyMargin: config.flashloan.dynamic_sizing.safety_margin,
          } : undefined,
        },
        jito: {
          blockEngineUrl: config.jito.block_engine_url,
          authKeypairPath: config.jito.auth_keypair_path,
          checkJitoLeader: config.jito.check_jito_leader,
          minTipLamports: config.jito.min_tip_lamports,
          maxTipLamports: config.jito.max_tip_lamports,
          confirmationTimeout: config.jito.confirmation_timeout,
        },
        monitoring: config.monitoring,
        economics: {
          capitalSize: config.economics.capital_size,
          cost: {
            signatureCount: config.economics.cost.signature_count,
            computeUnits: config.economics.cost.compute_units,
            computeUnitPrice: config.economics.cost.compute_unit_price,
          },
          profit: {
            minROI: config.economics.profit.min_roi,
            maxSlippage: config.economics.profit.max_slippage,
            minLiquidityUsd: config.economics.profit.min_liquidity_usd,
          },
          risk: {
            maxConsecutiveFailures: config.economics.risk.max_consecutive_failures,
            maxHourlyLossLamports: config.economics.risk.max_hourly_loss_lamports,
            minSuccessRate: config.economics.risk.min_success_rate,
            cooldownPeriod: config.economics.risk.cooldown_period,
          },
          jito: {
            profitSharePercentage: config.economics.jito.profit_share_percentage,
          },
        },
      } as FlashloanBotConfig;
    } catch (error: any) {
      logger.error(`Failed to load config from ${path}:`, error);
      throw error;
    }
  }

  /**
   * 配置校验和智能调整（防止极端配置）
   */
  static validateAndAdjustConfig(config: FlashloanBotConfig): FlashloanBotConfig {
    // 限制Jito Tip不超过15%
    if (config.economics.jito.profitSharePercentage > 15) {
      logger.warn(
        `⚠️ Jito Tip ${config.economics.jito.profitSharePercentage}% exceeds recommended 15%, adjusting to 15%...`
      );
      config.economics.jito.profitSharePercentage = 15;
    }
    
    // Worker数量建议不超过3（防止API限速）
    if (config.opportunityFinder.workerCount && config.opportunityFinder.workerCount > 3) {
      logger.warn(
        `⚠️ Worker count ${config.opportunityFinder.workerCount} may cause API rate limiting (recommended: 3)`
      );
    }
    
    // 查询间隔建议不低于80ms（防止API限速）
    if (config.opportunityFinder.queryIntervalMs && config.opportunityFinder.queryIntervalMs < 80) {
      logger.warn(
        `⚠️ Query interval ${config.opportunityFinder.queryIntervalMs}ms is very low, may trigger rate limit (recommended: ≥80ms)`
      );
    }
    
    // 显示配置摘要
    logger.info(`📋 Config Validation:`);
    logger.info(`   Jito Tip: ${config.economics.jito.profitSharePercentage}%`);
    logger.info(`   Workers: ${config.opportunityFinder.workerCount || 'N/A'}`);
    logger.info(`   Query Interval: ${config.opportunityFinder.queryIntervalMs || 'N/A'}ms`);
    logger.info(`   Compute Unit Price: ${config.economics.cost.computeUnitPrice || 'N/A'} μL/CU`);
    
    return config;
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
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          // 移除行尾注释（处理 "mint_address  # comment" 格式）
          const commentIndex = line.indexOf('#');
          return commentIndex !== -1 ? line.substring(0, commentIndex).trim() : line;
        })
        .filter((line) => line); // 再次过滤空行

      return lines.map((line) => new PublicKey(line));
    } catch (error) {
      logger.error(`Failed to load mints from ${path}:`, error);
      throw error;
    }
  }

  /**
   * Warmup Jupiter Swap API connection
   * Establishes hot connections to avoid cold-start TLS failures
   */
  private async warmupJupiterConnection(): Promise<void> {
    try {
      logger.info('🔥 Warming up Jupiter Swap API connection...');
      
      const testQuote = await this.jupiterSwapAxios.get('/quote', {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112',  // SOL
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          amount: '1000000000',
          slippageBps: '50',
        },
        timeout: 5000,
      });
      
      if (testQuote.data) {
        logger.info('✅ Jupiter Swap API connection ready');
      }
    } catch (error: any) {
      logger.warn(`⚠️ Warmup failed (not critical): ${error.message}`);
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
    
    // 显示 Jupiter API 配置信息
    const apiUrl = this.config.jupiterApi?.endpoint || 'https://api.jup.ag/ultra';
    const hasApiKey = !!this.config.jupiterApi?.apiKey;
    logger.info(`📡 Jupiter API: ${apiUrl}`);
    logger.info(`🔑 API Key: ${hasApiKey ? this.config.jupiterApi!.apiKey!.slice(0, 8) + '...' : 'Not configured (using free tier)'}`);
    logger.info(`⚡ Dynamic Rate Limit: ${hasApiKey ? 'Enabled (5 RPS base, auto-scaling)' : 'N/A'}`);
    
    logger.info('✅ Jupiter API ready');

    // Warmup Jupiter connection
    await this.warmupJupiterConnection();

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

    // 定期清理过期的 ALT 缓存
    const cacheCleanupInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(cacheCleanupInterval);
        return;
      }
      
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, value] of this.altCache.entries()) {
        if (now - value.timestamp > this.ALT_CACHE_TTL) {
          this.altCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug(`🧹 Cleaned ${cleanedCount} expired ALT cache entries`);
      }
    }, 60000); // 每分钟清理一次

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
   * 提取路由元数据用于数据库分析
   * 
   * @param opportunity 机会数据
   * @returns 路由元数据对象
   */
  private extractRouteMetadata(opportunity: any): any {
    try {
      const metadata: any = {
        routeInfo: {
          hasRouteData: false,
          outboundRoute: [],
          returnRoute: [],
          totalHops: 0,
          dexes: [],
        },
        queryInfo: {
          queryTime: opportunity.queryTime || 0,
          timestamp: new Date().toISOString(),
        },
      };

      // 提取去程路由
      if (opportunity.route && Array.isArray(opportunity.route)) {
        metadata.routeInfo.hasRouteData = true;
        
        opportunity.route.forEach((step: any, index: number) => {
          const routeStep = {
            stepNumber: index + 1,
            direction: step.direction || 'unknown',
            dex: step.dex || 'Unknown',
            inputMint: step.inputMint || '',
            outputMint: step.outputMint || '',
            inputAmount: step.inputAmount ? step.inputAmount.toString() : '0',
            outputAmount: step.outputAmount ? step.outputAmount.toString() : '0',
          };

          if (step.direction === 'outbound' || index < opportunity.route.length / 2) {
            metadata.routeInfo.outboundRoute.push(routeStep);
          } else {
            metadata.routeInfo.returnRoute.push(routeStep);
          }

          // 收集使用的 DEX
          if (step.dex && !metadata.routeInfo.dexes.includes(step.dex)) {
            metadata.routeInfo.dexes.push(step.dex);
          }
        });

        metadata.routeInfo.totalHops = opportunity.route.length;
      }

      // 提取桥接代币信息
      if (opportunity.bridgeToken) {
        metadata.bridgeInfo = {
          symbol: opportunity.bridgeToken,
          mint: opportunity.bridgeMint?.toBase58() || '',
          amount: opportunity.bridgeAmount ? opportunity.bridgeAmount.toString() : '0',
        };
      }

      // 提取利润分析
      metadata.profitAnalysis = {
        expectedProfit: opportunity.profit,
        roi: opportunity.roi,
        inputAmount: opportunity.inputAmount,
        outputAmount: opportunity.outputAmount,
      };

      return metadata;
    } catch (error) {
      logger.warn('Failed to extract route metadata:', error);
      return {
        error: 'Failed to extract route metadata',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 对机会进行二次验证
   * 立即重新查询 Jupiter API，检查机会是否仍然存在
   */
  private async validateOpportunityLifetime(
    opportunity: ArbitrageOpportunity
  ): Promise<{
    stillExists: boolean;
    secondProfit: number;
    secondRoi: number;
    delayMs: number;
    secondOutboundMs?: number;
    secondReturnMs?: number;
  }> {
    const startTime = Date.now();

    try {
      // 使用相同参数重新查询 Jupiter（第一段：inputMint -> bridgeMint）
      const outboundStart = Date.now();
      const quoteResponse = await this.jupiterSwapAxios.get('/quote', {
        params: {
          inputMint: opportunity.inputMint.toBase58(),
          outputMint: opportunity.bridgeMint?.toBase58(),
          amount: opportunity.inputAmount.toString(),
          slippageBps: 50,
          onlyDirectRoutes: true,
          maxAccounts: 20,
        },
        timeout: 2000, // 快速查询
      });
      const secondOutboundMs = Date.now() - outboundStart;

      const outAmount = Number(quoteResponse.data.outAmount || 0);

      // 继续第二段查询（bridgeMint -> outputMint）
      const returnStart = Date.now();
      const backQuoteResponse = await this.jupiterSwapAxios.get('/quote', {
        params: {
          inputMint: opportunity.bridgeMint?.toBase58(),
          outputMint: opportunity.outputMint.toBase58(),
          amount: outAmount.toString(),
          slippageBps: 50,
          onlyDirectRoutes: true,
          maxAccounts: 20,
        },
        timeout: 2000,
      });
      const secondReturnMs = Date.now() - returnStart;

      const backOutAmount = Number(backQuoteResponse.data.outAmount || 0);
      const secondProfit = backOutAmount - opportunity.inputAmount;
      const secondRoi = secondProfit / opportunity.inputAmount;

      const delayMs = Date.now() - startTime;

      return {
        stillExists: secondProfit > 0,  // 用户要求：profit > 0 即存在
        secondProfit,
        secondRoi,
        delayMs,
        secondOutboundMs,
        secondReturnMs,
      };
    } catch (error) {
      const delayMs = Date.now() - startTime;
      logger.warn(`Validation query failed (${delayMs}ms):`, error);

      return {
        stillExists: false,
        secondProfit: 0,
        secondRoi: 0,
        delayMs,
      };
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

    // ✅ 新增：记录第一次检测到的机会
    let opportunityId: bigint | undefined;
    const firstDetectedAt = new Date();
    const firstProfit = BigInt(opportunity.profit);
    const firstRoi = opportunity.roi;

    if (this.config.database?.enabled) {
      try {
        // 🔥 新增：提取路由信息用于数据库分析
        const routeMetadata = this.extractRouteMetadata(opportunity);
        
        opportunityId = await databaseRecorder.recordOpportunity({
          inputMint: opportunity.inputMint.toBase58(),
          outputMint: opportunity.outputMint.toBase58(),
          bridgeToken: opportunity.bridgeToken,
          bridgeMint: opportunity.bridgeMint?.toBase58(),
          inputAmount: BigInt(opportunity.inputAmount),
          outputAmount: BigInt(opportunity.outputAmount),
          bridgeAmount: opportunity.bridgeAmount ? BigInt(opportunity.bridgeAmount) : undefined,
          expectedProfit: firstProfit,
          expectedRoi: firstRoi,
          executed: false,
          filtered: false,
          metadata: routeMetadata,  // 🔥 新增：存储路由元数据
        });
        logger.debug(`📝 Recorded opportunity #${opportunityId} with route metadata`);
      } catch (error) {
        logger.warn('⚠️ Failed to record opportunity (non-blocking):', error);
      }
    }

    // ✅ 新增：立即二次验证
    logger.info('🔄 Performing immediate re-validation...');
    const revalidation = await this.validateOpportunityLifetime(opportunity);
    
    logger.info(
      `📊 Validation result: ` +
      `stillExists=${revalidation.stillExists}, ` +
      `profit=${(revalidation.secondProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL ` +
      `(${(revalidation.secondRoi * 100).toFixed(2)}%), ` +
      `delay=${revalidation.delayMs}ms`
    );

    // ✅ 新增：记录验证结果（包含详细延迟数据）
    if (this.config.database?.enabled && opportunityId) {
      try {
        await databaseRecorder.recordOpportunityValidation({
          opportunityId,
          firstDetectedAt,
          firstProfit,
          firstRoi,
          secondCheckedAt: new Date(),
          stillExists: revalidation.stillExists,
          secondProfit: revalidation.stillExists ? BigInt(revalidation.secondProfit) : undefined,
          secondRoi: revalidation.stillExists ? revalidation.secondRoi : undefined,
          validationDelayMs: revalidation.delayMs,
          // 🔥 新增：详细延迟分析数据
          firstOutboundMs: opportunity.latency?.outboundMs,
          firstReturnMs: opportunity.latency?.returnMs,
          secondOutboundMs: revalidation.secondOutboundMs,
          secondReturnMs: revalidation.secondReturnMs,
        });
      } catch (error) {
        logger.warn('⚠️ Failed to record validation (non-blocking):', error);
      }
    }

    // ✅ 新增：如果机会已消失，记录并退出
    if (!revalidation.stillExists) {
      logger.warn(`⏱️ Opportunity expired after ${revalidation.delayMs}ms, skipping execution`);
      if (this.config.database?.enabled && opportunityId) {
        try {
          await databaseRecorder.markOpportunityFiltered(
            opportunityId,
            `Expired on re-validation: profit dropped to ${(revalidation.secondProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL`
          );
        } catch (error) {
          logger.warn('⚠️ Failed to mark filtered (non-blocking):', error);
        }
      }
      return;
    }

    // 🔥 新增：二次验证通过，推送微信通知
    if (this.monitoring) {
      try {
        await this.monitoring.alertOpportunityValidated({
          inputMint: opportunity.inputMint.toBase58(),
          bridgeToken: opportunity.bridgeToken,
          // 第一次数据
          firstProfit: opportunity.profit,
          firstRoi: opportunity.roi,
          firstOutboundMs: opportunity.latency?.outboundMs,
          firstReturnMs: opportunity.latency?.returnMs,
          // 第二次数据
          secondProfit: revalidation.secondProfit,
          secondRoi: revalidation.secondRoi,
          secondOutboundMs: revalidation.secondOutboundMs,
          secondReturnMs: revalidation.secondReturnMs,
          // 验证延迟
          validationDelayMs: revalidation.delayMs,
        });
        logger.info('📱 二次验证通过通知已发送');
      } catch (error) {
        logger.warn('⚠️ Failed to send validation alert (non-blocking):', error);
      }
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

    // 过滤异常的ROI（可能是API数据错误）
    const MAX_REASONABLE_ROI = 10; // 10% 已经是极其罕见的套利机会
    if (profitRate * 100 > MAX_REASONABLE_ROI) {
      logger.warn(
        `Filtering abnormal opportunity: ROI ${(profitRate * 100).toFixed(2)}% exceeds ` +
        `reasonable limit ${MAX_REASONABLE_ROI}%. Likely API data error.`
      );
      return;
    }

    // 🔥 新增：动态估算优先费
    const { totalFee: priorityFee, strategy } = await this.priorityFeeEstimator.estimateOptimalFee(
      expectedProfit,
      'high' // 套利机会稀缺，使用高优先级
    );
    
    logger.info(`💡 优先费策略: ${strategy}, 费用: ${(priorityFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

    // 🔥 修改：使用完整费用验证闪电贷可行性
    const feeConfig = {
      baseFee: this.config.economics.cost.signatureCount * 5000,
      priorityFee,
      jitoTipPercent: this.config.economics.jito.profitSharePercentage || 30,
      slippageBufferBps: 15, // 0.15% 滑点缓冲
    };
    
    const validation = this.config.flashloan.provider === 'jupiter-lend'
      ? JupiterLendAdapter.validateFlashLoan(borrowAmount, expectedProfit, feeConfig)
      : SolendAdapter.validateFlashLoan(borrowAmount, expectedProfit, feeConfig);

    if (!validation.valid) {
      this.stats.opportunitiesFiltered++;
      logger.debug(
        `❌ 机会被拒绝: ${validation.reason || 'unknown'}`
      );
      if (validation.breakdown) {
        logger.debug(
          `   费用拆解: ` +
          `毛利润=${(validation.breakdown.grossProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL, ` +
          `基础费=${(validation.breakdown.baseFee / LAMPORTS_PER_SOL).toFixed(6)} SOL, ` +
          `优先费=${(validation.breakdown.priorityFee / LAMPORTS_PER_SOL).toFixed(6)} SOL, ` +
          `Jito Tip=${(validation.breakdown.jitoTip / LAMPORTS_PER_SOL).toFixed(6)} SOL, ` +
          `滑点缓冲=${(validation.breakdown.slippageBuffer / LAMPORTS_PER_SOL).toFixed(6)} SOL, ` +
          `净利润=${(validation.breakdown.netProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL`
        );
      }
      return;
    }

    const flashLoanFee = validation.fee;
    const roi = flashLoanFee > 0 
      ? ((validation.netProfit / flashLoanFee) * 100).toFixed(1)
      : 'Infinite'; // Jupiter Lend 0% fee = infinite ROI

    logger.info(
      `✅ 可执行机会 - 净利润: ${(validation.netProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL`
    );
    if (validation.breakdown) {
      logger.info(
        `   费用明细: ` +
        `毛利润=${(validation.breakdown.grossProfit / LAMPORTS_PER_SOL).toFixed(6)} SOL | ` +
        `基础费=${(validation.breakdown.baseFee / LAMPORTS_PER_SOL).toFixed(6)} SOL | ` +
        `优先费=${(validation.breakdown.priorityFee / LAMPORTS_PER_SOL).toFixed(6)} SOL | ` +
        `Jito Tip=${(validation.breakdown.jitoTip / LAMPORTS_PER_SOL).toFixed(6)} SOL | ` +
        `滑点=${(validation.breakdown.slippageBuffer / LAMPORTS_PER_SOL).toFixed(6)} SOL`
      );
    }
    // 🆕 RPC模拟验证（核心优化⭐）
    // 在不消耗任何Gas的情况下，验证交易是否会成功
    logger.info(
      `\n${'═'.repeat(80)}\n` +
      `🔬 RPC Simulation Validation\n` +
      `${'═'.repeat(80)}`
    );

    const simulation = await this.simulateFlashloan(opportunity, borrowAmount);

    if (!simulation.valid) {
      logger.warn(
        `\n❌ Opportunity filtered by RPC simulation\n` +
        `   Reason: ${simulation.reason}\n` +
        `   💰 Saved: 0.116 SOL (Gas + Tip)\n` +
        `${'═'.repeat(80)}\n`
      );
      this.stats.opportunitiesFiltered++;
      
      // 记录模拟过滤的机会（用于统计）
      if (!this.stats.simulationFiltered) this.stats.simulationFiltered = 0;
      if (!this.stats.savedGasSol) this.stats.savedGasSol = 0;
      this.stats.simulationFiltered += 1;
      this.stats.savedGasSol += 0.116;
      
      // 🔥 新增：更新数据库记录（标记为已过滤）
      if (this.config.database?.enabled && opportunityId) {
        try {
          await databaseRecorder.markOpportunityFiltered(
            opportunityId,
            `RPC simulation failed: ${simulation.reason}`
          );
          logger.debug(`📝 Marked opportunity #${opportunityId} as filtered (RPC simulation)`);
        } catch (error) {
          logger.warn('⚠️ Failed to mark filtered (non-blocking):', error);
        }
      }
      
      return;
    }

    logger.info(
      `✅ RPC simulation passed!\n` +
      `   Compute units: ${simulation.unitsConsumed || 'unknown'}\n` +
      `${'═'.repeat(80)}\n`
    );

    logger.info(
      `💰 Processing opportunity: ` +
        `Borrow ${borrowAmount / LAMPORTS_PER_SOL} SOL, ` +
        `Expected profit: ${validation.netProfit / LAMPORTS_PER_SOL} SOL, ` +
        `ROI: ${roi}%`
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
      // 构建套利指令（使用实际借款金额获取准确的swap指令，包含 ALT）
      const { instructions: arbitrageInstructions, lookupTableAccounts } = 
        await this.buildArbitrageInstructions(opportunity, borrowAmount);

      // 构建闪电贷交易
      const recentBlockhash = await this.connection.getLatestBlockhash();
      const userTokenAccount = await this.getOrCreateTokenAccount(
        opportunity.inputMint
      );

      // ✅ 确保 borrowAmount 是 number 类型，避免 BigInt 传递到交易构建
      const borrowAmountSafe = Number(borrowAmount);
      
      const transaction = FlashLoanTransactionBuilder.buildAtomicArbitrageTx(
        {
          useFlashLoan: true,
          flashLoanConfig: {
            protocol: this.config.flashloan.provider === 'jupiter-lend'
              ? FlashLoanProtocol.JUPITER_LEND
              : FlashLoanProtocol.SOLEND,
            amount: borrowAmountSafe,
            tokenMint: opportunity.inputMint,
          },
          arbitrageInstructions,
          wallet: this.keypair.publicKey,
        },
        recentBlockhash.blockhash,
        userTokenAccount,
        lookupTableAccounts  // 传递 ALT 以压缩交易大小
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

        logger.warn(`❌ Flashloan trade failed: ${result.error || 'Unknown error'}`);

        // 发送失败告警
        if (this.monitoring) {
          await this.monitoring.sendAlert({
            type: 'error',
            title: '❌ 闪电贷交易失败',
            description: `闪电贷交易执行失败`,
            fields: [
              { name: '借款金额', value: `${borrowAmount / LAMPORTS_PER_SOL} SOL` },
              { name: '预期利润', value: `${validation.netProfit / LAMPORTS_PER_SOL} SOL` },
              { name: '失败原因', value: result.error || '未知' },
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
   * RPC模拟验证闪电贷交易（核心优化⭐）
   * 
   * 在不消耗任何Gas的情况下，完整模拟交易执行
   * 
   * @param opportunity 套利机会
   * @param borrowAmount 借款金额
   * @returns 模拟结果
   */
  private async simulateFlashloan(
    opportunity: ArbitrageOpportunity,
    borrowAmount: number
  ): Promise<{
    valid: boolean;
    reason?: string;
    logs?: string[];
    unitsConsumed?: number;
  }> {
    logger.info(`🔍 Simulating flashloan with ${borrowAmount / 1e9} SOL...`);
    const startTime = Date.now();

    try {
      // 1. 构建完整的套利指令（包含 ALT）
      const { instructions: arbitrageInstructions, lookupTableAccounts } = 
        await this.buildArbitrageInstructions(opportunity, borrowAmount);

      if (!arbitrageInstructions || arbitrageInstructions.length === 0) {
        return {
          valid: false,
          reason: 'No arbitrage instructions could be built',
        };
      }

      // 验证指令有效性，避免 toBase58() undefined 错误
      if (!this.validateInstructions(arbitrageInstructions)) {
        return {
          valid: false,
          reason: 'Invalid instructions: contains undefined accounts',
        };
      }

      // 2. 构建完整的闪电贷交易
      const recentBlockhash = await this.connection.getLatestBlockhash();
      const userTokenAccount = await this.getOrCreateTokenAccount(
        opportunity.inputMint
      );

      // ✅ 确保 borrowAmount 是 number 类型，避免 BigInt 传递到交易构建
      const borrowAmountSafe = Number(borrowAmount);

      const transaction = FlashLoanTransactionBuilder.buildAtomicArbitrageTx(
        {
          useFlashLoan: true,
          flashLoanConfig: {
            protocol: this.config.flashloan.provider === 'jupiter-lend'
              ? FlashLoanProtocol.JUPITER_LEND
              : FlashLoanProtocol.SOLEND,
            amount: borrowAmountSafe,
            tokenMint: opportunity.inputMint,
          },
          arbitrageInstructions,
          wallet: this.keypair.publicKey,
        },
        recentBlockhash.blockhash,
        userTokenAccount,
        lookupTableAccounts  // 传递 ALT 以压缩交易大小
      );

      // 计算交易大小
      const txSize = transaction.message.serialize().length;
      const maxTxSize = 1232;
      logger.info(
        `📦 Transaction size: ${txSize}/${maxTxSize} bytes ` +
        `(${lookupTableAccounts.length} ALTs, ${arbitrageInstructions.length} instructions)`
      );
      
      if (txSize > maxTxSize) {
        logger.error(`❌ Transaction too large: ${txSize} > ${maxTxSize} bytes`);
      }

      // 3. 签名交易（模拟需要签名）
      transaction.sign([this.keypair]);

      // 4. RPC模拟执行（免费！）⭐
      const simulation = await this.connection.simulateTransaction(
        transaction,
        {
          // 使用 'processed' 承诺级别（最快）
          commitment: 'processed',
          
          // 跳过签名验证（加速，因为只是模拟）
          sigVerify: false,
          
          // 使用最新的区块哈希（避免"Blockhash not found"错误）
          replaceRecentBlockhash: true,
          
          // 包含详细账户信息（可选）
          accounts: {
            encoding: 'base64',
            addresses: [],  // 可以指定要返回状态的账户
          },
        }
      );

      const simTime = Date.now() - startTime;

      // 5. 分析模拟结果
      if (simulation.value.err) {
        // 模拟失败 - 这是我们要过滤的
        const errorMsg = this.parseSimulationError(simulation.value.err);
        
        logger.warn(
          `❌ Simulation failed (${simTime}ms)\n` +
          `   Reason: ${errorMsg}\n` +
          `   🎉 Saved 0.116 SOL (Gas + Tip) by filtering invalid opportunity`
        );

        return {
          valid: false,
          reason: errorMsg,
          logs: simulation.value.logs || [],
        };
      }

      // 模拟成功 - 可以安全执行
      logger.info(
        `✅ Simulation passed (${simTime}ms)\n` +
        `   Compute units: ${simulation.value.unitsConsumed || 'unknown'}\n` +
        `   Log entries: ${simulation.value.logs?.length || 0}`
      );

      // 可选：分析日志，提取实际利润
      if (simulation.value.logs && simulation.value.logs.length > 0) {
        logger.debug(`Simulation logs:`, simulation.value.logs.slice(0, 10));
      }

      return {
        valid: true,
        logs: simulation.value.logs || [],
        unitsConsumed: simulation.value.unitsConsumed,
      };

    } catch (error: any) {
      const simTime = Date.now() - startTime;
      logger.error(`⚠️ Simulation error (${simTime}ms): ${error.message}`);
      
      // 模拟出错也视为无效（保守策略）
      return {
        valid: false,
        reason: `Simulation error: ${error.message}`,
      };
    }
  }

  /**
   * 解析模拟错误信息
   */
  private parseSimulationError(err: any): string {
    if (typeof err === 'string') {
      return err;
    }

    // InstructionError: [index, error]
    if (err.InstructionError) {
      const [index, error] = err.InstructionError;
      
      // 常见错误码解析
      if (error.Custom !== undefined) {
        const errorCode = error.Custom;
        return `Instruction ${index} failed with custom error ${errorCode}`;
      }
      
      if (error.InsufficientFunds) {
        return `Instruction ${index} failed: Insufficient funds`;
      }
      
      if (error.Custom === 1) {
        return `Instruction ${index} failed: Insufficient liquidity in pool`;
      }
      
      return `Instruction ${index} failed: ${JSON.stringify(error)}`;
    }

    // InsufficientFundsForRent
    if (err.InsufficientFundsForRent) {
      return 'Insufficient funds for rent';
    }

    // 其他错误
    return JSON.stringify(err);
  }

  /**
   * 构建套利指令（完整实现）
   * 
   * 环形套利流程：
   * 1. SOL → Bridge Token (USDC/USDT/JUP等)
   * 2. Bridge Token → SOL
   * 
   * @param opportunity 套利机会
   * @param borrowAmount 实际借款金额（用于获取准确的swap指令）
   * @returns 指令数组和 Address Lookup Tables
   */
  private async buildArbitrageInstructions(
    opportunity: ArbitrageOpportunity,
    borrowAmount: number
  ): Promise<{
    instructions: TransactionInstruction[];
    lookupTableAccounts: AddressLookupTableAccount[];
  }> {
    logger.debug(`Building arbitrage instructions for ${borrowAmount / 1e9} SOL...`);

    try {
      // ✅ 验证 bridgeMint 存在
      if (!opportunity.bridgeMint) {
        throw new Error(`Invalid opportunity: bridgeMint is undefined`);
      }

      const instructions: TransactionInstruction[] = [];
      const allALTAddresses = new Set<string>();
      let computeBudgetInstructions: TransactionInstruction[] = [];

      // ===== 第1步：SOL → Bridge Token =====
      logger.debug(`Step 1: ${opportunity.inputMint.toBase58()} → ${opportunity.bridgeMint.toBase58()}`);
      
      // ✅ 确保 borrowAmount 是 number 类型
      const borrowAmountNum = Number(borrowAmount);
      
      const swap1Result = await this.getJupiterSwapInstructions({
        inputMint: opportunity.inputMint,
        outputMint: opportunity.bridgeMint,
        amount: borrowAmountNum,
        slippageBps: this.config.opportunityFinder.slippageBps || 50,
      });

      if (!swap1Result.instructions || swap1Result.instructions.length === 0) {
        throw new Error('Failed to get outbound swap instructions');
      }

      // 收集 ALT 地址和 ComputeBudget 指令（只使用第一个 swap 的）
      swap1Result.addressLookupTableAddresses.forEach(addr => allALTAddresses.add(addr));
      computeBudgetInstructions = swap1Result.computeBudgetInstructions;
      instructions.push(...swap1Result.instructions);

      // ===== 第2步：Bridge Token → SOL =====
      // 注意：这里需要用第1步的实际输出金额
      // 简化处理：使用opportunity中的bridgeAmount（来自Worker查询）
      // 生产环境应该解析swapOut的输出金额
      logger.debug(`Step 2: ${opportunity.bridgeMint.toBase58()} → ${opportunity.outputMint.toBase58()}`);
      
      // ✅ 确保所有计算都使用 number 类型，避免 BigInt 混合
      const bridgeAmountNum = Number(opportunity.bridgeAmount || 0);
      const inputAmountNum = Number(opportunity.inputAmount);
      
      const bridgeAmountScaled = Math.floor(
        bridgeAmountNum * (borrowAmountNum / inputAmountNum)
      );

      const swap2Result = await this.getJupiterSwapInstructions({
        inputMint: opportunity.bridgeMint,
        outputMint: opportunity.outputMint,
        amount: bridgeAmountScaled,
        slippageBps: this.config.opportunityFinder.slippageBps || 50,
      });

      if (!swap2Result.instructions || swap2Result.instructions.length === 0) {
        throw new Error('Failed to get return swap instructions');
      }

      // 收集 ALT 地址（不再添加 ComputeBudget 指令，避免重复）
      swap2Result.addressLookupTableAddresses.forEach(addr => allALTAddresses.add(addr));
      instructions.push(...swap2Result.instructions);

      // 加载所有 ALT
      const lookupTableAccounts = await this.loadAddressLookupTables(
        Array.from(allALTAddresses)
      );

      // ✅ 将 ComputeBudget 指令放在最前面（必须在交易最开始）
      const finalInstructions = [
        ...computeBudgetInstructions,
        ...instructions,
      ];

      const totalCompressedAddrs = lookupTableAccounts.reduce((sum: number, alt: AddressLookupTableAccount) => sum + alt.state.addresses.length, 0);
      logger.info(
        `✅ Built ${finalInstructions.length} total instructions (${computeBudgetInstructions.length} budget + ${instructions.length} swap) ` +
        `with ${lookupTableAccounts.length} ALTs (${totalCompressedAddrs} compressed addresses)`
      );
      
      return {
        instructions: finalInstructions,
        lookupTableAccounts,
      };

    } catch (error: any) {
      logger.error(`Failed to build arbitrage instructions: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从Jupiter V6 API获取Swap指令
   * 
   * 使用正确的V6 API流程：quote → swap-instructions → deserialize
   * 返回指令和 Address Lookup Table 地址
   * 使用专用连接池和增强的重试机制
   */
  private async getJupiterSwapInstructions(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    slippageBps: number;
  }): Promise<{
    instructions: TransactionInstruction[];
    addressLookupTableAddresses: string[];
    computeBudgetInstructions: TransactionInstruction[];
  }> {
    const maxRetries = 3;
    const retryDelays = [100, 500, 1000];  // Fast retry
    
    // ✅ 确保 amount 是 number 类型，避免 BigInt 问题
    const amountNum = Number(params.amount);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Step 1: GET /quote
        const quoteResponse = await this.jupiterSwapAxios.get('/quote', {
          params: {
            inputMint: params.inputMint.toBase58(),
            outputMint: params.outputMint.toBase58(),
            amount: amountNum.toString(),
            slippageBps: params.slippageBps,
            onlyDirectRoutes: true,   // ✅ 只使用直接路由，减少账户数
            maxAccounts: 20,          // ✅ 严格限制账户数 (官方建议)
          },
        });

        if (!quoteResponse.data) {
          throw new Error('No quote data received');
        }

        // Step 2: POST /swap-instructions (官方推荐方法)
        // 直接返回已解析的指令，无需手动处理 ALT
        const swapInstructionsResponse = await this.jupiterSwapAxios.post('/swap-instructions', {
          quoteResponse: quoteResponse.data,
          userPublicKey: this.keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
        }, {
          timeout: 3000,
        });

        if (swapInstructionsResponse.data?.error) {
          throw new Error(`Jupiter API error: ${swapInstructionsResponse.data.error}`);
        }

        const {
          computeBudgetInstructions,
          setupInstructions,
          swapInstruction: swapInstructionPayload,
          cleanupInstruction,
        } = swapInstructionsResponse.data;

        // Step 3: 反序列化指令（从 JSON 转为 TransactionInstruction）
        const deserializeInstruction = (instruction: any): TransactionInstruction | null => {
          if (!instruction) return null;
          
          return new TransactionInstruction({
            programId: new PublicKey(instruction.programId),
            keys: instruction.accounts.map((key: any) => ({
              pubkey: new PublicKey(key.pubkey),
              isSigner: key.isSigner,
              isWritable: key.isWritable,
            })),
            data: Buffer.from(instruction.data, 'base64'),
          });
        };

        // Step 4: 分别组装指令
        const instructions: TransactionInstruction[] = [];
        const budgetInstructions: TransactionInstruction[] = [];

        // 提取计算预算指令（单独返回，避免重复）
        if (computeBudgetInstructions) {
          for (const ix of computeBudgetInstructions) {
            const deserialized = deserializeInstruction(ix);
            if (deserialized) budgetInstructions.push(deserialized);
          }
        }

        // 添加设置指令（ATA 创建等）
        if (setupInstructions) {
          for (const ix of setupInstructions) {
            const deserialized = deserializeInstruction(ix);
            if (deserialized) instructions.push(deserialized);
          }
        }

        // 添加核心 swap 指令
        if (swapInstructionPayload) {
          const swapIx = deserializeInstruction(swapInstructionPayload);
          if (swapIx) instructions.push(swapIx);
        }

        // 添加清理指令
        if (cleanupInstruction) {
          const cleanupIx = deserializeInstruction(cleanupInstruction);
          if (cleanupIx) instructions.push(cleanupIx);
        }

        logger.debug(`✅ Extracted ${instructions.length} swap instructions + ${budgetInstructions.length} budget instructions`);
        this.recordJupiterApiCall(true);
        
        // 返回指令和 ALT 地址（ComputeBudget 指令分离）
        return {
          instructions,
          computeBudgetInstructions: budgetInstructions,
          addressLookupTableAddresses: swapInstructionsResponse.data.addressLookupTableAddresses || [],
        };

      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries - 1;

        // 404: No route
        if (error.response?.status === 404) {
          logger.warn(`No route: ${params.inputMint.toBase58()} → ${params.outputMint.toBase58()}`);
          this.recordJupiterApiCall(false, '404');
          return { instructions: [], computeBudgetInstructions: [], addressLookupTableAddresses: [] };
        }

        // TLS/Network errors
        const isTLSError = 
          error.message?.includes('socket disconnected') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('TLS') ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT';

        // 5xx errors
        const is5xxError = error.response?.status >= 500;

        // 429 rate limit
        const isRateLimitError = error.response?.status === 429;

        if ((isTLSError || is5xxError || isRateLimitError) && !isLastAttempt) {
          const delay = isRateLimitError ? retryDelays[attempt] * 3 : retryDelays[attempt];
          logger.warn(
            `Jupiter API error (${error.response?.status || error.code || 'network'}), ` +
            `retry in ${delay}ms (${attempt + 1}/${maxRetries})`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Last attempt or non-retryable
        if (isLastAttempt && (isTLSError || is5xxError)) {
          logger.error(`Jupiter API failed after ${maxRetries} attempts`);
          this.recordJupiterApiCall(false, isTLSError ? 'tls' : '5xx');
          return { instructions: [], computeBudgetInstructions: [], addressLookupTableAddresses: [] };
        }

        logger.error(`Jupiter V6 API error: ${error.message}`);
        throw error;
      }
    }

    return { instructions: [], computeBudgetInstructions: [], addressLookupTableAddresses: [] };
  }

  /**
   * Record Jupiter API call statistics
   */
  private recordJupiterApiCall(success: boolean, errorType?: string): void {
    this.jupiterApiStats.total++;
    if (success) {
      this.jupiterApiStats.success++;
    } else if (errorType === 'tls') {
      this.jupiterApiStats.tlsErrors++;
    } else if (errorType === '5xx') {
      this.jupiterApiStats.serverErrors++;
    } else if (errorType === '404') {
      this.jupiterApiStats.routeNotFound++;
    }

    // Log stats every 100 calls
    if (this.jupiterApiStats.total % 100 === 0) {
      const successRate = (this.jupiterApiStats.success / this.jupiterApiStats.total * 100).toFixed(1);
      logger.info(
        `📊 Jupiter API: ${successRate}% success ` +
        `(TLS: ${this.jupiterApiStats.tlsErrors}, 5xx: ${this.jupiterApiStats.serverErrors}, 404: ${this.jupiterApiStats.routeNotFound})`
      );
    }
  }

  /**
   * 加载 Address Lookup Tables（带缓存优化）
   * 从 RPC 获取 ALT 账户信息，用于压缩交易大小
   * 使用缓存减少重复 RPC 查询，提升性能
   * 
   * @param addresses ALT 地址数组
   * @returns 加载的 ALT 账户数组
   */
  private async loadAddressLookupTables(
    addresses: string[]
  ): Promise<AddressLookupTableAccount[]> {
    if (!addresses || addresses.length === 0) {
      logger.debug('⚠️ No ALT addresses to load');
      return [];
    }

    const now = Date.now();
    const accounts: AddressLookupTableAccount[] = [];
    const toFetch: PublicKey[] = [];
    const toFetchAddresses: string[] = [];

    // 检查缓存
    for (const address of addresses) {
      const cached = this.altCache.get(address);
      if (cached && (now - cached.timestamp) < this.ALT_CACHE_TTL) {
        accounts.push(cached.account);
        logger.debug(`✅ ALT cache hit: ${address.slice(0, 8)}...`);
      } else {
        toFetch.push(new PublicKey(address));
        toFetchAddresses.push(address);
      }
    }

    // 批量获取未缓存的 ALT
    if (toFetch.length > 0) {
      logger.debug(`🔄 Fetching ${toFetch.length} ALTs from RPC...`);
      
      try {
        const accountInfos = await this.connection.getMultipleAccountsInfo(toFetch);
        
        for (let i = 0; i < accountInfos.length; i++) {
          const accountInfo = accountInfos[i];
          if (accountInfo) {
            const lookupTableAccount = new AddressLookupTableAccount({
              key: toFetch[i],
              state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
            accounts.push(lookupTableAccount);
            
            // 更新缓存
            this.altCache.set(toFetchAddresses[i], {
              account: lookupTableAccount,
              timestamp: now,
            });
            
            logger.debug(
              `✅ ALT loaded & cached: ${toFetchAddresses[i].slice(0, 8)}... ` +
              `(${lookupTableAccount.state.addresses.length} addresses)`
            );
          } else {
            logger.warn(`⚠️ Failed to load ALT: ${toFetchAddresses[i]}`);
          }
        }
      } catch (error: any) {
        logger.error(`❌ Failed to load Address Lookup Tables: ${error.message}`);
        return accounts; // 返回已缓存的部分
      }
    }

    const totalAddresses = accounts.reduce(
      (sum, alt) => sum + alt.state.addresses.length,
      0
    );
    logger.info(
      `📋 Total ALTs loaded: ${accounts.length} ` +
      `(${accounts.length - toFetch.length} from cache, ${toFetch.length} from RPC) ` +
      `with ${totalAddresses} compressed addresses`
    );
    
    return accounts;
  }

  /**
   * 验证交易指令的有效性
   * 检查所有 pubkey 是否都已定义，避免序列化时出现 toBase58() undefined 错误
   */
  private validateInstructions(instructions: TransactionInstruction[]): boolean {
    for (let i = 0; i < instructions.length; i++) {
      const ix = instructions[i];
      if (!ix.programId) {
        logger.error(`Instruction ${i}: programId is undefined`);
        return false;
      }
      for (let j = 0; j < ix.keys.length; j++) {
        if (!ix.keys[j].pubkey) {
          logger.error(`Instruction ${i}, key ${j}: pubkey is undefined`);
          return false;
        }
      }
    }
    return true;
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
    logger.info(`  └─ By RPC Simulation: ${this.stats.simulationFiltered} (saved ${this.stats.savedGasSol.toFixed(4)} SOL)`);
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
    logger.info('🎉 RPC Simulation Optimization:');
    logger.info(`  Gas Saved: ${this.stats.savedGasSol.toFixed(4)} SOL ($${(this.stats.savedGasSol * 200).toFixed(2)})`);
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
  
  // 支持多种参数格式：
  // 1. --config=path/to/file.toml
  // 2. path/to/file.toml (直接位置参数，通过 pnpm -- 传递)
  let configPath = args.find((arg) => arg.startsWith('--config='))?.split('=')[1];
  
  if (!configPath && args.length > 0 && !args[0].startsWith('--')) {
    // 第一个非选项参数作为配置文件路径
    configPath = args[0];
  }
  
  // 默认配置文件
  if (!configPath) {
    configPath = 'configs/flashloan-dryrun.toml';  // ✅ 改为dryrun作为默认（更安全）
  }

  logger.info(`Loading config from: ${configPath}`);

  // 加载配置
  let config = FlashloanBot.loadConfig(configPath);
  
  // 校验和调整配置
  config = FlashloanBot.validateAndAdjustConfig(config);

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

