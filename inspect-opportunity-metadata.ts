import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Yuan971035088@localhost:5432/postgres"
    }
  }
});

async function main() {
  console.log('\n🔍 检查 opportunities 表的 metadata 结构...\n');
  
  const opportunities = await prisma.opportunity.findMany({
    select: {
      id: true,
      inputMint: true,
      outputMint: true,
      bridgeToken: true,
      expectedProfit: true,
      metadata: true,
      discoveredAt: true,
    },
    orderBy: {
      discoveredAt: 'desc'
    },
    take: 10,
  });
  
  console.log(`找到 ${opportunities.length} 条最新记录\n`);
  console.log('示例数据：\n');
  console.log('═'.repeat(80));
  
  opportunities.slice(0, 3).forEach((opp, idx) => {
    console.log(`\n记录 ${idx + 1}:`);
    console.log(`  ID: ${opp.id}`);
    console.log(`  Input Mint: ${opp.inputMint}`);
    console.log(`  Output Mint: ${opp.outputMint}`);
    console.log(`  Bridge Token: ${opp.bridgeToken}`);
    console.log(`  Expected Profit: ${(Number(opp.expectedProfit) / 1e9).toFixed(6)} SOL`);
    console.log(`  Discovered At: ${opp.discoveredAt}`);
    console.log(`  Metadata:`, JSON.stringify(opp.metadata, null, 2));
  });
  
  // 统计 bridge token
  console.log('\n\n═'.repeat(80));
  console.log('\n📊 按 Bridge Token 统计：\n');
  
  const tokenStats = new Map<string, number>();
  
  opportunities.forEach(opp => {
    const token = opp.bridgeToken || 'Direct';
    tokenStats.set(token, (tokenStats.get(token) || 0) + 1);
  });
  
  const sorted = Array.from(tokenStats.entries()).sort((a, b) => b[1] - a[1]);
  
  console.log('Bridge Token | 机会数');
  console.log('─'.repeat(30));
  sorted.forEach(([token, count]) => {
    console.log(`${token.padEnd(12)} | ${count}`);
  });
  
  await prisma.$disconnect();
}

main();



