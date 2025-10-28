#!/usr/bin/env tsx
/**
 * 检查 metadata 字段的实际结构
 */

import { PrismaClient } from '../packages/core/node_modules/@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:Yuan971035088@localhost:5432/postgres'
    }
  }
});

async function inspectMetadata() {
  console.log('🔍 检查 opportunities metadata 结构...\n');

  // 获取前 10 条记录
  const opportunities = await prisma.opportunity.findMany({
    take: 10,
    select: {
      id: true,
      bridgeToken: true,
      inputMint: true,
      outputMint: true,
      expectedProfit: true,
      metadata: true,
    },
    orderBy: {
      discoveredAt: 'desc'
    }
  });

  console.log(`获取了 ${opportunities.length} 条记录\n`);

  opportunities.forEach((opp, index) => {
    console.log(`\n========== 记录 ${index + 1} (ID: ${opp.id}) ==========`);
    console.log(`桥接代币: ${opp.bridgeToken}`);
    console.log(`输入代币: ${opp.inputMint.substring(0, 12)}...`);
    console.log(`输出代币: ${opp.outputMint.substring(0, 12)}...`);
    console.log(`预期利润: ${Number(opp.expectedProfit) / 1e9} SOL`);
    console.log(`\nMetadata 内容:`);
    if (opp.metadata) {
      console.log(JSON.stringify(opp.metadata, null, 2));
    } else {
      console.log('  (null)');
    }
  });

  // 统计metadata 中常见的字段
  console.log('\n\n========== Metadata 字段统计 ==========\n');
  
  const allOpportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
    }
  });

  const fieldCounts = new Map<string, number>();
  
  for (const opp of allOpportunities) {
    if (opp.metadata && typeof opp.metadata === 'object') {
      for (const key of Object.keys(opp.metadata)) {
        fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
      }
    }
  }

  console.log('Metadata 字段出现频率:');
  Array.from(fieldCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => {
      console.log(`  ${key}: ${count} 次 (${((count / allOpportunities.length) * 100).toFixed(2)}%)`);
    });

  await prisma.$disconnect();
}

inspectMetadata().catch(console.error);

