import { PrismaClient } from '@prisma/client';

const DATABASE_URL = "postgresql://postgres:Yuan971035088@localhost:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function main() {
  console.log('\n🔍 分析 DEX 套利机会优先级...\n');
  
  const opportunities = await prisma.arbitrageOpportunity.findMany({
    select: {
      dexA: true,
      dexB: true,
      profitLamports: true,
    },
    take: 10000
  });

  console.log(`找到 ${opportunities.length} 条记录\n`);

  // 统计 DEX 组合
  const stats = new Map<string, { count: number; totalProfit: bigint; maxProfit: bigint }>();
  
  opportunities.forEach(opp => {
    const key = `${opp.dexA} ↔ ${opp.dexB}`;
    if (!stats.has(key)) {
      stats.set(key, { count: 0, totalProfit: 0n, maxProfit: 0n });
    }
    const s = stats.get(key)!;
    s.count++;
    s.totalProfit += opp.profitLamports;
    if (opp.profitLamports > s.maxProfit) {
      s.maxProfit = opp.profitLamports;
    }
  });

  // 排序
  const sorted = Array.from(stats.entries()).sort((a, b) => b[1].count - a[1].count);

  console.log('排名 | DEX 组合                      | 机会数 |  平均利润(SOL) |  最大利润(SOL)');
  console.log('─'.repeat(90));

  sorted.slice(0, 15).forEach(([key, s], idx) => {
    const avgProfit = (Number(s.totalProfit) / s.count / 1e9).toFixed(6);
    const maxProfit = (Number(s.maxProfit) / 1e9).toFixed(6);
    console.log(
      `${String(idx + 1).padStart(4)} | ` +
      `${key.padEnd(29)} | ` +
      `${String(s.count).padStart(6)} | ` +
      `${avgProfit.padStart(15)} | ` +
      `${maxProfit.padStart(15)}`
    );
  });

  await prisma.$disconnect();
}

main();



