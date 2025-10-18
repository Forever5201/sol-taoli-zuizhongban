#!/usr/bin/env tsx
/**
 * 成本模拟器
 * 
 * 命令行工具，用于快速估算不同交易配置的成本和最小利润门槛
 */

import { CostCalculator, JitoTipOptimizer, type CostConfig, formatLamportsToSOL } from '../../packages/core/src/economics';

interface SimulatorOptions {
  signatures?: number;
  computeUnits?: number;
  computeUnitPrice?: number;
  useFlashLoan?: boolean;
  flashLoanAmount?: number;
  jitoTipPercentile?: 25 | 50 | 75 | 95 | 99;
  competition?: number;
}

async function simulateCost(options: SimulatorOptions) {
  console.log('🧮 ========== 交易成本模拟器 ==========\n');

  // 解析参数
  const signatureCount = options.signatures || 2;
  const computeUnits = options.computeUnits || 200_000;
  const computeUnitPrice = options.computeUnitPrice || 5_000;
  const useFlashLoan = options.useFlashLoan || false;
  const flashLoanAmount = options.flashLoanAmount || 0;
  const jitoTipPercentile = options.jitoTipPercentile || 50;

  console.log('📋 配置参数:');
  console.log(`  签名数量: ${signatureCount}`);
  console.log(`  计算单元: ${computeUnits.toLocaleString()}`);
  console.log(`  CU 价格: ${computeUnitPrice.toLocaleString()} microLamports`);
  console.log(`  使用闪电贷: ${useFlashLoan ? '是' : '否'}`);
  if (useFlashLoan && flashLoanAmount > 0) {
    console.log(`  闪电贷金额: ${formatLamportsToSOL(flashLoanAmount)}`);
  }
  console.log(`  Jito 小费百分位: ${jitoTipPercentile}th`);
  console.log('');

  // 构建成本配置
  const costConfig: CostConfig = {
    signatureCount,
    computeUnits,
    computeUnitPrice,
    useFlashLoan,
    ...(flashLoanAmount > 0 && { flashLoanAmount }),
  };

  // 获取 Jito 小费
  console.log('🔍 正在获取实时 Jito 小费数据...');
  const optimizer = new JitoTipOptimizer();
  const jitoTip = await optimizer.getTipAtPercentile(jitoTipPercentile);
  console.log(`✅ Jito 小费 (${jitoTipPercentile}th): ${formatLamportsToSOL(jitoTip)}\n`);

  // 计算总成本
  const costs = CostCalculator.calculateTotalCost(costConfig, jitoTip);

  console.log('💰 成本明细:');
  console.log(`  基础交易费: ${costs.breakdown!.baseFee}`);
  console.log(`  优先费: ${costs.breakdown!.priorityFee}`);
  console.log(`  Jito 小费: ${costs.breakdown!.jitoTip}`);
  console.log(`  RPC 成本: ${costs.breakdown!.rpcCost}`);
  if (costs.flashLoanFee) {
    console.log(`  闪电贷费用: ${costs.breakdown!.flashLoanFee}`);
  }
  console.log(`  ----------------------------------------`);
  console.log(`  总成本: ${costs.breakdown!.total} (${costs.total} lamports)`);
  console.log('');

  // 计算最小利润门槛
  const minProfit = CostCalculator.calculateMinProfitThreshold(costConfig, jitoTip);
  console.log('📊 盈利分析:');
  console.log(`  最小利润门槛: ${formatLamportsToSOL(minProfit)}`);
  console.log(`  盈亏平衡点: 毛利润需达到 ${formatLamportsToSOL(costs.total)}`);
  console.log('');

  // ROI 示例
  console.log('🎯 收益示例（假设不同毛利润）:');
  const exampleProfits = [
    costs.total * 1.5,
    costs.total * 2,
    costs.total * 3,
    costs.total * 5,
  ];

  exampleProfits.forEach((grossProfit) => {
    const netProfit = grossProfit - costs.total;
    const roi = (netProfit / costs.total) * 100;
    console.log(
      `  毛利润 ${formatLamportsToSOL(grossProfit)} → 净利润 ${formatLamportsToSOL(netProfit)} (ROI: ${roi.toFixed(0)}%)`
    );
  });
  console.log('');

  // 优化建议
  const suggestions = CostCalculator.getOptimizationSuggestions(costConfig);
  if (suggestions.length > 0) {
    console.log('💡 优化建议:');
    suggestions.forEach((suggestion) => console.log(`  • ${suggestion}`));
    console.log('');
  }

  // 竞争情况模拟（如果指定）
  if (options.competition !== undefined) {
    console.log('⚔️  竞争环境模拟:');
    const competitionLevel = options.competition;
    console.log(`  竞争强度: ${(competitionLevel * 100).toFixed(0)}%`);

    // 不同百分位的小费
    const percentiles: Array<25 | 50 | 75 | 95 | 99> = [25, 50, 75, 95, 99];
    console.log('\n  不同小费策略的成本:');

    for (const percentile of percentiles) {
      const tip = await optimizer.getTipAtPercentile(percentile);
      const totalCost = CostCalculator.calculateTotalCost(costConfig, tip).total;
      console.log(
        `    ${percentile}th 百分位: ${formatLamportsToSOL(totalCost)} (小费: ${formatLamportsToSOL(tip)})`
      );
    }
    console.log('');
  }

  console.log('====================================\n');
}

// CLI 参数解析
async function main() {
  const args = process.argv.slice(2);
  
  const options: SimulatorOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--signatures':
      case '-s':
        options.signatures = parseInt(args[++i]);
        break;
      case '--compute-units':
      case '-cu':
        options.computeUnits = parseInt(args[++i]);
        break;
      case '--compute-unit-price':
      case '-cup':
        options.computeUnitPrice = parseInt(args[++i]);
        break;
      case '--flash-loan':
      case '-fl':
        options.useFlashLoan = true;
        break;
      case '--flash-loan-amount':
      case '-fla':
        options.flashLoanAmount = parseInt(args[++i]);
        options.useFlashLoan = true;
        break;
      case '--jito-percentile':
      case '-jt':
        options.jitoTipPercentile = parseInt(args[++i]) as any;
        break;
      case '--competition':
      case '-c':
        options.competition = parseFloat(args[++i]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  try {
    await simulateCost(options);
  } catch (error) {
    console.error('❌ 模拟失败:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
交易成本模拟器 - 用法

npm run cost-sim -- [选项]

选项:
  -s, --signatures <数量>          签名数量 (默认: 2)
  -cu, --compute-units <数量>      计算单元 (默认: 200000)
  -cup, --compute-unit-price <价格> CU 价格 (microLamports, 默认: 5000)
  -fl, --flash-loan                启用闪电贷
  -fla, --flash-loan-amount <金额> 闪电贷金额 (lamports)
  -jt, --jito-percentile <百分位>  Jito 小费百分位 (25/50/75/95/99, 默认: 50)
  -c, --competition <强度>         竞争强度 (0-1)
  -h, --help                       显示帮助信息

示例:
  # 简单 swap
  npm run cost-sim -- -s 2 -cu 200000 -cup 5000

  # 带闪电贷的复杂套利
  npm run cost-sim -- -s 4 -cu 400000 -cup 10000 -fl -fla 50000000000

  # 高竞争环境
  npm run cost-sim -- -s 3 -cu 300000 -cup 20000 -jt 95 -c 0.8
  `);
}

// 执行
main().catch(console.error);



