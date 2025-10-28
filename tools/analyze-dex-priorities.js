/**
 * 分析 DEX 套利机会优先级
 */

const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = "postgresql://postgres:Yuan971035088@localhost:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function analyzeDexPriorities() {
  console.log('\n🔍 分析 DEX 套利机会优先级...\n');
  console.log('═'.repeat(100));

  try {
    // 1. 查询所有套利机会
    const allOpportunities = await prisma.arbitrageOpportunity.findMany({
      select: {
        dexA: true,
        dexB: true,
        profitLamports: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10000
    });

    console.log(`\n📊 找到 ${allOpportunities.length} 条套利机会记录\n`);

    if (allOpportunities.length === 0) {
      console.log('❌ 数据库中没有套利机会记录');
      return;
    }

    // 2. 按 DEX 组合统计
    const dexPairStats = new Map();
    
    allOpportunities.forEach(opp => {
      const key = `${opp.dexA} ↔ ${opp.dexB}`;
      if (!dexPairStats.has(key)) {
        dexPairStats.set(key, {
          count: 0,
          totalProfit: 0,
          maxProfit: 0,
          profits: []
        });
      }
      
      const stats = dexPairStats.get(key);
      stats.count++;
      stats.totalProfit += Number(opp.profitLamports);
      stats.maxProfit = Math.max(stats.maxProfit, Number(opp.profitLamports));
      stats.profits.push(Number(opp.profitLamports));
    });

    // 3. 排序并展示
    const sortedPairs = Array.from(dexPairStats.entries())
      .sort((a, b) => b[1].count - a[1].count);

    console.log('═'.repeat(100));
    console.log('📈 DEX 组合套利机会排名（按机会数量）\n');
    console.log('排名 | DEX 组合                      | 机会数 |  平均利润(SOL) |  最大利润(SOL) | 利润占比');
    console.log('─'.repeat(100));

    let totalCount = 0;
    sortedPairs.forEach(([key, stats]) => {
      totalCount += stats.count;
    });

    sortedPairs.slice(0, 15).forEach(([key, stats], index) => {
      const avgProfit = (stats.totalProfit / stats.count / 1e9).toFixed(6);
      const maxProfit = (stats.maxProfit / 1e9).toFixed(6);
      const percentage = ((stats.count / totalCount) * 100).toFixed(1);
      
      console.log(
        `${String(index + 1).padStart(4)} | ` +
        `${key.padEnd(29)} | ` +
        `${String(stats.count).padStart(6)} | ` +
        `${avgProfit.padStart(15)} | ` +
        `${maxProfit.padStart(15)} | ` +
        `${percentage.padStart(7)}%`
      );
    });

    // 4. 单个 DEX 统计
    console.log('\n\n═'.repeat(100));
    console.log('🎯 单个 DEX 活跃度排名\n');
    console.log('排名 | DEX 名称        | 涉及机会数 | 平均利润(SOL) | 占比');
    console.log('─'.repeat(70));

    const dexStats = new Map();
    
    allOpportunities.forEach(opp => {
      [opp.dexA, opp.dexB].forEach(dex => {
        if (!dexStats.has(dex)) {
          dexStats.set(dex, {
            count: 0,
            totalProfit: 0,
          });
        }
        const stats = dexStats.get(dex);
        stats.count++;
        stats.totalProfit += Number(opp.profitLamports);
      });
    });

    const sortedDexes = Array.from(dexStats.entries())
      .sort((a, b) => b[1].count - a[1].count);

    let totalDexCount = 0;
    sortedDexes.forEach(([dex, stats]) => {
      totalDexCount += stats.count;
    });

    sortedDexes.forEach(([dex, stats], index) => {
      const avgProfit = (stats.totalProfit / stats.count / 1e9).toFixed(6);
      const percentage = ((stats.count / totalDexCount) * 100).toFixed(1);
      
      console.log(
        `${String(index + 1).padStart(4)} | ` +
        `${dex.padEnd(15)} | ` +
        `${String(stats.count).padStart(10)} | ` +
        `${avgProfit.padStart(14)} | ` +
        `${percentage.padStart(5)}%`
      );
    });

    // 5. 最近7天的趋势
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOpps = allOpportunities.filter(opp => 
      new Date(opp.createdAt) > sevenDaysAgo
    );

    if (recentOpps.length > 0) {
      console.log('\n\n═'.repeat(100));
      console.log(`📅 最近 7 天活跃度（共 ${recentOpps.length} 条记录）\n`);
      
      const recentDexPairStats = new Map();
      
      recentOpps.forEach(opp => {
        const key = `${opp.dexA} ↔ ${opp.dexB}`;
        if (!recentDexPairStats.has(key)) {
          recentDexPairStats.set(key, { count: 0 });
        }
        recentDexPairStats.get(key).count++;
      });

      const sortedRecentPairs = Array.from(recentDexPairStats.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      console.log('排名 | DEX 组合                      | 机会数');
      console.log('─'.repeat(60));
      
      sortedRecentPairs.forEach(([key, stats], index) => {
        console.log(
          `${String(index + 1).padStart(4)} | ` +
          `${key.padEnd(29)} | ` +
          `${String(stats.count).padStart(6)}`
        );
      });
    }

    // 6. 建议接入顺序
    console.log('\n\n═'.repeat(100));
    console.log('💡 建议的 DEX 接入顺序（基于数据分析）\n');
    console.log('优先级 | DEX          | 理由');
    console.log('─'.repeat(80));

    const topDexes = sortedDexes.slice(0, 8);
    topDexes.forEach(([dex, stats], index) => {
      const priority = index < 2 ? '🔥 P0 (立即)' : 
                       index < 4 ? '⚡ P1 (本周)' : 
                       '💡 P2 (下周)';
      const reason = index === 0 ? '最多机会，必须优先' :
                     index === 1 ? '第二活跃，配合第一形成主要套利对' :
                     index < 4 ? '中等活跃度，扩展机会覆盖' :
                     '补充长尾机会';
      
      console.log(
        `${priority.padEnd(15)} | ` +
        `${dex.padEnd(12)} | ` +
        `${reason}`
      );
    });

    console.log('\n═'.repeat(100));
    console.log('\n✅ 分析完成！建议按照上述优先级顺序接入 DEX。\n');

  } catch (error) {
    console.error('❌ 查询失败:', error);
    console.error('\n详细错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDexPriorities();



