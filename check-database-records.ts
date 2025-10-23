/**
 * 检查数据库中的机会记录
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

async function checkDatabaseRecords() {
  try {
    console.log('🔍 正在查询数据库...\n');

    // 1. 统计总记录数
    const totalOpportunities = await prisma.opportunity.count();
    console.log(`📊 总机会记录数: ${totalOpportunities}`);

    // 2. 查询最近的机会
    const recentOpportunities = await prisma.opportunity.findMany({
      orderBy: { firstDetectedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        inputMint: true,
        outputMint: true,
        firstProfit: true,
        firstRoi: true,
        firstDetectedAt: true,
        status: true,
      }
    });

    console.log(`\n📝 最近 ${recentOpportunities.length} 条记录:\n`);
    recentOpportunities.forEach((opp, index) => {
      const profit = Number(opp.firstProfit) / 1e9;
      const roi = Number(opp.firstRoi) * 100;
      const time = opp.firstDetectedAt.toLocaleString('zh-CN', { 
        timeZone: 'Asia/Shanghai',
        hour12: false 
      });
      
      console.log(`${index + 1}. [${opp.status}] ${time}`);
      console.log(`   Path: ${opp.inputMint.slice(0, 8)}... → ${opp.outputMint.slice(0, 8)}...`);
      console.log(`   Profit: ${profit.toFixed(6)} SOL (${roi.toFixed(4)}%)`);
      console.log(`   ID: ${opp.id}`);
      console.log('');
    });

    // 3. 统计各状态的数量
    const statusCounts = await prisma.opportunity.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('📊 机会状态统计:');
    statusCounts.forEach(item => {
      console.log(`   ${item.status}: ${item._count.status} 条`);
    });

    // 4. 查询验证记录
    const totalValidations = await prisma.opportunityValidation.count();
    console.log(`\n🔄 验证记录总数: ${totalValidations}`);

    if (totalValidations > 0) {
      const validations = await prisma.opportunityValidation.findMany({
        orderBy: { firstDetectedAt: 'desc' },
        take: 5,
        select: {
          opportunityId: true,
          firstProfit: true,
          secondProfit: true,
          stillExists: true,
          validationDelayMs: true,
          firstDetectedAt: true,
        }
      });

      console.log(`\n📝 最近 ${validations.length} 条验证记录:\n`);
      validations.forEach((val, index) => {
        const firstProfit = Number(val.firstProfit) / 1e9;
        const secondProfit = val.secondProfit ? Number(val.secondProfit) / 1e9 : null;
        const time = val.firstDetectedAt.toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          hour12: false 
        });
        
        console.log(`${index + 1}. ${time}`);
        console.log(`   首次利润: ${firstProfit.toFixed(6)} SOL`);
        console.log(`   二次利润: ${secondProfit !== null ? secondProfit.toFixed(6) : 'N/A'} SOL`);
        console.log(`   仍存在: ${val.stillExists ? '✅' : '❌'}`);
        console.log(`   验证延迟: ${val.validationDelayMs}ms`);
        console.log('');
      });
    }

    // 5. 查询阈值统计
    const profitStats = await prisma.opportunity.aggregate({
      _avg: { firstProfit: true },
      _min: { firstProfit: true },
      _max: { firstProfit: true },
    });

    if (profitStats._avg.firstProfit) {
      console.log('\n💰 利润统计:');
      console.log(`   平均利润: ${(Number(profitStats._avg.firstProfit) / 1e9).toFixed(6)} SOL`);
      console.log(`   最小利润: ${(Number(profitStats._min.firstProfit) / 1e9).toFixed(6)} SOL`);
      console.log(`   最大利润: ${(Number(profitStats._max.firstProfit) / 1e9).toFixed(6)} SOL`);
    }

    // 6. 统计超过不同阈值的机会数量
    const thresholds = [500_000, 1_000_000, 2_000_000, 5_000_000];
    console.log('\n📊 阈值过滤统计:');
    
    for (const threshold of thresholds) {
      const count = await prisma.opportunity.count({
        where: {
          firstProfit: { gte: BigInt(threshold) }
        }
      });
      console.log(`   利润 >= ${(threshold / 1e9).toFixed(4)} SOL: ${count} 条`);
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseRecords();

