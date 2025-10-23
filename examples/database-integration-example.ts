/**
 * 数据库集成示例
 * 
 * 展示如何在 FlashloanBot 中集成数据库记录功能
 */

import {
  initDatabase,
  checkDatabaseHealth,
  databaseRecorder,
  databaseQuery,
  databaseStatistics,
  createCleanupService,
} from '@solana-arb-bot/core';

/**
 * 初始化数据库
 */
async function initializeDatabaseExample() {
  // 1. 初始化数据库连接
  const db = initDatabase({
    url: process.env.DATABASE_URL,
    poolSize: 10,
    connectionTimeout: 30,
    logQueries: process.env.NODE_ENV === 'development',
  });

  // 2. 检查数据库健康状态
  const health = await checkDatabaseHealth();
  if (!health.healthy) {
    console.error('Database is not healthy:', health.error);
    process.exit(1);
  }

  console.log('✅ Database connected successfully');
  return db;
}

/**
 * 记录套利机会示例
 */
async function recordOpportunityExample() {
  // 当机会发现器发现机会时调用
  const opportunityId = await databaseRecorder.recordOpportunity({
    inputMint: 'So11111qqoLgaMqgg9LS5w5zzHMTWxwRgCeBZQoQoqC1',
    outputMint: 'So11111qqoLgaMqgg9LS5w5zzHMTWxwRgCeBZQoQoqC1',
    bridgeToken: 'USDC',
    bridgeMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    inputAmount: 10_000_000_000n, // 10 SOL
    outputAmount: 10_050_000_000n, // 10.05 SOL
    bridgeAmount: 10_000_000_000n,
    expectedProfit: 50_000_000n, // 0.05 SOL
    expectedRoi: 0.5, // 0.5%
    executed: false,
    filtered: false,
    metadata: {
      route: ['Raydium', 'Orca'],
      discoveredBy: 'jupiter-api',
    },
  });

  console.log(`✅ Opportunity recorded with ID: ${opportunityId}`);
  return opportunityId;
}

/**
 * 记录交易示例
 */
async function recordTradeExample(opportunityId?: bigint) {
  // 当交易执行后调用
  const tradeId = await databaseRecorder.recordTrade({
    signature: 'abc123def456...',
    status: 'success',
    inputMint: 'So11111qqoLgaMqgg9LS5w5zzHMTWxwRgCeBZQoQoqC1',
    outputMint: 'So11111qqoLgaMqgg9LS5w5zzHMTWxwRgCeBZQoQoqC1',
    bridgeToken: 'USDC',
    bridgeMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    inputAmount: 100_000_000_000n, // 100 SOL (闪电贷)
    outputAmount: 100_500_000_000n, // 100.5 SOL
    bridgeAmount: 100_000_000_000n,
    grossProfit: 500_000_000n, // 0.5 SOL
    netProfit: 450_000_000n, // 0.45 SOL
    roi: 0.45,
    flashloanFee: 90_000_000n, // 0.09 SOL (0.09%)
    flashloanAmount: 100_000_000_000n,
    flashloanProvider: 'solend',
    jitoTip: 10_000_000n, // 0.01 SOL
    gasFee: 5_000_000n, // 0.005 SOL
    priorityFee: 0n,
    totalFee: 105_000_000n,
    computeUnitsUsed: 800_000,
    computeUnitPrice: 20_000,
    opportunityId,
    metadata: {
      routes: [
        { dex: 'Raydium', direction: 'outbound' },
        { dex: 'Orca', direction: 'return' },
      ],
    },
  });

  console.log(`✅ Trade recorded with ID: ${tradeId}`);

  // 如果关联了机会，标记为已执行
  if (opportunityId) {
    await databaseRecorder.markOpportunityExecuted(opportunityId, tradeId);
    console.log(`✅ Opportunity ${opportunityId} marked as executed`);
  }

  // 记录路由详情
  await databaseRecorder.recordTradeRoutes(tradeId, [
    {
      stepNumber: 1,
      direction: 'outbound',
      dexName: 'Raydium',
      poolAddress: 'pool123...',
      inputMint: 'So11111qqoLgaMqgg9LS5w5zzHMTWxwRgCeBZQoQoqC1',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      inputAmount: 100_000_000_000n,
      outputAmount: 10_000_000_000n,
      priceImpact: 0.05,
    },
    {
      stepNumber: 2,
      direction: 'return',
      dexName: 'Orca',
      poolAddress: 'pool456...',
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      outputMint: 'So11111qqoLgaMqgg9LS5w5zzHMTWxwRgCeBZQoQoqC1',
      inputAmount: 10_000_000_000n,
      outputAmount: 100_500_000_000n,
      priceImpact: 0.03,
    },
  ]);

  console.log(`✅ Trade routes recorded`);
  return tradeId;
}

/**
 * 查询数据示例
 */
async function queryDataExample() {
  console.log('\n📊 查询示例:');

  // 1. 获取最近的交易
  const recentTrades = await databaseQuery.getRecentTrades(5);
  console.log(`\n最近 ${recentTrades.length} 笔交易:`);
  recentTrades.forEach((trade, index) => {
    const profit = Number(trade.netProfit) / 1e9;
    const roi = trade.roi ? Number(trade.roi) : 0;
    console.log(
      `${index + 1}. ${trade.signature.slice(0, 8)}... | ` +
        `Profit: ${profit.toFixed(4)} SOL | ROI: ${roi.toFixed(2)}%`
    );
  });

  // 2. 获取交易汇总
  const summary = await databaseQuery.getTradeSummary();
  console.log('\n📈 交易汇总:');
  console.log(`总交易数: ${summary.totalTrades}`);
  console.log(`成功交易: ${summary.successfulTrades}`);
  console.log(`成功率: ${summary.successRate.toFixed(2)}%`);
  console.log(`总利润: ${Number(summary.totalNetProfit) / 1e9} SOL`);
  console.log(`平均利润: ${Number(summary.avgProfit) / 1e9} SOL`);

  // 3. 获取最赚钱的代币对
  const topPairs = await databaseQuery.getTopTokenPairs(5);
  console.log('\n💰 最赚钱的代币对:');
  topPairs.forEach((pair, index) => {
    const totalProfit = Number(pair.totalProfit) / 1e9;
    console.log(
      `${index + 1}. ${pair.bridgeToken || 'Direct'}: ` +
        `${totalProfit.toFixed(4)} SOL (${pair.count} trades)`
    );
  });
}

/**
 * 统计分析示例
 */
async function statisticsExample() {
  console.log('\n📊 统计分析示例:');

  // 1. 计算今日统计
  const today = new Date();
  await databaseStatistics.calculateDailyStats(today);
  console.log('✅ 今日统计已计算');

  // 2. 获取性能指标
  const metrics = await databaseStatistics.getPerformanceMetrics();
  console.log('\n⚡ 性能指标:');
  console.log(`总交易数: ${metrics.totalTrades}`);
  console.log(`成功率: ${metrics.successRate.toFixed(2)}%`);
  console.log(`总利润: ${Number(metrics.totalNetProfit) / 1e9} SOL`);
  console.log(`平均ROI: ${metrics.avgRoi.toFixed(2)}%`);

  if (metrics.bestTrade) {
    console.log(
      `\n🏆 最佳交易: ${Number(metrics.bestTrade.profit) / 1e9} SOL (ROI: ${metrics.bestTrade.roi.toFixed(2)}%)`
    );
  }

  // 3. 获取ROI分布
  const distribution = await databaseStatistics.getROIDistribution();
  console.log('\n📊 ROI 分布:');
  distribution.ranges.forEach((range) => {
    if (range.count > 0) {
      console.log(
        `${range.min}%-${range.max === Infinity ? '+' : range.max + '%'}: ` +
          `${range.count} trades (${range.percentage.toFixed(1)}%)`
      );
    }
  });

  // 4. 获取DEX性能
  const dexPerf = await databaseStatistics.getDEXPerformance();
  console.log('\n🔄 DEX 性能:');
  dexPerf.forEach((dex) => {
    const volume = Number(dex.totalVolume) / 1e9;
    console.log(
      `${dex.dexName}: ${volume.toFixed(2)} SOL volume, ` +
        `${dex.avgPriceImpact.toFixed(4)}% avg impact`
    );
  });
}

/**
 * 数据清理示例
 */
async function cleanupExample() {
  console.log('\n🧹 数据清理示例:');

  const cleanup = createCleanupService({
    opportunitiesRetentionDays: 30,
    enableAutoCleanup: true,
  });

  // 获取数据库统计
  const stats = await cleanup.getDatabaseStats();
  console.log('\n📊 数据库统计:');
  console.log(`总交易数: ${stats.totalTrades}`);
  console.log(`总机会数: ${stats.totalOpportunities}`);
  console.log(`总路由数: ${stats.totalRoutes}`);
  console.log(`最早交易: ${stats.oldestTrade?.toLocaleDateString()}`);
  console.log(`最早机会: ${stats.oldestOpportunity?.toLocaleDateString()}`);

  // 执行清理（可选）
  // const result = await cleanup.performFullCleanup();
  // console.log(`\n✅ 清理完成:`);
  // console.log(`删除机会: ${result.opportunitiesDeleted}`);
  // console.log(`删除过滤机会: ${result.filteredDeleted}`);
  // console.log(`删除孤立路由: ${result.orphanedRoutesDeleted}`);
}

/**
 * 完整的集成示例
 */
async function fullIntegrationExample() {
  try {
    console.log('=== 数据库集成完整示例 ===\n');

    // 1. 初始化数据库
    await initializeDatabaseExample();

    // 2. 记录机会和交易
    const opportunityId = await recordOpportunityExample();
    await recordTradeExample(opportunityId);

    // 3. 查询数据
    await queryDataExample();

    // 4. 统计分析
    await statisticsExample();

    // 5. 数据清理
    await cleanupExample();

    console.log('\n✅ 所有示例完成');
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

// 在 FlashloanBot 中的实际集成
export class FlashloanBotWithDatabase {
  private databaseEnabled: boolean;

  constructor(config: any) {
    this.databaseEnabled = config.database?.enabled || false;

    if (this.databaseEnabled) {
      // 初始化数据库
      initDatabase({
        url: config.database.url || process.env.DATABASE_URL,
        poolSize: config.database.poolSize || 10,
      });

      // 启动自动清理
      const cleanup = createCleanupService({
        opportunitiesRetentionDays: config.database.retention?.opportunities_days || 30,
        enableAutoCleanup: config.database.retention?.enable_auto_cleanup || true,
      });
      cleanup.startAutoCleanup(config.database.retention?.cleanup_interval_hours || 24);
    }
  }

  /**
   * 处理机会（修改版 - 添加数据库记录）
   */
  async handleOpportunity(opportunity: any): Promise<void> {
    let opportunityId: bigint | undefined;

    // 记录机会到数据库
    if (this.databaseEnabled) {
      try {
        opportunityId = await databaseRecorder.recordOpportunity({
          inputMint: opportunity.inputMint.toBase58(),
          outputMint: opportunity.outputMint.toBase58(),
          bridgeToken: opportunity.bridgeToken,
          bridgeMint: opportunity.bridgeMint?.toBase58(),
          inputAmount: BigInt(opportunity.inputAmount),
          outputAmount: BigInt(opportunity.outputAmount),
          bridgeAmount: opportunity.bridgeAmount ? BigInt(opportunity.bridgeAmount) : undefined,
          expectedProfit: BigInt(opportunity.profit),
          expectedRoi: opportunity.roi,
          metadata: {
            route: opportunity.route,
            timestamp: opportunity.timestamp,
          },
        });
      } catch (error) {
        console.error('Failed to record opportunity:', error);
      }
    }

    // 执行套利逻辑...
    // const result = await this.executeArbitrage(opportunity);

    // 如果机会被过滤
    if (opportunityId && /* filtered */ false) {
      await databaseRecorder.markOpportunityFiltered(opportunityId, 'low_profit');
    }
  }

  /**
   * 记录交易结果（修改版 - 添加数据库记录）
   */
  async recordTradeResult(result: any, opportunityId?: bigint): Promise<void> {
    if (!this.databaseEnabled) return;

    try {
      const tradeId = await databaseRecorder.recordTrade({
        signature: result.signature,
        status: result.success ? 'success' : 'failed',
        errorMessage: result.errors?.join(', '),
        inputMint: result.inputMint,
        outputMint: result.outputMint,
        bridgeToken: result.bridgeToken,
        bridgeMint: result.bridgeMint,
        inputAmount: BigInt(result.inputAmount),
        outputAmount: BigInt(result.outputAmount),
        grossProfit: BigInt(result.grossProfit),
        netProfit: BigInt(result.netProfit),
        roi: result.roi,
        flashloanFee: BigInt(result.flashloanFee || 0),
        flashloanAmount: BigInt(result.flashloanAmount || 0),
        flashloanProvider: result.flashloanProvider,
        jitoTip: BigInt(result.jitoTip || 0),
        gasFee: BigInt(result.gasFee || 0),
        totalFee: BigInt(result.totalFee),
        opportunityId,
        metadata: result.metadata,
      });

      // 标记机会为已执行
      if (opportunityId) {
        await databaseRecorder.markOpportunityExecuted(opportunityId, tradeId);
      }

      // 记录路由详情
      if (result.routes) {
        await databaseRecorder.recordTradeRoutes(tradeId, result.routes);
      }
    } catch (error) {
      console.error('Failed to record trade:', error);
    }
  }
}

// 运行示例（如果直接执行此文件）
if (require.main === module) {
  fullIntegrationExample().catch(console.error);
}

export { fullIntegrationExample };



