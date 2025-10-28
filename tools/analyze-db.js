/**
 * 分析opportunity_validations数据
 */

const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Yuan971035088@localhost:5432/postgres";

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

  try {
    // 1. 总体统计
    console.log('\n📊 1. 总体统计');
    console.log('─'.repeat(80));

    const allValidations = await prisma.opportunityValidation.findMany({
      orderBy: {
        firstDetectedAt: 'desc'
      },
      take: 1000
    });

    const total = allValidations.length;
    const passed = allValidations.filter(v => v.stillExists).length;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';

    console.log(`总记录数: ${total}`);
    console.log(`通过验证: ${passed}`);
    console.log(`通过率: ${passRate}%`);

    // 2. 按时间段统计
    console.log('\n\n📊 2. 按时间段统计');
    console.log('─'.repeat(80));

    const yesterday = await prisma.opportunityValidation.findMany({
      where: {
        firstDetectedAt: {
          gte: new Date('2025-10-24T08:53:00'),
          lte: new Date('2025-10-24T23:54:00')
        }
      }
    });

    const today = await prisma.opportunityValidation.findMany({
      where: {
        firstDetectedAt: {
          gte: new Date('2025-10-25T00:20:00'),
          lte: new Date('2025-10-25T10:54:00')
        }
      }
    });

    console.log('\n昨天 (08:53-23:54):');
    console.log(`  总机会数: ${yesterday.length}`);
    console.log(`  通过验证: ${yesterday.filter(v => v.stillExists).length}`);
    console.log(`  通过率: ${(yesterday.filter(v => v.stillExists).length / yesterday.length * 100).toFixed(1)}%`);

    console.log('\n今天 (00:20-10:54):');
    console.log(`  总机会数: ${today.length}`);
    console.log(`  通过验证: ${today.filter(v => v.stillExists).length}`);
    console.log(`  通过率: ${(today.filter(v => v.stillExists).length / today.length * 100).toFixed(1)}%`);

    // 3. Worker高估误差分析
    console.log('\n\n📊 3. Worker高估误差分析（关键！）');
    console.log('─'.repeat(80));

    const workerThreshold = 5_000_000;
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

      const avgError = overestimated.reduce((sum, v) => {
        return sum + (Number(v.firstProfit) - Number(v.secondProfit || 0));
      }, 0) / overestimated.length / 1e9;

      const avgErrorPct = overestimated.reduce((sum, v) => {
        const first = Number(v.firstProfit);
        const second = Number(v.secondProfit || 0);
        return sum + (first - second) / first * 100;
      }, 0) / overestimated.length;

      console.log(`\n平均高估误差: ${avgError.toFixed(6)} SOL (${avgErrorPct.toFixed(2)}%)`);
    }

    // 4. 利润分布
    console.log('\n\n📊 4. 利润阈值附近的分布');
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

    // 5. 通过与失败对比
    console.log('\n\n📊 5. 通过 vs 失败详细对比');
    console.log('─'.repeat(80));

    const passedVals = allValidations.filter(v => v.stillExists);
    const failedVals = allValidations.filter(v => !v.stillExists);

    console.log(`\n✅ 通过验证 (${passedVals.length} 个):`);
    if (passedVals.length > 0) {
      const avgFirstProfit = passedVals.reduce((sum, v) => sum + Number(v.firstProfit), 0) / passedVals.length / 1e9;
      const avgSecondProfit = passedVals.reduce((sum, v) => sum + Number(v.secondProfit || 0), 0) / passedVals.length / 1e9;
      const avgDelay = passedVals.reduce((sum, v) => sum + v.validationDelayMs, 0) / passedVals.length;

      console.log(`  平均第一次利润: ${avgFirstProfit.toFixed(6)} SOL`);
      console.log(`  平均第二次利润: ${avgSecondProfit.toFixed(6)} SOL`);
      console.log(`  平均验证延迟: ${avgDelay.toFixed(0)}ms`);
    }

    console.log(`\n❌ 验证失败 (${failedVals.length} 个):`);
    if (failedVals.length > 0) {
      const avgFirstProfit = failedVals.reduce((sum, v) => sum + Number(v.firstProfit), 0) / failedVals.length / 1e9;
      const avgSecondProfit = failedVals.reduce((sum, v) => sum + Number(v.secondProfit || 0), 0) / failedVals.length / 1e9;
      const avgDelay = failedVals.reduce((sum, v) => sum + v.validationDelayMs, 0) / failedVals.length;

      console.log(`  平均第一次利润: ${avgFirstProfit.toFixed(6)} SOL`);
      console.log(`  平均第二次利润: ${avgSecondProfit.toFixed(6)} SOL`);
      console.log(`  平均验证延迟: ${avgDelay.toFixed(0)}ms`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ 分析完成\n');

  } catch (error) {
    console.error('❌ 分析出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeValidationData();

