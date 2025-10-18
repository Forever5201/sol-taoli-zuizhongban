/**
 * 经济模型演示
 * 
 * 展示如何使用经济模型系统进行完整的套利决策流程
 */

import {
  createEconomicsSystem,
  ArbitrageOpportunity,
  CostConfig,
  RiskCheckConfig,
  CapitalSize,
} from '../packages/core/src/economics';

/**
 * 模拟套利机会
 */
function createMockOpportunity(): ArbitrageOpportunity {
  return {
    tokenPair: 'SOL/USDC',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    inputAmount: 1_000_000_000, // 1 SOL
    expectedOutput: 1_000_500_000, // 1.0005 SOL worth
    grossProfit: 500_000, // 0.0005 SOL
    route: ['Raydium', 'Orca'],
    poolLiquidity: 100_000, // $100k
    estimatedSlippage: 0.005, // 0.5%
    discoveredAt: Date.now(),
  };
}

/**
 * 主演示函数
 */
async function demo() {
  console.log('🎯 ========== 经济模型系统演示 ==========\n');

  // 1. 创建经济模型系统
  console.log('📦 创建经济模型系统...');
  const economics = createEconomicsSystem({
    circuitBreaker: {
      maxConsecutiveFailures: 3,
      maxHourlyLoss: 500_000,
      minSuccessRate: 0.3,
      cooldownPeriod: 300_000,
      autoRecovery: true,
    },
  });
  console.log('✅ 系统创建成功\n');

  // 2. 模拟套利机会
  console.log('🔍 发现套利机会:');
  const opportunity = createMockOpportunity();
  console.log(`  交易对: ${opportunity.tokenPair}`);
  console.log(`  路径: ${opportunity.route.join(' → ')}`);
  console.log(`  毛利润: ${(opportunity.grossProfit / 1e9).toFixed(6)} SOL`);
  console.log(`  流动性: $${opportunity.poolLiquidity.toLocaleString()}`);
  console.log('');

  // 3. 验证机会有效性
  console.log('✔️  验证机会...');
  const validation = economics.riskManager.validateOpportunity(opportunity);
  if (!validation.valid) {
    console.error(`❌ 机会无效: ${validation.reason}`);
    return;
  }
  console.log('✅ 机会有效\n');

  // 4. 成本计算
  console.log('💰 计算交易成本...');
  const capitalSize: CapitalSize = 'medium';
  const costConfig: CostConfig = {
    signatureCount: 3,
    computeUnits: 300_000,
    computeUnitPrice: 10_000,
    useFlashLoan: false,
  };

  // 获取 Jito 小费
  console.log('  获取 Jito 小费数据...');
  const jitoTip = await economics.jitoTipOptimizer.calculateOptimalTip(
    opportunity.grossProfit,
    0.5, // 中等竞争
    0.3, // 低紧迫性
    capitalSize
  );
  console.log(`  推荐小费: ${(jitoTip / 1e9).toFixed(9)} SOL`);

  const costs = economics.costCalculator.calculateTotalCost(costConfig, jitoTip);
  console.log('\n  成本明细:');
  console.log(`    基础费: ${costs.breakdown!.baseFee}`);
  console.log(`    优先费: ${costs.breakdown!.priorityFee}`);
  console.log(`    Jito 小费: ${costs.breakdown!.jitoTip}`);
  console.log(`    总成本: ${costs.breakdown!.total}`);
  console.log('');

  // 5. 利润分析
  console.log('📊 利润分析...');
  const analysis = economics.profitAnalyzer.analyzeProfitability(
    opportunity,
    costConfig,
    jitoTip
  );

  console.log(economics.profitAnalyzer.generateReport(analysis));

  // 6. 风险评估
  console.log('⚠️  风险评估...');
  const riskConfig: RiskCheckConfig = {
    minProfitThreshold: 50_000,
    maxGasPrice: 30_000,
    maxJitoTip: 50_000,
    maxSlippage: 0.015,
    minLiquidity: 10_000,
    minROI: 40,
  };

  const riskCheck = economics.riskManager.preExecutionCheck(
    opportunity,
    analysis,
    riskConfig
  );

  console.log(economics.riskManager.generateRiskReport(opportunity, analysis, riskCheck));

  // 7. 执行决策
  console.log('🎯 执行决策...');
  if (riskCheck.passed && analysis.isProfitable) {
    console.log('✅ 建议执行此套利交易');
    console.log(`   预期净利润: ${(analysis.netProfit / 1e9).toFixed(6)} SOL`);
    console.log(`   投资回报率: ${analysis.roi.toFixed(2)}%`);
    
    // 模拟执行结果
    const success = Math.random() > 0.3; // 70% 成功率
    
    console.log(`\n📡 执行交易... ${success ? '✅ 成功' : '❌ 失败'}`);
    
    // 记录到熔断器
    economics.circuitBreaker.recordTransaction({
      success,
      profit: success ? analysis.netProfit : undefined,
      cost: success ? undefined : costs.total,
      timestamp: Date.now(),
    });

    // 记录到 Jito 优化器
    economics.jitoTipOptimizer.recordBundleResult({
      bundleId: 'mock-bundle-id-' + Date.now(),
      success,
      tip: jitoTip,
      profit: success ? analysis.netProfit : undefined,
      tokenPair: opportunity.tokenPair,
      timestamp: Date.now(),
    });
  } else {
    console.log('❌ 不建议执行此套利交易');
    if (riskCheck.reason) {
      console.log(`   原因: ${riskCheck.reason}`);
    }
  }
  console.log('');

  // 8. 熔断器状态
  console.log('🔒 熔断器状态...');
  console.log(economics.circuitBreaker.generateStatusReport());

  // 9. 历史统计
  console.log('📈 Jito 小费历史统计...');
  const stats = economics.jitoTipOptimizer.getHistoryStats(opportunity.tokenPair);
  if (stats.totalBundles > 0) {
    console.log(`  总 Bundle 数: ${stats.totalBundles}`);
    console.log(`  成功率: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  平均小费: ${(stats.avgTip / 1e9).toFixed(9)} SOL`);
    console.log(`  成功时平均小费: ${(stats.avgSuccessTip / 1e9).toFixed(9)} SOL`);
    console.log(`  失败时平均小费: ${(stats.avgFailedTip / 1e9).toFixed(9)} SOL`);
  } else {
    console.log('  暂无历史数据');
  }
  console.log('');

  console.log('====================================\n');
}

/**
 * 批量机会评估演示
 */
async function batchDemo() {
  console.log('🎯 ========== 批量机会评估演示 ==========\n');

  const economics = createEconomicsSystem({
    circuitBreaker: {
      maxConsecutiveFailures: 5,
      maxHourlyLoss: 1_000_000,
      minSuccessRate: 0.4,
    },
  });

  // 创建多个机会
  const opportunities: ArbitrageOpportunity[] = [
    {
      ...createMockOpportunity(),
      tokenPair: 'SOL/USDC',
      grossProfit: 300_000,
      poolLiquidity: 50_000,
    },
    {
      ...createMockOpportunity(),
      tokenPair: 'SOL/USDT',
      grossProfit: 500_000,
      poolLiquidity: 100_000,
    },
    {
      ...createMockOpportunity(),
      tokenPair: 'BONK/SOL',
      grossProfit: 800_000,
      poolLiquidity: 200_000,
      estimatedSlippage: 0.015,
    },
  ];

  console.log(`📋 评估 ${opportunities.length} 个套利机会...\n`);

  const costConfig: CostConfig = {
    signatureCount: 3,
    computeUnits: 300_000,
    computeUnitPrice: 10_000,
    useFlashLoan: false,
  };

  const jitoTip = await economics.jitoTipOptimizer.getTipAtPercentile(75);

  const evaluated = economics.profitAnalyzer.evaluateMultipleOpportunities(
    opportunities,
    costConfig,
    jitoTip
  );

  console.log('排名（按净利润）:');
  evaluated.forEach((item, index) => {
    const { opportunity, analysis } = item;
    console.log(`\n${index + 1}. ${opportunity.tokenPair}`);
    console.log(`   毛利润: ${(opportunity.grossProfit / 1e9).toFixed(6)} SOL`);
    console.log(`   净利润: ${(analysis.netProfit / 1e9).toFixed(6)} SOL`);
    console.log(`   ROI: ${analysis.roi.toFixed(2)}%`);
    console.log(`   盈利: ${analysis.isProfitable ? '✅' : '❌'}`);
  });

  // 选择最佳机会
  const best = economics.profitAnalyzer.getBestOpportunity(
    opportunities,
    costConfig,
    jitoTip,
    50_000, // 最小利润
    30 // 最小 ROI
  );

  console.log('\n🏆 最佳机会:');
  if (best) {
    console.log(`   ${best.opportunity.tokenPair}`);
    console.log(`   净利润: ${(best.analysis.netProfit / 1e9).toFixed(6)} SOL`);
  } else {
    console.log('   无符合条件的机会');
  }

  console.log('\n====================================\n');
}

// 主程序
async function main() {
  try {
    // 单个机会演示
    await demo();

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 批量机会演示
    await batchDemo();
  } catch (error) {
    console.error('❌ 演示失败:', error);
    process.exit(1);
  }
}

main();



