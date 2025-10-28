#!/usr/bin/env tsx
/**
 * 从 Metadata 提取路由信息的增强分析工具
 * 
 * 分析 opportunities 表的 metadata 字段，提取：
 * - 路由信息（outRoute, backRoute）
 * - 池子地址
 * - DEX 名称
 */

import { PrismaClient } from '../packages/core/node_modules/@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:Yuan971035088@localhost:5432/postgres'
    }
  }
});

interface PoolInfo {
  poolAddress: string;
  dexName: string;
  inputMint: string;
  outputMint: string;
  count: number;
}

interface DexInfo {
  dexName: string;
  count: number;
  percentage: number;
}

/**
 * 从 metadata 提取路由信息
 */
async function extractRoutesFromMetadata() {
  console.log('🔍 从 opportunities metadata 提取路由信息...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      id: true,
      bridgeToken: true,
      expectedProfit: true,
      metadata: true,
    }
  });

  console.log(`📊 找到 ${opportunities.length} 条机会记录\n`);

  const poolMap = new Map<string, PoolInfo>();
  const dexMap = new Map<string, number>();
  let recordsWithMetadata = 0;
  let recordsWithRoutes = 0;

  for (const opp of opportunities) {
    if (!opp.metadata) continue;
    recordsWithMetadata++;

    const metadata = opp.metadata as any;
    
    // 提取 outboundRoute 和 returnRoute
    const routeInfo = metadata.routeInfo || {};
    const outRoute = routeInfo.outboundRoute || [];
    const backRoute = routeInfo.returnRoute || [];
    
    if (outRoute.length > 0 || backRoute.length > 0) {
      recordsWithRoutes++;
    }

    // 处理所有路由
    const allRoutes = [...outRoute, ...backRoute];
    
    for (const route of allRoutes) {
      // 提取 DEX 名称
      const dexName = route.dex || route.dexName || route.label || 'Unknown';
      dexMap.set(dexName, (dexMap.get(dexName) || 0) + 1);

      // 提取池子信息
      const poolAddress = route.poolAddress || route.id || route.ammKey;
      if (poolAddress) {
        const key = poolAddress;
        const existing = poolMap.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          poolMap.set(key, {
            poolAddress,
            dexName,
            inputMint: route.inputMint || route.fromMint || '',
            outputMint: route.outputMint || route.toMint || '',
            count: 1,
          });
        }
      }
    }
  }

  console.log(`✅ 分析完成:`);
  console.log(`   - 总记录数: ${opportunities.length}`);
  console.log(`   - 有 metadata 的记录: ${recordsWithMetadata}`);
  console.log(`   - 有路由信息的记录: ${recordsWithRoutes}`);
  console.log(`   - 发现的池子数: ${poolMap.size}`);
  console.log(`   - 发现的 DEX 数: ${dexMap.size}\n`);

  // 转换为数组并排序
  const poolStats = Array.from(poolMap.values())
    .sort((a, b) => b.count - a.count);

  const totalRouteSteps = Array.from(dexMap.values()).reduce((a, b) => a + b, 0);
  const dexStats = Array.from(dexMap.entries())
    .map(([dexName, count]) => ({
      dexName,
      count,
      percentage: (count / totalRouteSteps) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  return { poolStats, dexStats, recordsWithRoutes, recordsWithMetadata };
}

/**
 * 生成详细报告
 */
async function generateDetailedReport() {
  const { poolStats, dexStats, recordsWithRoutes, recordsWithMetadata } = 
    await extractRoutesFromMetadata();

  let report = `# 📊 套利机会路由详细分析报告

**生成时间**: ${new Date().toISOString().split('T')[0]}  
**数据源**: opportunities.metadata 字段  
**分析方法**: 提取 outRoute 和 backRoute

---

## 📈 Metadata 统计

| 指标 | 数值 |
|------|------|
| **有 metadata 的记录** | ${recordsWithMetadata.toLocaleString()} |
| **有路由信息的记录** | ${recordsWithRoutes.toLocaleString()} |
| **发现的池子数量** | ${poolStats.length.toLocaleString()} |
| **发现的 DEX 数量** | ${dexStats.length} |

---

## 🏊 池子使用详细分析

### Top 50 最常使用的池子

| 排名 | 池子地址 | DEX | 使用次数 | 交易对 (部分) |
|------|---------|-----|---------|--------------|
`;

  poolStats.slice(0, 50).forEach((stat, index) => {
    const poolShort = stat.poolAddress.substring(0, 12) + '...';
    const inputShort = stat.inputMint ? stat.inputMint.substring(0, 6) + '...' : 'N/A';
    const outputShort = stat.outputMint ? stat.outputMint.substring(0, 6) + '...' : 'N/A';
    report += `| ${index + 1} | \`${poolShort}\` | ${stat.dexName} | ${stat.count.toLocaleString()} | ${inputShort} → ${outputShort} |\n`;
  });

  report += `\n### 完整池子列表 (按使用频率排序)

`;

  poolStats.forEach((stat, index) => {
    report += `#### ${index + 1}. ${stat.poolAddress}
- **DEX**: ${stat.dexName}
- **使用次数**: ${stat.count.toLocaleString()}
- **输入代币**: \`${stat.inputMint || 'N/A'}\`
- **输出代币**: \`${stat.outputMint || 'N/A'}\`

`;
  });

  report += `---

## 🏪 DEX 使用分布

| 排名 | DEX 名称 | 使用次数 | 占比 |
|------|---------|---------|------|
`;

  dexStats.forEach((stat, index) => {
    report += `| ${index + 1} | **${stat.dexName}** | ${stat.count.toLocaleString()} | ${stat.percentage.toFixed(2)}% |\n`;
  });

  report += `\n---

## 💡 关键发现

### 1. 池子集中度
`;

  if (poolStats.length > 0) {
    const top10 = poolStats.slice(0, 10);
    const top10Count = top10.reduce((sum, p) => sum + p.count, 0);
    const totalCount = poolStats.reduce((sum, p) => sum + p.count, 0);
    const concentration = (top10Count / totalCount) * 100;
    
    report += `- **Top 10 池子占比**: ${concentration.toFixed(2)}%\n`;
    report += `- **最常用池子**: \`${poolStats[0].poolAddress}\` (${poolStats[0].dexName}, ${poolStats[0].count.toLocaleString()} 次)\n`;
    report += `- **池子多样性**: 共使用了 ${poolStats.length} 个不同的池子\n`;
  }

  report += `\n### 2. DEX 分布
`;

  if (dexStats.length > 0) {
    report += `- **主导 DEX**: ${dexStats[0].dexName} (${dexStats[0].percentage.toFixed(2)}%)\n`;
    report += `- **DEX 数量**: ${dexStats.length} 个不同的 DEX\n`;
    
    const top3 = dexStats.slice(0, 3);
    const top3Percentage = top3.reduce((sum, d) => sum + d.percentage, 0);
    report += `- **Top 3 DEX 占比**: ${top3Percentage.toFixed(2)}%\n`;
  }

  report += `\n---

## 🎯 Rust Pool Cache 配置建议

基于实际使用数据，以下是推荐添加到 Rust Pool Cache 的池子：

### 优先级 1: 高频使用池子 (Top 20)

\`\`\`toml
`;

  poolStats.slice(0, 20).forEach((stat, index) => {
    report += `# 排名 ${index + 1} - ${stat.dexName} (使用 ${stat.count} 次)
[[pools]]
address = "${stat.poolAddress}"
name = "${stat.dexName} Pool ${index + 1}"

`;
  });

  report += `\`\`\`

### 优先级 2: 中频使用池子 (Top 21-50)

可根据资源情况选择性添加。

### DEX 支持优先级

根据使用频率，建议按以下顺序开发 DEX 支持：

`;

  dexStats.slice(0, 10).forEach((stat, index) => {
    report += `${index + 1}. **${stat.dexName}** (${stat.percentage.toFixed(2)}% 使用率, ${stat.count.toLocaleString()} 次)\n`;
  });

  report += `\n---

**报告结束**
`;

  fs.writeFileSync('OPPORTUNITIES_ROUTES_ANALYSIS.md', report, 'utf-8');
  console.log('📄 生成详细报告: OPPORTUNITIES_ROUTES_ANALYSIS.md');

  // 导出 JSON
  fs.writeFileSync(
    'pool-usage-from-metadata.json',
    JSON.stringify(poolStats, null, 2),
    'utf-8'
  );
  console.log('📄 导出池子数据: pool-usage-from-metadata.json');

  fs.writeFileSync(
    'dex-usage-from-metadata.json',
    JSON.stringify(dexStats, null, 2),
    'utf-8'
  );
  console.log('📄 导出 DEX 数据: dex-usage-from-metadata.json');
}

// 主函数执行
if (require.main === module) {
  generateDetailedReport()
    .then(() => {
      console.log('\n✅ 所有分析完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { extractRoutesFromMetadata, generateDetailedReport };

