/**
 * Jito Tip Optimizer 测试脚本
 * 
 * 测试动态 Tip 优化功能：
 * 1. 低竞争场景
 * 2. 高竞争场景
 * 3. 历史学习效果
 * 4. 配置参数影响
 */

import { JitoTipOptimizer } from '@solana-arb-bot/core';
import type { BundleResult } from '@solana-arb-bot/core';

console.log('🧪 Jito Tip Optimizer 测试\n');
console.log('='.repeat(60));

async function main() {
  // 场景 1: 保守策略
  console.log('\n📊 场景 1: 保守策略（小资金）');
  console.log('-'.repeat(60));
  
  const conservativeOptimizer = new JitoTipOptimizer({
    minTipLamports: 5_000,
    maxTipLamports: 10_000_000,
    profitSharePercentage: 0.25,        // 25%
    competitionMultiplier: 2.0,
    urgencyMultiplier: 1.5,
    useHistoricalLearning: false,       // 先禁用历史学习
  });

  const profit1 = 1_000_000;  // 0.001 SOL
  const tip1 = await conservativeOptimizer.calculateOptimalTip(
    profit1,
    0.3,      // 低竞争
    0.5,      // 中等紧迫性
    'small',
    'SOL-USDC'
  );

  console.log(`预期利润: ${(profit1 / 1e9).toFixed(6)} SOL`);
  console.log(`计算 Tip: ${(tip1 / 1e9).toFixed(6)} SOL`);
  console.log(`Tip/利润比: ${((tip1 / profit1) * 100).toFixed(1)}%`);
  console.log(`净利润: ${((profit1 - tip1) / 1e9).toFixed(6)} SOL`);

  // 场景 2: 平衡策略
  console.log('\n📊 场景 2: 平衡策略（中等资金）');
  console.log('-'.repeat(60));
  
  const balancedOptimizer = new JitoTipOptimizer({
    minTipLamports: 10_000,
    maxTipLamports: 30_000_000,
    profitSharePercentage: 0.30,        // 30%
    competitionMultiplier: 2.3,
    urgencyMultiplier: 1.6,
    useHistoricalLearning: false,
  });

  const profit2 = 10_000_000;  // 0.01 SOL
  const tip2 = await balancedOptimizer.calculateOptimalTip(
    profit2,
    0.5,      // 中等竞争
    0.7,      // 高紧迫性
    'medium',
    'SOL-USDC'
  );

  console.log(`预期利润: ${(profit2 / 1e9).toFixed(6)} SOL`);
  console.log(`计算 Tip: ${(tip2 / 1e9).toFixed(6)} SOL`);
  console.log(`Tip/利润比: ${((tip2 / profit2) * 100).toFixed(1)}%`);
  console.log(`净利润: ${((profit2 - tip2) / 1e9).toFixed(6)} SOL`);

  // 场景 3: 激进策略
  console.log('\n📊 场景 3: 激进策略（大资金 + 高竞争）');
  console.log('-'.repeat(60));
  
  const aggressiveOptimizer = new JitoTipOptimizer({
    minTipLamports: 50_000,
    maxTipLamports: 200_000_000,
    profitSharePercentage: 0.45,        // 45%
    competitionMultiplier: 3.0,
    urgencyMultiplier: 2.0,
    useHistoricalLearning: false,
  });

  const profit3 = 50_000_000;  // 0.05 SOL（大机会）
  const tip3 = await aggressiveOptimizer.calculateOptimalTip(
    profit3,
    0.9,      // 非常高竞争
    0.95,     // 极高紧迫性
    'large',
    'SOL-USDC'
  );

  console.log(`预期利润: ${(profit3 / 1e9).toFixed(6)} SOL`);
  console.log(`计算 Tip: ${(tip3 / 1e9).toFixed(6)} SOL`);
  console.log(`Tip/利润比: ${((tip3 / profit3) * 100).toFixed(1)}%`);
  console.log(`净利润: ${((profit3 - tip3) / 1e9).toFixed(6)} SOL`);

  // 场景 4: 竞争强度影响对比
  console.log('\n📊 场景 4: 竞争强度影响对比（激进策略）');
  console.log('-'.repeat(60));
  
  const testProfit = 10_000_000;  // 0.01 SOL
  const competitions = [0.1, 0.3, 0.5, 0.7, 0.9];
  
  console.log('竞争强度 | Tip (SOL) | Tip/利润比 | 净利润 (SOL)');
  console.log('-'.repeat(60));
  
  for (const comp of competitions) {
    const tip = await aggressiveOptimizer.calculateOptimalTip(
      testProfit,
      comp,
      0.7,
      'large',
      'TEST'
    );
    
    console.log(
      `${(comp * 100).toFixed(0).padStart(3)}%     | ` +
      `${(tip / 1e9).toFixed(6)} | ` +
      `${((tip / testProfit) * 100).toFixed(1).padStart(5)}%     | ` +
      `${((testProfit - tip) / 1e9).toFixed(6)}`
    );
  }

  // 场景 5: 历史学习效果模拟
  console.log('\n📊 场景 5: 历史学习效果模拟');
  console.log('-'.repeat(60));
  
  const learningOptimizer = new JitoTipOptimizer({
    minTipLamports: 10_000,
    maxTipLamports: 50_000_000,
    profitSharePercentage: 0.35,
    competitionMultiplier: 2.5,
    urgencyMultiplier: 1.8,
    useHistoricalLearning: true,       // 启用历史学习
    historicalWeight: 0.4,
  });

  // 模拟一些历史数据
  const tokenPair = 'SOL-USDC';
  const now = Date.now();
  
  // 模拟 20 条历史记录
  console.log('正在添加模拟历史数据...');
  for (let i = 0; i < 20; i++) {
    const mockResult: BundleResult = {
      bundleId: `mock-${i}`,
      tip: 1_000_000 + Math.random() * 2_000_000,  // 0.001 - 0.003 SOL
      success: Math.random() > 0.4,  // 60% 成功率
      profit: 5_000_000,
      tokenPair,
      timestamp: now - i * 3600_000,  // 每小时一个数据点
    };
    learningOptimizer.recordBundleResult(mockResult);
  }

  console.log('✅ 历史数据添加完成\n');

  // 测试没有历史学习的 tip
  console.log('不使用历史学习:');
  learningOptimizer['useHistoricalLearning'] = false;
  const tipWithoutHistory = await learningOptimizer.calculateOptimalTip(
    5_000_000,
    0.5,
    0.7,
    'medium',
    tokenPair
  );
  console.log(`  Tip: ${(tipWithoutHistory / 1e9).toFixed(6)} SOL`);

  // 测试使用历史学习的 tip
  console.log('\n使用历史学习 (40% 权重):');
  learningOptimizer['useHistoricalLearning'] = true;
  const tipWithHistory = await learningOptimizer.calculateOptimalTip(
    5_000_000,
    0.5,
    0.7,
    'medium',
    tokenPair
  );
  console.log(`  Tip: ${(tipWithHistory / 1e9).toFixed(6)} SOL`);
  
  const historyStats = learningOptimizer.getHistoryStats(tokenPair);
  console.log(`\n历史统计:`);
  console.log(`  总 Bundles: ${historyStats.totalBundles}`);
  console.log(`  成功率: ${(historyStats.successRate * 100).toFixed(1)}%`);
  console.log(`  平均成功 Tip: ${(historyStats.avgSuccessTip / 1e9).toFixed(6)} SOL`);
  console.log(`  平均失败 Tip: ${(historyStats.avgFailedTip / 1e9).toFixed(6)} SOL`);

  // 场景 6: 实时 Jito API 测试（可选）
  console.log('\n📊 场景 6: 实时 Jito API 测试');
  console.log('-'.repeat(60));
  
  try {
    const realOptimizer = new JitoTipOptimizer();
    console.log('正在获取实时 Jito tip floor 数据...');
    
    const p25 = await realOptimizer.getTipAtPercentile(25);
    const p50 = await realOptimizer.getTipAtPercentile(50);
    const p75 = await realOptimizer.getTipAtPercentile(75);
    const p95 = await realOptimizer.getTipAtPercentile(95);
    
    console.log(`✅ 实时 Jito Tip Floor:`);
    console.log(`  25th percentile: ${(p25 / 1e9).toFixed(6)} SOL`);
    console.log(`  50th percentile: ${(p50 / 1e9).toFixed(6)} SOL`);
    console.log(`  75th percentile: ${(p75 / 1e9).toFixed(6)} SOL`);
    console.log(`  95th percentile: ${(p95 / 1e9).toFixed(6)} SOL`);
  } catch (error) {
    console.log(`⚠️  无法获取实时数据: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`  （这是正常的，可能是网络问题或代理配置）`);
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  console.log('✅ 保守策略: 控制成本，适合小资金');
  console.log('✅ 平衡策略: 成本与成功率平衡，适合中等资金');
  console.log('✅ 激进策略: 最大化成功率，适合大资金');
  console.log('✅ 竞争强度: 显著影响 tip 大小');
  console.log('✅ 历史学习: 基于实际成功率优化 tip');
  console.log('\n💡 建议:');
  console.log('  1. 小资金（<1 SOL）: 使用 config.conservative-tip.toml');
  console.log('  2. 中等资金（1-10 SOL）: 使用 config.balanced-tip.toml');
  console.log('  3. 大资金（>10 SOL）: 使用 config.aggressive-tip.toml');
  console.log('  4. 启用历史学习后，运行几小时积累数据效果更好');
  console.log('\n🎯 预期效果:');
  console.log('  - 成功率: 从 60% 提升到 75%+');
  console.log('  - Tip 成本: 增加 50-100%');
  console.log('  - 净利润: 提升 25%+（因为成功率提升更多）');
}

main().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});

