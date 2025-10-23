/**
 * 路由分析脚本
 * 分析数据库中记录的套利机会路由路径
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function analyzeRoutes() {
  try {
    console.log('🔍 正在分析路由数据...\n');

    // 1. 查询所有包含路由信息的机会
    const opportunities = await prisma.opportunity.findMany({
      where: {
        metadata: {
          not: null
        }
      },
      orderBy: { firstDetectedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        firstDetectedAt: true,
        firstProfit: true,
        firstRoi: true,
        bridgeToken: true,
        status: true,
        metadata: true,
      }
    });

    if (opportunities.length === 0) {
      console.log('❌ 没有找到包含路由信息的机会记录');
      return;
    }

    console.log(`📊 找到 ${opportunities.length} 条包含元数据的机会记录\n`);

    // 2. 分析路由统计
    const routeStats = {
      totalWithRoutes: 0,
      totalWithoutRoutes: 0,
      dexUsage: {} as Record<string, number>,
      hopDistribution: {} as Record<number, number>,
      profitByHops: {} as Record<number, { total: number; count: number; avg: number }>,
    };

    // 3. 详细分析每个机会
    opportunities.forEach((opp, index) => {
      const metadata = opp.metadata as any;
      
      if (!metadata) {
        routeStats.totalWithoutRoutes++;
        return;
      }

      const routeInfo = metadata.routeInfo;
      
      if (routeInfo && routeInfo.hasRouteData) {
        routeStats.totalWithRoutes++;

        // 统计跳数分布
        const hops = routeInfo.totalHops || 0;
        routeStats.hopDistribution[hops] = (routeStats.hopDistribution[hops] || 0) + 1;

        // 统计按跳数的平均利润
        const profit = Number(opp.firstProfit) / 1e9;
        if (!routeStats.profitByHops[hops]) {
          routeStats.profitByHops[hops] = { total: 0, count: 0, avg: 0 };
        }
        routeStats.profitByHops[hops].total += profit;
        routeStats.profitByHops[hops].count++;
        routeStats.profitByHops[hops].avg = routeStats.profitByHops[hops].total / routeStats.profitByHops[hops].count;

        // 统计 DEX 使用情况
        if (routeInfo.dexes && Array.isArray(routeInfo.dexes)) {
          routeInfo.dexes.forEach((dex: string) => {
            routeStats.dexUsage[dex] = (routeStats.dexUsage[dex] || 0) + 1;
          });
        }

        // 输出前 10 个机会的详细信息
        if (index < 10) {
          const time = opp.firstDetectedAt.toLocaleString('zh-CN', { 
            timeZone: 'Asia/Shanghai',
            hour12: false 
          });
          
          console.log(`\n${index + 1}. [${opp.status}] ${time}`);
          console.log(`   ID: ${opp.id}`);
          console.log(`   桥接代币: ${opp.bridgeToken || 'N/A'}`);
          console.log(`   利润: ${profit.toFixed(6)} SOL (${(Number(opp.firstRoi) * 100).toFixed(4)}%)`);
          console.log(`   总跳数: ${hops}`);
          
          if (routeInfo.outboundRoute && routeInfo.outboundRoute.length > 0) {
            console.log(`   去程路由 (${routeInfo.outboundRoute.length} 步):`);
            routeInfo.outboundRoute.forEach((step: any) => {
              console.log(`     Step ${step.stepNumber}: ${step.dex}`);
              console.log(`       ${step.inputMint.slice(0, 8)}... → ${step.outputMint.slice(0, 8)}...`);
            });
          }
          
          if (routeInfo.returnRoute && routeInfo.returnRoute.length > 0) {
            console.log(`   返程路由 (${routeInfo.returnRoute.length} 步):`);
            routeInfo.returnRoute.forEach((step: any) => {
              console.log(`     Step ${step.stepNumber}: ${step.dex}`);
              console.log(`       ${step.inputMint.slice(0, 8)}... → ${step.outputMint.slice(0, 8)}...`);
            });
          }
          
          if (routeInfo.dexes && routeInfo.dexes.length > 0) {
            console.log(`   使用的 DEX: ${routeInfo.dexes.join(', ')}`);
          }
        }
      } else {
        routeStats.totalWithoutRoutes++;
      }
    });

    // 4. 输出统计汇总
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 路由统计汇总');
    console.log('='.repeat(80));
    
    console.log(`\n✅ 包含路由数据的机会: ${routeStats.totalWithRoutes} 条`);
    console.log(`❌ 不包含路由数据的机会: ${routeStats.totalWithoutRoutes} 条`);

    if (routeStats.totalWithRoutes > 0) {
      console.log('\n📊 跳数分布:');
      Object.entries(routeStats.hopDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([hops, count]) => {
          const percentage = (count / routeStats.totalWithRoutes * 100).toFixed(1);
          console.log(`   ${hops} 跳: ${count} 条 (${percentage}%)`);
        });

      console.log('\n💰 按跳数的平均利润:');
      Object.entries(routeStats.profitByHops)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([hops, stats]) => {
          console.log(`   ${hops} 跳: 平均 ${stats.avg.toFixed(6)} SOL (${stats.count} 条)`);
        });

      console.log('\n🏦 DEX 使用统计:');
      Object.entries(routeStats.dexUsage)
        .sort((a, b) => b[1] - a[1])
        .forEach(([dex, count]) => {
          const percentage = (count / routeStats.totalWithRoutes * 100).toFixed(1);
          console.log(`   ${dex}: ${count} 次 (${percentage}%)`);
        });
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRoutes();

