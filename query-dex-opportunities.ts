import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Yuan971035088@localhost:5432/postgres"
    }
  }
});

async function main() {
  console.log('\n🔍 查询数据库中的 DEX 套利机会统计...\n');
  
  try {
    // 1. 从 opportunities 表查询（metadata 中可能包含 route 信息）
    console.log('📊 方法 1: 从 opportunities 表查询...\n');
    
    const opportunities = await prisma.opportunity.findMany({
      select: {
        metadata: true,
        expectedProfit: true,
      },
      take: 1000,
    });
    
    console.log(`找到 ${opportunities.length} 条机会记录\n`);
    
    if (opportunities.length > 0) {
      // 统计 DEX
      const dexStats = new Map<string, { count: number; totalProfit: bigint }>();
      
      opportunities.forEach(opp => {
        if (opp.metadata && typeof opp.metadata === 'object') {
          const metadata = opp.metadata as any;
          if (metadata.route && Array.isArray(metadata.route)) {
            metadata.route.forEach((dex: string) => {
              if (!dexStats.has(dex)) {
                dexStats.set(dex, { count: 0, totalProfit: 0n });
              }
              const stats = dexStats.get(dex)!;
              stats.count++;
              stats.totalProfit += opp.expectedProfit;
            });
          }
        }
      });
      
      if (dexStats.size > 0) {
        const sorted = Array.from(dexStats.entries())
          .sort((a, b) => b[1].count - a[1].count);
        
        console.log('排名 | DEX 名称        | 机会数 | 平均利润(SOL)');
        console.log('─'.repeat(60));
        
        sorted.forEach(([dex, stats], idx) => {
          const avgProfit = (Number(stats.totalProfit) / stats.count / 1e9).toFixed(6);
          console.log(
            `${String(idx + 1).padStart(4)} | ` +
            `${dex.padEnd(15)} | ` +
            `${String(stats.count).padStart(6)} | ` +
            `${avgProfit.padStart(14)}`
          );
        });
        
        return sorted;
      }
    }
    
    // 2. 从 trade_routes 表查询
    console.log('\n📊 方法 2: 从 trade_routes 表查询...\n');
    
    const routes = await prisma.tradeRoute.findMany({
      select: {
        dexName: true,
        trade: {
          select: {
            netProfit: true,
          }
        }
      },
      take: 1000,
    });
    
    console.log(`找到 ${routes.length} 条路由记录\n`);
    
    if (routes.length > 0) {
      const dexStats = new Map<string, { count: number; profits: bigint[] }>();
      
      routes.forEach(route => {
        const dex = route.dexName;
        if (!dexStats.has(dex)) {
          dexStats.set(dex, { count: 0, profits: [] });
        }
        const stats = dexStats.get(dex)!;
        stats.count++;
        if (route.trade?.netProfit) {
          stats.profits.push(route.trade.netProfit);
        }
      });
      
      const sorted = Array.from(dexStats.entries())
        .sort((a, b) => b[1].count - a[1].count);
      
      console.log('排名 | DEX 名称        | 使用次数 | 平均利润(SOL)');
      console.log('─'.repeat(60));
      
      sorted.forEach(([dex, stats], idx) => {
        const avgProfit = stats.profits.length > 0
          ? (stats.profits.reduce((a, b) => a + b, 0n) / BigInt(stats.profits.length))
          : 0n;
        const avgProfitSol = (Number(avgProfit) / 1e9).toFixed(6);
        
        console.log(
          `${String(idx + 1).padStart(4)} | ` +
          `${dex.padEnd(15)} | ` +
          `${String(stats.count).padStart(8)} | ` +
          `${avgProfitSol.padStart(14)}`
        );
      });
      
      return sorted;
    }
    
    console.log('❌ 数据库中没有找到 DEX 相关数据\n');
    return null;
    
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(result => {
  if (!result) {
    console.log('\n💡 使用基于 Solana 生态系统的默认 DEX 优先级\n');
  }
});



