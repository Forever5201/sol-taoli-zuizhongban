import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Yuan971035088@localhost:5432/postgres"
    }
  }
});

async function main() {
  console.log('\n🔍 分析现有交易数据中的 DEX 使用情况...\n');
  
  try {
    // 1. 查询所有交易路由
    const routes = await prisma.tradeRoute.findMany({
      select: {
        dexName: true,
        direction: true,
        trade: {
          select: {
            netProfit: true,
            status: true,
          }
        }
      }
    });

    console.log(`找到 ${routes.length} 条路由记录\n`);

    if (routes.length === 0) {
      console.log('⚠️  数据库中没有交易路由记录\n');
      console.log('💡 基于 Solana 生态系统的常识，建议以下 DEX 优先级：\n');
      showDefaultPriority();
      return;
    }

    // 2. 统计DEX使用情况
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

    // 3. 排序并展示
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

    // 4. 建议优先级
    console.log('\n\n💡 建议的 DEX 接入顺序：\n');
    console.log('优先级 | DEX          | 说明');
    console.log('─'.repeat(70));

    sorted.slice(0, 8).forEach(([dex], idx) => {
      const priority = idx < 2 ? '🔥 P0 (立即)' : 
                       idx < 4 ? '⚡ P1 (本周)' : 
                       '💡 P2 (下周)';
      const desc = idx === 0 ? '最常使用，优先接入' :
                   idx === 1 ? '第二活跃，配对套利' :
                   '扩展覆盖范围';
      
      console.log(
        `${priority.padEnd(15)} | ` +
        `${dex.padEnd(12)} | ` +
        `${desc}`
      );
    });

  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    console.log('\n💡 使用默认 DEX 优先级（基于 Solana 生态）：\n');
    showDefaultPriority();
  } finally {
    await prisma.$disconnect();
  }
}

function showDefaultPriority() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   基于 Solana 生态系统最活跃的 DEX（2025年数据）                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('优先级 | DEX          | 日交易量    | 说明');
  console.log('─'.repeat(80));
  console.log('🔥 P0   | Raydium      | $500M+      | 最大流动性，AMM V4，必须优先');
  console.log('🔥 P0   | Orca         | $300M+      | 第二大，Whirlpool，配对套利');
  console.log('⚡ P1   | Meteora      | $150M+      | 动态AMM，高效率');
  console.log('⚡ P1   | Phoenix      | $100M+      | 订单簿DEX，低滑点');
  console.log('💡 P2   | Lifinity     | $50M+       | DLMM，特殊机制');
  console.log('💡 P2   | Openbook     | $40M+       | 中央限价订单簿');
  console.log('💡 P2   | Drift        | $30M+       | 永续合约+现货');
  console.log('💡 P2   | Invariant    | $20M+       | 集中流动性');
  
  console.log('\n📌 推荐实施顺序：');
  console.log('   1. Raydium (今天)   - 最多机会');
  console.log('   2. Orca (明天)      - 配对形成主要套利对');
  console.log('   3. Meteora (本周)   - 扩展覆盖');
  console.log('   4. 其他 DEX (逐步)  - 补充长尾机会');
}

main();



