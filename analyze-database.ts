import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 数据库分析报告');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. 机会总数
    console.log('1️⃣ 机会记录统计');
    console.log('─────────────────────────────────────────────');
    
    const totalOpportunities = await prisma.opportunity.count();
    console.log(`   总机会数: ${totalOpportunities}`);
    
    const filteredCount = await prisma.opportunity.count({
      where: { filtered: true }
    });
    console.log(`   已过滤: ${filteredCount} (${((filteredCount / totalOpportunities) * 100).toFixed(1)}%)`);
    
    const notFilteredCount = await prisma.opportunity.count({
      where: { filtered: false }
    });
    console.log(`   未过滤: ${notFilteredCount} (${((notFilteredCount / totalOpportunities) * 100).toFixed(1)}%)`);
    
    // 2. 按桥接代币分组
    console.log('');
    console.log('2️⃣ 按桥接代币分组');
    console.log('─────────────────────────────────────────────');
    
    const byBridgeToken = await prisma.opportunity.groupBy({
      by: ['bridgeToken'],
      _count: true,
      orderBy: {
        _count: {
          bridgeToken: 'desc'
        }
      }
    });
    
    for (const group of byBridgeToken) {
      console.log(`   ${group.bridgeToken || 'NULL'}: ${group._count} 个机会`);
    }
    
    // 3. 利润统计
    console.log('');
    console.log('3️⃣ 利润统计（首次发现）');
    console.log('─────────────────────────────────────────────');
    
    const profitStats = await prisma.opportunity.aggregate({
      _avg: { expectedProfit: true },
      _min: { expectedProfit: true },
      _max: { expectedProfit: true },
      _sum: { expectedProfit: true }
    });
    
    console.log(`   平均利润: ${(Number(profitStats._avg.expectedProfit || 0) / 1e9).toFixed(6)} SOL`);
    console.log(`   最小利润: ${(Number(profitStats._min.expectedProfit || 0) / 1e9).toFixed(6)} SOL`);
    console.log(`   最大利润: ${(Number(profitStats._max.expectedProfit || 0) / 1e9).toFixed(6)} SOL`);
    console.log(`   总利润潜力: ${(Number(profitStats._sum.expectedProfit || 0) / 1e9).toFixed(6)} SOL`);
    
    // 4. 过滤原因统计
    console.log('');
    console.log('4️⃣ 过滤原因统计');
    console.log('─────────────────────────────────────────────');
    
    const filterReasons = await prisma.opportunity.groupBy({
      by: ['filterReason'],
      where: { filtered: true },
      _count: true,
      orderBy: {
        _count: {
          filterReason: 'desc'
        }
      }
    });
    
    for (const reason of filterReasons) {
      const reasonText = reason.filterReason || 'Unknown';
      const shortReason = reasonText.length > 50 ? reasonText.substring(0, 47) + '...' : reasonText;
      console.log(`   ${shortReason}: ${reason._count}`);
    }
    
    // 5. 二次验证统计
    console.log('');
    console.log('5️⃣ 二次验证统计');
    console.log('─────────────────────────────────────────────');
    
    const totalValidations = await prisma.opportunityValidation.count();
    console.log(`   总验证次数: ${totalValidations}`);
    
    const stillExistsCount = await prisma.opportunityValidation.count({
      where: { stillExists: true }
    });
    console.log(`   验证通过 (stillExists=true): ${stillExistsCount} (${((stillExistsCount / totalValidations) * 100).toFixed(1)}%)`);
    
    const expiredCount = await prisma.opportunityValidation.count({
      where: { stillExists: false }
    });
    console.log(`   验证失败 (stillExists=false): ${expiredCount} (${((expiredCount / totalValidations) * 100).toFixed(1)}%)`);
    
    // 6. 验证延迟统计
    console.log('');
    console.log('6️⃣ 验证延迟统计');
    console.log('─────────────────────────────────────────────');
    
    const validationStats = await prisma.opportunityValidation.aggregate({
      _avg: { 
        validationDelayMs: true,
        firstOutboundMs: true,
        firstReturnMs: true,
        secondOutboundMs: true,
        secondReturnMs: true
      }
    });
    
    console.log(`   平均验证延迟: ${validationStats._avg.validationDelayMs?.toFixed(0) || 'N/A'} ms`);
    console.log(`   平均首次去程: ${validationStats._avg.firstOutboundMs?.toFixed(0) || 'N/A'} ms`);
    console.log(`   平均首次回程: ${validationStats._avg.firstReturnMs?.toFixed(0) || 'N/A'} ms`);
    console.log(`   平均验证去程: ${validationStats._avg.secondOutboundMs?.toFixed(0) || 'N/A'} ms`);
    console.log(`   平均验证回程: ${validationStats._avg.secondReturnMs?.toFixed(0) || 'N/A'} ms`);
    
    // 7. 利润衰减分析
    console.log('');
    console.log('7️⃣ 利润衰减分析（首次 vs 验证）');
    console.log('─────────────────────────────────────────────');
    
    const validationsWithProfit = await prisma.opportunityValidation.findMany({
      where: {
        stillExists: true,
        secondProfit: { not: null }
      },
      select: {
        firstProfit: true,
        secondProfit: true
      },
      take: 1000 // 限制数量避免内存溢出
    });
    
    if (validationsWithProfit.length > 0) {
      let totalDecay = 0;
      let positiveDecayCount = 0;
      let negativeDecayCount = 0;
      
      for (const v of validationsWithProfit) {
        const first = Number(v.firstProfit);
        const second = Number(v.secondProfit || 0);
        const decay = ((second - first) / first) * 100;
        totalDecay += decay;
        
        if (decay < 0) negativeDecayCount++;
        else positiveDecayCount++;
      }
      
      const avgDecay = totalDecay / validationsWithProfit.length;
      console.log(`   平均利润变化: ${avgDecay.toFixed(2)}%`);
      console.log(`   利润下降: ${negativeDecayCount} 次 (${((negativeDecayCount / validationsWithProfit.length) * 100).toFixed(1)}%)`);
      console.log(`   利润上升: ${positiveDecayCount} 次 (${((positiveDecayCount / validationsWithProfit.length) * 100).toFixed(1)}%)`);
    } else {
      console.log(`   无足够数据分析`);
    }
    
    // 8. 最近10个机会
    console.log('');
    console.log('8️⃣ 最近10个机会');
    console.log('─────────────────────────────────────────────');
    
    const recentOpportunities = await prisma.opportunity.findMany({
      orderBy: { discoveredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        bridgeToken: true,
        expectedProfit: true,
        filtered: true,
        filterReason: true,
        discoveredAt: true
      }
    });
    
    for (const opp of recentOpportunities) {
      const profitSOL = (Number(opp.expectedProfit) / 1e9).toFixed(6);
      const status = opp.filtered ? '❌ 过滤' : '✅ 通过';
      const reason = opp.filterReason ? ` (${opp.filterReason.substring(0, 30)}...)` : '';
      console.log(`   #${opp.id} | ${opp.bridgeToken} | ${profitSOL} SOL | ${status}${reason}`);
    }
    
    // 9. 时间范围
    console.log('');
    console.log('9️⃣ 数据时间范围');
    console.log('─────────────────────────────────────────────');
    
    const firstOpp = await prisma.opportunity.findFirst({
      orderBy: { discoveredAt: 'asc' },
      select: { discoveredAt: true }
    });
    
    const lastOpp = await prisma.opportunity.findFirst({
      orderBy: { discoveredAt: 'desc' },
      select: { discoveredAt: true }
    });
    
    if (firstOpp && lastOpp) {
      console.log(`   最早记录: ${firstOpp.discoveredAt.toLocaleString('zh-CN')}`);
      console.log(`   最新记录: ${lastOpp.discoveredAt.toLocaleString('zh-CN')}`);
      
      const duration = lastOpp.discoveredAt.getTime() - firstOpp.discoveredAt.getTime();
      const hours = duration / (1000 * 60 * 60);
      console.log(`   时间跨度: ${hours.toFixed(2)} 小时`);
      console.log(`   平均频率: ${(totalOpportunities / hours).toFixed(1)} 个/小时`);
    }
    
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ 分析完成');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase();

