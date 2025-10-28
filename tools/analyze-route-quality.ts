#!/usr/bin/env tsx
/**
 * 分析 Jupiter 路由质量和 DEX 性能
 * 
 * 功能：
 * 1. 从数据库读取最近的套利机会
 * 2. 分析每个 DEX 的成功率、延迟、价格影响
 * 3. 生成性能报告
 */

import { PrismaClient } from '@prisma/client';

// 使用 packages/core 中生成的 Prisma 客户端
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
    }
  }
});

interface DexStats {
  name: string;
  totalOpportunities: number;
  avgProfit: number;
  avgPriceImpact: number;
  usageCount: { outbound: number; return: number };
}

async function analyzeRouteQuality() {
  console.log('🔍 分析 Jupiter 路由质量...\n');

  // 读取最近 24 小时的数据
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const opportunities = await prisma.opportunity.findMany({
    where: {
      discoveredAt: {
        gte: twentyFourHoursAgo,
      },
    },
    select: {
      expectedProfit: true,
      metadata: true,
    },
  });

  console.log(`📊 分析 ${opportunities.length} 条最近 24 小时的套利机会\n`);

  const dexStats = new Map<string, DexStats>();

  // 统计每个 DEX 的使用情况
  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    const routeInfo = metadata?.routeInfo;
    
    if (!routeInfo) continue;

    const { outboundDexes = [], returnDexes = [], priceImpact = 0 } = routeInfo;
    const allDexes = [...outboundDexes, ...returnDexes];

    for (const dex of allDexes) {
      if (!dexStats.has(dex)) {
        dexStats.set(dex, {
          name: dex,
          totalOpportunities: 0,
          avgProfit: 0,
          avgPriceImpact: 0,
          usageCount: { outbound: 0, return: 0 },
        });
      }

      const stats = dexStats.get(dex)!;
      stats.totalOpportunities++;
      stats.avgProfit += parseFloat(opp.expectedProfit.toString()) / 1e9 || 0; // 转换为 SOL
      stats.avgPriceImpact += priceImpact || 0;
      
      if (outboundDexes.includes(dex)) stats.usageCount.outbound++;
      if (returnDexes.includes(dex)) stats.usageCount.return++;
    }
  }

  // 计算平均值
  for (const stats of dexStats.values()) {
    stats.avgProfit /= stats.totalOpportunities;
    stats.avgPriceImpact /= stats.totalOpportunities;
  }

  // 按总机会数排序
  const sortedStats = Array.from(dexStats.values())
    .sort((a, b) => b.totalOpportunities - a.totalOpportunities);

  // 打印报告
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  🏆 DEX 路由质量报告（最近 24 小时）                                 │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log('│  排名 │ DEX 名称              │ 机会数  │ 平均利润(SOL) │ 价格影响% │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  sortedStats.slice(0, 15).forEach((stats, idx) => {
    const rank = (idx + 1).toString().padStart(4);
    const name = stats.name.padEnd(20);
    const count = stats.totalOpportunities.toString().padStart(7);
    const profit = stats.avgProfit.toFixed(4).padStart(13);
    const impact = stats.avgPriceImpact.toFixed(2).padStart(9);
    
    console.log(`│  ${rank} │ ${name} │ ${count} │ ${profit} │ ${impact} │`);
  });

  console.log('└─────────────────────────────────────────────────────────────────────┘\n');

  // 性能建议
  console.log('💡 优化建议：\n');
  
  const topDexes = sortedStats.slice(0, 3);
  console.log('🔥 **优先优化**（前 3 名）：');
  topDexes.forEach((stats, idx) => {
    console.log(`   ${idx + 1}. ${stats.name}: ${stats.totalOpportunities} 次机会, 平均利润 ${stats.avgProfit.toFixed(2)} SOL`);
  });

  const highImpactDexes = sortedStats.filter(s => s.avgPriceImpact > 1.0).slice(0, 3);
  if (highImpactDexes.length > 0) {
    console.log('\n⚠️  **高价格影响 DEX**（需谨慎）：');
    highImpactDexes.forEach(stats => {
      console.log(`   - ${stats.name}: 平均价格影响 ${stats.avgPriceImpact.toFixed(2)}%`);
    });
  }

  const lowProfitDexes = sortedStats.filter(s => s.avgProfit < 0.001).slice(0, 3);
  if (lowProfitDexes.length > 0) {
    console.log('\n💸 **低利润 DEX**（考虑过滤）：');
    lowProfitDexes.forEach(stats => {
      console.log(`   - ${stats.name}: 平均利润 ${stats.avgProfit.toFixed(6)} SOL`);
    });
  }

  console.log('\n✅ 分析完成！');
  console.log(`📁 数据来源: opportunities 表（最近 24 小时）\n`);

  await prisma.$disconnect();
}

analyzeRouteQuality().catch((error) => {
  console.error('❌ 分析失败:', error);
  process.exit(1);
});

