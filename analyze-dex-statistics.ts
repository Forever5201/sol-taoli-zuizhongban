import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Yuan971035088@localhost:5432/postgres"
    }
  }
});

interface DexStats {
  totalOpportunities: number;
  totalProfit: bigint;
  avgProfit: number;
  inOutbound: number;
  inReturn: number;
}

async function main() {
  console.log('\n🔍 分析数据库中的 DEX 套利机会统计...\n');
  console.log('═'.repeat(80));
  
  // 查询所有机会
  const opportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
      expectedProfit: true,
    },
  });
  
  console.log(`\n找到 ${opportunities.length} 条套利机会记录\n`);
  
  // 统计每个 DEX
  const dexStats = new Map<string, DexStats>();
  
  opportunities.forEach(opp => {
    if (opp.metadata && typeof opp.metadata === 'object') {
      const metadata = opp.metadata as any;
      
      // 从 routeInfo.dexes 数组中获取所有 DEX
      if (metadata.routeInfo?.dexes && Array.isArray(metadata.routeInfo.dexes)) {
        const uniqueDexes = new Set(metadata.routeInfo.dexes);
        
        uniqueDexes.forEach((dex: string) => {
          if (!dexStats.has(dex)) {
            dexStats.set(dex, {
              totalOpportunities: 0,
              totalProfit: 0n,
              avgProfit: 0,
              inOutbound: 0,
              inReturn: 0,
            });
          }
          
          const stats = dexStats.get(dex)!;
          stats.totalOpportunities++;
          stats.totalProfit += opp.expectedProfit;
        });
      }
      
      // 统计在 outbound 和 return 路由中的出现次数
      if (metadata.routeInfo?.outboundRoute && Array.isArray(metadata.routeInfo.outboundRoute)) {
        metadata.routeInfo.outboundRoute.forEach((route: any) => {
          const dex = route.dex;
          if (dexStats.has(dex)) {
            dexStats.get(dex)!.inOutbound++;
          }
        });
      }
      
      if (metadata.routeInfo?.returnRoute && Array.isArray(metadata.routeInfo.returnRoute)) {
        metadata.routeInfo.returnRoute.forEach((route: any) => {
          const dex = route.dex;
          if (dexStats.has(dex)) {
            dexStats.get(dex)!.inReturn++;
          }
        });
      }
    }
  });
  
  // 计算平均利润
  dexStats.forEach((stats, dex) => {
    stats.avgProfit = Number(stats.totalProfit) / stats.totalOpportunities / 1e9;
  });
  
  // 按机会数降序排序
  const sortedDexes = Array.from(dexStats.entries())
    .sort((a, b) => b[1].totalOpportunities - a[1].totalOpportunities);
  
  // 打印到控制台
  console.log('═'.repeat(100));
  console.log('\n📊 DEX 套利机会统计（降序排序）\n');
  console.log('排名 | DEX 名称          | 涉及机会数 | 出站使用 | 返回使用 | 平均利润(SOL)');
  console.log('─'.repeat(100));
  
  let totalOpportunities = 0;
  sortedDexes.forEach(([dex, stats]) => {
    totalOpportunities += stats.totalOpportunities;
  });
  
  sortedDexes.forEach(([dex, stats], idx) => {
    const percentage = ((stats.totalOpportunities / totalOpportunities) * 100).toFixed(1);
    console.log(
      `${String(idx + 1).padStart(4)} | ` +
      `${dex.padEnd(17)} | ` +
      `${String(stats.totalOpportunities).padStart(10)} (${percentage.padStart(4)}%) | ` +
      `${String(stats.inOutbound).padStart(8)} | ` +
      `${String(stats.inReturn).padStart(8)} | ` +
      `${stats.avgProfit.toFixed(6).padStart(14)}`
    );
  });
  
  console.log('─'.repeat(100));
  console.log(`总计: ${sortedDexes.length} 个 DEX, ${totalOpportunities} 次机会涉及\n`);
  
  // 生成 Markdown 报告
  const mdContent = generateMarkdownReport(sortedDexes, totalOpportunities, opportunities.length);
  
  fs.writeFileSync('DEX_PRIORITY_REPORT.md', mdContent, 'utf-8');
  console.log('✅ 报告已生成: DEX_PRIORITY_REPORT.md\n');
  
  await prisma.$disconnect();
  
  return sortedDexes;
}

function generateMarkdownReport(
  sortedDexes: [string, DexStats][],
  totalOpportunities: number,
  totalRecords: number
): string {
  const timestamp = new Date().toLocaleString('zh-CN');
  
  let md = `# 📊 DEX 套利机会统计报告

**生成时间**: ${timestamp}
**数据来源**: PostgreSQL 数据库 (postgres)
**分析记录数**: ${totalRecords} 条套利机会

---

## 📈 执行摘要

- **发现 DEX 总数**: ${sortedDexes.length} 个
- **涉及机会总数**: ${totalOpportunities} 次（一个机会可能涉及多个 DEX）
- **平均每个机会涉及**: ${(totalOpportunities / totalRecords).toFixed(2)} 个 DEX
- **最活跃 DEX**: ${sortedDexes[0][0]} (${sortedDexes[0][1].totalOpportunities} 次机会)

---

## 🏆 DEX 优先级排名（按涉及机会数降序）

| 排名 | DEX 名称 | 涉及机会数 | 占比 | 出站使用 | 返回使用 | 平均利润(SOL) |
|------|---------|-----------|------|---------|---------|---------------|
`;

  sortedDexes.forEach(([dex, stats], idx) => {
    const percentage = ((stats.totalOpportunities / totalOpportunities) * 100).toFixed(1);
    const priority = idx < 3 ? '🔥' : idx < 6 ? '⚡' : idx < 10 ? '💡' : '📌';
    
    md += `| ${idx + 1} ${priority} | **${dex}** | ${stats.totalOpportunities} | ${percentage}% | ${stats.inOutbound} | ${stats.inReturn} | ${stats.avgProfit.toFixed(6)} |\n`;
  });

  md += `\n---

## 🎯 接入建议

### 🔥 P0 优先级（立即接入）- 前 3 名
覆盖 ${((sortedDexes.slice(0, 3).reduce((sum, [_, stats]) => sum + stats.totalOpportunities, 0) / totalOpportunities) * 100).toFixed(1)}% 的机会

`;

  sortedDexes.slice(0, 3).forEach(([dex, stats], idx) => {
    const percentage = ((stats.totalOpportunities / totalOpportunities) * 100).toFixed(1);
    md += `${idx + 1}. **${dex}**\n`;
    md += `   - 涉及机会: ${stats.totalOpportunities} 次 (${percentage}%)\n`;
    md += `   - 平均利润: ${stats.avgProfit.toFixed(6)} SOL\n`;
    md += `   - 建议: ${idx === 0 ? '最高优先级，必须立即接入' : '高优先级，本周完成'}\n\n`;
  });

  md += `### ⚡ P1 优先级（本周接入）- 第 4-6 名
覆盖额外 ${((sortedDexes.slice(3, 6).reduce((sum, [_, stats]) => sum + stats.totalOpportunities, 0) / totalOpportunities) * 100).toFixed(1)}% 的机会

`;

  sortedDexes.slice(3, 6).forEach(([dex, stats], idx) => {
    const percentage = ((stats.totalOpportunities / totalOpportunities) * 100).toFixed(1);
    md += `${idx + 4}. **${dex}**\n`;
    md += `   - 涉及机会: ${stats.totalOpportunities} 次 (${percentage}%)\n`;
    md += `   - 平均利润: ${stats.avgProfit.toFixed(6)} SOL\n\n`;
  });

  md += `### 💡 P2 优先级（下周接入）- 第 7-10 名

`;

  sortedDexes.slice(6, 10).forEach(([dex, stats], idx) => {
    const percentage = ((stats.totalOpportunities / totalOpportunities) * 100).toFixed(1);
    md += `${idx + 7}. **${dex}** - ${stats.totalOpportunities} 次 (${percentage}%)\n`;
  });

  if (sortedDexes.length > 10) {
    md += `\n### 📌 长尾 DEX（后续考虑）- 第 11+ 名

`;
    sortedDexes.slice(10).forEach(([dex, stats], idx) => {
      const percentage = ((stats.totalOpportunities / totalOpportunities) * 100).toFixed(1);
      md += `- ${dex}: ${stats.totalOpportunities} 次 (${percentage}%)\n`;
    });
  }

  md += `\n---

## 📊 数据分析

### 机会分布

- **前 3 名 DEX**: 占总机会的 ${((sortedDexes.slice(0, 3).reduce((sum, [_, stats]) => sum + stats.totalOpportunities, 0) / totalOpportunities) * 100).toFixed(1)}%
- **前 6 名 DEX**: 占总机会的 ${((sortedDexes.slice(0, 6).reduce((sum, [_, stats]) => sum + stats.totalOpportunities, 0) / totalOpportunities) * 100).toFixed(1)}%
- **前 10 名 DEX**: 占总机会的 ${((sortedDexes.slice(0, 10).reduce((sum, [_, stats]) => sum + stats.totalOpportunities, 0) / totalOpportunities) * 100).toFixed(1)}%

### 利润分析

- **最高平均利润**: ${sortedDexes.reduce((max, [dex, stats]) => stats.avgProfit > max[1].avgProfit ? [dex, stats] : max, sortedDexes[0])[0]} (${sortedDexes.reduce((max, [dex, stats]) => stats.avgProfit > max[1].avgProfit ? [dex, stats] : max, sortedDexes[0])[1].avgProfit.toFixed(6)} SOL)
- **整体平均利润**: ${(sortedDexes.reduce((sum, [_, stats]) => sum + stats.avgProfit, 0) / sortedDexes.length).toFixed(6)} SOL

---

## 🚀 实施建议

### 阶段 1：核心 DEX（今天-明天）
接入前 3 名 DEX，覆盖大部分机会

### 阶段 2：扩展（本周）
接入第 4-6 名 DEX，进一步提升覆盖率

### 阶段 3：补充（下周）
接入第 7-10 名 DEX，覆盖长尾机会

### 阶段 4：评估（2 周后）
根据实际执行效果，决定是否接入剩余 DEX

---

## 📝 备注

- 数据基于历史套利机会统计
- 一个套利机会可能涉及多个 DEX（如 SOL → USDC → USDT → SOL）
- "涉及机会数"表示该 DEX 在多少个套利路径中被使用
- "出站使用"和"返回使用"分别统计在去程和回程中的使用次数

---

**报告生成时间**: ${timestamp}
**数据来源**: 套利机器人数据库
`;

  return md;
}

main().then(result => {
  if (result) {
    console.log('✅ 分析完成！\n');
  }
}).catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});



