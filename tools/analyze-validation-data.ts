/**
 * 分析opportunity_validations数据，找出通过率下降的原因
 */

import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://arbitrage_user:your_password_here@localhost:5432/arbitrage_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function analyzeValidationData() {
  console.log('🔍 开始分析验证数据...\n');
  console.log('═'.repeat(80));

  // 1. 按时间段统计
  console.log('\n📊 1. 按时间段统计通过率');
  console.log('─'.repeat(80));

  const timeRanges = [
    {
      name: '今天凌晨 (00:20-10:54)',
      start: new Date('2025-10-25T00:20:00'),
      end: new Date('2025-10-25T10:54:00')
    },
    {
      name: '昨天 (08:53-23:54)',
      start: new Date('2025-10-24T08:53:00'),
      end: new Date('2025-10-24T23:54:00')
    },
    {
      name: '最近24小时',
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    }
  ];

  for (const range of timeRanges) {
    const validations = await prisma.opportunityValidation.findMany({
      where: {
        firstDetectedAt: {
          gte: range.start,
          lte: range.end
        }
      }
    });

    const total = validations.length;
    const passed = validations.filter(v => v.stillExists).length;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';

    console.log(`\n${range.name}:`);
    console.log(`  总机会数: ${total}`);
    console.log(`  通过验证: ${passed}`);
    console.log(`  通过率: ${passRate}%`);
    console.log(`  时间范围: ${range.start.toLocaleString('zh-CN')} ~ ${range.end.toLocaleString('zh-CN')}`);
  }

  // 2. 分析利润衰减
  console.log('\n\n📊 2. 利润衰减分析');
  console.log('─'.repeat(80));

  const allValidations = await prisma.opportunityValidation.findMany({
    orderBy: {
      firstDetectedAt: 'desc'
    },
    take: 500  // 最近500条
  });

  console.log(`\n分析最近 ${allValidations.length} 条记录：`);

  // 分组统计
  const passed = allValidations.filter(v => v.stillExists);
  const failed = allValidations.filter(v => !v.stillExists);

  console.log(`\n✅ 通过验证 (${passed.length} 个):`);
  if (passed.length > 0) {
    const avgFirstProfit = passed.reduce((sum, v) => sum + Number(v.firstProfit), 0) / passed.length / 1e9;
    const avgSecondProfit = passed.reduce((sum, v) => sum + Number(v.secondProfit || 0), 0) / passed.length / 1e9;
    const avgDecay = passed.reduce((sum, v) => {
      const first = Number(v.firstProfit);
      const second = Number(v.secondProfit || 0);
      return sum + (first - second) / first * 100;
    }, 0) / passed.length;
    const avgDelay = passed.reduce((sum, v) => sum + v.validationDelayMs, 0) / passed.length;

    console.log(`  平均第一次利润: ${avgFirstProfit.toFixed(6)} SOL`);
    console.log(`  平均第二次利润: ${avgSecondProfit.toFixed(6)} SOL`);
    console.log(`  平均利润衰减: ${avgDecay.toFixed(2)}%`);
    console.log(`  平均验证延迟: ${avgDelay.toFixed(0)}ms`);
  }

  console.log(`\n❌ 验证失败 (${failed.length} 个):`);
  if (failed.length > 0) {
    const avgFirstProfit = failed.reduce((sum, v) => sum + Number(v.firstProfit), 0) / failed.length / 1e9;
    const avgSecondProfit = failed.reduce((sum, v) => sum + Number(v.secondProfit || 0), 0) / failed.length / 1e9;
    const avgDelay = failed.reduce((sum, v) => sum + v.validationDelayMs, 0) / failed.length;

    console.log(`  平均第一次利润: ${avgFirstProfit.toFixed(6)} SOL`);
    console.log(`  平均第二次利润: ${avgSecondProfit.toFixed(6)} SOL`);
    console.log(`  平均验证延迟: ${avgDelay.toFixed(0)}ms`);
  }

  // 3. Worker高估误差分析
  console.log('\n\n📊 3. Worker高估误差分析（关键！）');
  console.log('─'.repeat(80));

  // 筛选出：Worker认为>0.005但Main验证<0.005的情况
  const workerThreshold = 5_000_000;  // 0.005 SOL
  const mainThreshold = 2_000_000;    // 0.002 SOL

  const overestimated = allValidations.filter(v => {
    const firstProfit = Number(v.firstProfit);
    const secondProfit = Number(v.secondProfit || 0);
    return firstProfit > workerThreshold && secondProfit < workerThreshold;
  });

  console.log(`\n🔥 Worker高估案例（Worker>0.005 但 Main<0.005）: ${overestimated.length} 个`);
  
  if (overestimated.length > 0) {
    console.log(`\n前10个高估案例详情：`);
    console.log(`${'Worker利润'.padEnd(15)} ${'Main利润'.padEnd(15)} ${'误差'.padEnd(15)} ${'误差率'.padEnd(10)} 延迟`);
    console.log('─'.repeat(80));

    overestimated.slice(0, 10).forEach(v => {
      const firstProfit = Number(v.firstProfit) / 1e9;
      const secondProfit = Number(v.secondProfit || 0) / 1e9;
      const error = firstProfit - secondProfit;
      const errorPct = (error / firstProfit * 100).toFixed(1);

      console.log(
        `${firstProfit.toFixed(6).padEnd(15)} ` +
        `${secondProfit.toFixed(6).padEnd(15)} ` +
        `${error.toFixed(6).padEnd(15)} ` +
        `${errorPct.padEnd(10)}% ` +
        `${v.validationDelayMs}ms`
      );
    });

    // 统计平均误差
    const avgError = overestimated.reduce((sum, v) => {
      const first = Number(v.firstProfit);
      const second = Number(v.secondProfit || 0);
      return sum + (first - second);
    }, 0) / overestimated.length / 1e9;

    const avgErrorPct = overestimated.reduce((sum, v) => {
      const first = Number(v.firstProfit);
      const second = Number(v.secondProfit || 0);
      return sum + (first - second) / first * 100;
    }, 0) / overestimated.length;

    console.log(`\n平均高估误差: ${avgError.toFixed(6)} SOL (${avgErrorPct.toFixed(2)}%)`);
  }

  // 4. 延迟分布分析
  console.log('\n\n📊 4. 验证延迟分布');
  console.log('─'.repeat(80));

  const delayRanges = [
    { min: 0, max: 100, label: '<100ms' },
    { min: 100, max: 200, label: '100-200ms' },
    { min: 200, max: 300, label: '200-300ms' },
    { min: 300, max: 500, label: '300-500ms' },
    { min: 500, max: Infinity, label: '>500ms' }
  ];

  for (const range of delayRanges) {
    const inRange = allValidations.filter(v => 
      v.validationDelayMs >= range.min && v.validationDelayMs < range.max
    );
    const passedInRange = inRange.filter(v => v.stillExists);
    const passRate = inRange.length > 0 ? (passedInRange.length / inRange.length * 100).toFixed(1) : '0.0';

    console.log(`${range.label.padEnd(15)}: ${inRange.length.toString().padStart(4)} 个  (通过率: ${passRate}%)`);
  }

  // 5. 阈值附近的分布
  console.log('\n\n📊 5. 利润阈值附近的分布（关键！）');
  console.log('─'.repeat(80));

  const profitRanges = [
    { min: 0, max: 2_000_000, label: '<0.002 SOL' },
    { min: 2_000_000, max: 5_000_000, label: '0.002-0.005 SOL' },
    { min: 5_000_000, max: 10_000_000, label: '0.005-0.010 SOL' },
    { min: 10_000_000, max: 20_000_000, label: '0.010-0.020 SOL' },
    { min: 20_000_000, max: Infinity, label: '>0.020 SOL' }
  ];

  console.log('\nWorker第一次利润分布：');
  for (const range of profitRanges) {
    const inRange = allValidations.filter(v => {
      const profit = Number(v.firstProfit);
      return profit >= range.min && profit < range.max;
    });
    const passedInRange = inRange.filter(v => v.stillExists);
    const passRate = inRange.length > 0 ? (passedInRange.length / inRange.length * 100).toFixed(1) : '0.0';

    console.log(`${range.label.padEnd(20)}: ${inRange.length.toString().padStart(4)} 个  (通过率: ${passRate}%)`);
  }

  console.log('\nMain第二次利润分布（仅通过验证的）：');
  const passedOnly = allValidations.filter(v => v.stillExists);
  for (const range of profitRanges) {
    const inRange = passedOnly.filter(v => {
      const profit = Number(v.secondProfit || 0);
      return profit >= range.min && profit < range.max;
    });

    console.log(`${range.label.padEnd(20)}: ${inRange.length.toString().padStart(4)} 个`);
  }

  // 6. 查找典型案例
  console.log('\n\n📊 6. 典型案例分析');
  console.log('─'.repeat(80));

  // 案例1：Worker刚好超过0.005，但Main低于0.002（最典型的误报）
  const typicalFalsePositive = allValidations.find(v => {
    const first = Number(v.firstProfit);
    const second = Number(v.secondProfit || 0);
    return first > 5_000_000 && first < 6_000_000 && second < 2_000_000;
  });

  if (typicalFalsePositive) {
    console.log('\n❌ 典型误报案例：');
    console.log(`  Worker第一次利润: ${(Number(typicalFalsePositive.firstProfit) / 1e9).toFixed(6)} SOL`);
    console.log(`  Main第二次利润: ${(Number(typicalFalsePositive.secondProfit || 0) / 1e9).toFixed(6)} SOL`);
    console.log(`  验证延迟: ${typicalFalsePositive.validationDelayMs}ms`);
    console.log(`  发现时间: ${typicalFalsePositive.firstDetectedAt.toLocaleString('zh-CN')}`);
    console.log(`  利润衰减: ${((Number(typicalFalsePositive.firstProfit) - Number(typicalFalsePositive.secondProfit || 0)) / Number(typicalFalsePositive.firstProfit) * 100).toFixed(2)}%`);
  }

  // 案例2：Worker和Main都很高（最理想的情况）
  const typicalTruePositive = allValidations.find(v => {
    const first = Number(v.firstProfit);
    const second = Number(v.secondProfit || 0);
    return first > 10_000_000 && second > 8_000_000 && v.stillExists;
  });

  if (typicalTruePositive) {
    console.log('\n✅ 典型真正机会案例：');
    console.log(`  Worker第一次利润: ${(Number(typicalTruePositive.firstProfit) / 1e9).toFixed(6)} SOL`);
    console.log(`  Main第二次利润: ${(Number(typicalTruePositive.secondProfit || 0) / 1e9).toFixed(6)} SOL`);
    console.log(`  验证延迟: ${typicalTruePositive.validationDelayMs}ms`);
    console.log(`  发现时间: ${typicalTruePositive.firstDetectedAt.toLocaleString('zh-CN')}`);
    console.log(`  利润衰减: ${((Number(typicalTruePositive.firstProfit) - Number(typicalTruePositive.secondProfit || 0)) / Number(typicalTruePositive.firstProfit) * 100).toFixed(2)}%`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ 分析完成\n');

  await prisma.$disconnect();
}

analyzeValidationData().catch(console.error);

