#!/usr/bin/env tsx
/**
 * 套利机会数据库分析工具
 * 
 * 分析数据库中的套利机会记录，识别：
 * - 最常用的桥接代币
 * - 最常使用的池子地址
 * - DEX 使用分布
 * - 利润率和成功率统计
 */

import { PrismaClient } from '../packages/core/node_modules/@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// 初始化 Prisma Client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:Yuan971035088@localhost:5432/postgres'
    }
  }
});

interface BridgeTokenStat {
  token: string;
  count: number;
  percentage: number;
  avgProfit: number;
  totalProfit: number;
  executedCount: number;
  executionRate: number;
}

interface PoolUsageStat {
  poolAddress: string;
  dexName: string;
  usageCount: number;
  uniqueTrades: number;
  inputMint: string;
  outputMint: string;
}

interface DexStat {
  dexName: string;
  usageCount: number;
  percentage: number;
  avgProfit: number;
}

interface OpportunitySummary {
  totalOpportunities: number;
  executedOpportunities: number;
  filteredOpportunities: number;
  executionRate: number;
  avgExpectedProfit: number;
  medianExpectedProfit: number;
  maxProfit: number;
  minProfit: number;
  totalExpectedProfit: number;
}

/**
 * 主分析函数
 */
async function analyzeOpportunities() {
  console.log('🔍 开始分析套利机会数据...\n');

  try {
    // 1. 获取汇总统计
    console.log('📊 步骤 1/5: 获取汇总统计...');
    const summary = await getOpportunitySummary();
    
    // 2. 分析桥接代币
    console.log('📊 步骤 2/5: 分析桥接代币...');
    const bridgeTokenStats = await analyzeBridgeTokens();
    
    // 3. 分析池子使用
    console.log('📊 步骤 3/5: 分析池子使用...');
    const poolStats = await analyzePoolUsage();
    
    // 4. 分析 DEX 分布
    console.log('📊 步骤 4/5: 分析 DEX 分布...');
    const dexStats = await analyzeDexDistribution();
    
    // 5. 生成报告
    console.log('📊 步骤 5/5: 生成分析报告...');
    await generateReport(summary, bridgeTokenStats, poolStats, dexStats);
    
    // 6. 导出数据
    await exportData(summary, bridgeTokenStats, poolStats, dexStats);
    
    console.log('\n✅ 分析完成！');
    console.log('📁 生成的文件：');
    console.log('   - OPPORTUNITIES_ANALYSIS_REPORT.md (详细报告)');
    console.log('   - opportunities-summary.json (汇总数据)');
    console.log('   - bridge-tokens-stats.json (桥接代币统计)');
    console.log('   - pool-usage-stats.json (池子使用统计)');
    
  } catch (error) {
    console.error('❌ 分析过程中出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 获取机会汇总统计
 */
async function getOpportunitySummary(): Promise<OpportunitySummary> {
  const opportunities = await prisma.opportunity.findMany({
    select: {
      expectedProfit: true,
      executed: true,
      filtered: true,
    }
  });

  const totalOpportunities = opportunities.length;
  const executedOpportunities = opportunities.filter(o => o.executed).length;
  const filteredOpportunities = opportunities.filter(o => o.filtered).length;
  
  const profits = opportunities.map(o => Number(o.expectedProfit));
  const avgExpectedProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
  const sortedProfits = profits.sort((a, b) => a - b);
  const medianExpectedProfit = sortedProfits[Math.floor(sortedProfits.length / 2)];
  
  return {
    totalOpportunities,
    executedOpportunities,
    filteredOpportunities,
    executionRate: totalOpportunities > 0 ? (executedOpportunities / totalOpportunities) * 100 : 0,
    avgExpectedProfit: avgExpectedProfit / 1e9, // 转换为 SOL
    medianExpectedProfit: medianExpectedProfit / 1e9,
    maxProfit: Math.max(...profits) / 1e9,
    minProfit: Math.min(...profits) / 1e9,
    totalExpectedProfit: profits.reduce((a, b) => a + b, 0) / 1e9,
  };
}

/**
 * 分析桥接代币使用情况
 */
async function analyzeBridgeTokens(): Promise<BridgeTokenStat[]> {
  const opportunities = await prisma.opportunity.findMany({
    select: {
      bridgeToken: true,
      expectedProfit: true,
      executed: true,
    }
  });

  const tokenMap = new Map<string, {
    count: number;
    totalProfit: bigint;
    executedCount: number;
  }>();

  for (const opp of opportunities) {
    if (!opp.bridgeToken) continue;
    
    const token = opp.bridgeToken;
    const existing = tokenMap.get(token) || { 
      count: 0, 
      totalProfit: BigInt(0), 
      executedCount: 0 
    };
    
    tokenMap.set(token, {
      count: existing.count + 1,
      totalProfit: existing.totalProfit + opp.expectedProfit,
      executedCount: existing.executedCount + (opp.executed ? 1 : 0),
    });
  }

  const totalWithBridge = opportunities.filter(o => o.bridgeToken).length;
  
  const stats: BridgeTokenStat[] = Array.from(tokenMap.entries()).map(([token, data]) => ({
    token,
    count: data.count,
    percentage: (data.count / totalWithBridge) * 100,
    avgProfit: Number(data.totalProfit) / data.count / 1e9,
    totalProfit: Number(data.totalProfit) / 1e9,
    executedCount: data.executedCount,
    executionRate: (data.executedCount / data.count) * 100,
  }));

  return stats.sort((a, b) => b.count - a.count);
}

/**
 * 分析池子使用情况
 */
async function analyzePoolUsage(): Promise<PoolUsageStat[]> {
  // 从 trade_routes 表获取池子使用数据
  const routes = await prisma.tradeRoute.findMany({
    select: {
      poolAddress: true,
      dexName: true,
      tradeId: true,
      inputMint: true,
      outputMint: true,
    },
    where: {
      poolAddress: {
        not: null
      }
    }
  });

  const poolMap = new Map<string, {
    dexName: string;
    tradeIds: Set<number>;
    inputMint: string;
    outputMint: string;
  }>();

  for (const route of routes) {
    if (!route.poolAddress) continue;
    
    const key = route.poolAddress;
    const existing = poolMap.get(key);
    
    if (existing) {
      existing.tradeIds.add(Number(route.tradeId));
    } else {
      poolMap.set(key, {
        dexName: route.dexName,
        tradeIds: new Set([Number(route.tradeId)]),
        inputMint: route.inputMint,
        outputMint: route.outputMint,
      });
    }
  }

  const stats: PoolUsageStat[] = Array.from(poolMap.entries()).map(([poolAddress, data]) => ({
    poolAddress,
    dexName: data.dexName,
    usageCount: routes.filter(r => r.poolAddress === poolAddress).length,
    uniqueTrades: data.tradeIds.size,
    inputMint: data.inputMint,
    outputMint: data.outputMint,
  }));

  return stats.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * 分析 DEX 分布
 */
async function analyzeDexDistribution(): Promise<DexStat[]> {
  const routes = await prisma.tradeRoute.findMany({
    select: {
      dexName: true,
      trade: {
        select: {
          netProfit: true,
        }
      }
    }
  });

  const dexMap = new Map<string, {
    count: number;
    totalProfit: bigint;
  }>();

  for (const route of routes) {
    const dex = route.dexName;
    const existing = dexMap.get(dex) || { count: 0, totalProfit: BigInt(0) };
    
    dexMap.set(dex, {
      count: existing.count + 1,
      totalProfit: existing.totalProfit + (route.trade?.netProfit || BigInt(0)),
    });
  }

  const totalRoutes = routes.length;
  
  const stats: DexStat[] = Array.from(dexMap.entries()).map(([dexName, data]) => ({
    dexName,
    usageCount: data.count,
    percentage: (data.count / totalRoutes) * 100,
    avgProfit: Number(data.totalProfit) / data.count / 1e9,
  }));

  return stats.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * 生成 Markdown 报告
 */
async function generateReport(
  summary: OpportunitySummary,
  bridgeTokenStats: BridgeTokenStat[],
  poolStats: PoolUsageStat[],
  dexStats: DexStat[]
) {
  const now = new Date().toISOString().split('T')[0];
  
  let report = `# 📊 套利机会数据库分析报告

**生成时间**: ${now}  
**数据库**: PostgreSQL  
**分析工具**: analyze-opportunities.ts

---

## 📈 汇总统计

| 指标 | 数值 |
|------|------|
| **总机会数** | ${summary.totalOpportunities.toLocaleString()} |
| **已执行** | ${summary.executedOpportunities.toLocaleString()} (${summary.executionRate.toFixed(2)}%) |
| **已过滤** | ${summary.filteredOpportunities.toLocaleString()} |
| **平均预期利润** | ${summary.avgExpectedProfit.toFixed(4)} SOL |
| **中位数利润** | ${summary.medianExpectedProfit.toFixed(4)} SOL |
| **最高利润** | ${summary.maxProfit.toFixed(4)} SOL |
| **最低利润** | ${summary.minProfit.toFixed(4)} SOL |
| **总预期利润** | ${summary.totalExpectedProfit.toFixed(2)} SOL |

---

## 🔗 桥接代币分析

### Top 10 最常用的桥接代币

| 排名 | 代币 | 使用次数 | 占比 | 平均利润 (SOL) | 总利润 (SOL) | 执行次数 | 执行率 |
|------|------|---------|------|----------------|--------------|----------|--------|
`;

  bridgeTokenStats.slice(0, 10).forEach((stat, index) => {
    report += `| ${index + 1} | **${stat.token}** | ${stat.count.toLocaleString()} | ${stat.percentage.toFixed(2)}% | ${stat.avgProfit.toFixed(4)} | ${stat.totalProfit.toFixed(2)} | ${stat.executedCount} | ${stat.executionRate.toFixed(2)}% |\n`;
  });

  report += `\n### 桥接代币详细统计

`;

  bridgeTokenStats.forEach((stat) => {
    report += `#### ${stat.token}
- **使用次数**: ${stat.count.toLocaleString()}
- **使用占比**: ${stat.percentage.toFixed(2)}%
- **平均利润**: ${stat.avgProfit.toFixed(4)} SOL
- **总利润**: ${stat.totalProfit.toFixed(2)} SOL
- **执行次数**: ${stat.executedCount}
- **执行率**: ${stat.executionRate.toFixed(2)}%

`;
  });

  report += `---

## 🏊 池子使用分析

### Top 20 最常使用的池子

| 排名 | 池子地址 | DEX | 使用次数 | 唯一交易数 | 交易对 |
|------|---------|-----|---------|-----------|--------|
`;

  poolStats.slice(0, 20).forEach((stat, index) => {
    const inputShort = stat.inputMint.substring(0, 6) + '...';
    const outputShort = stat.outputMint.substring(0, 6) + '...';
    report += `| ${index + 1} | \`${stat.poolAddress.substring(0, 8)}...\` | ${stat.dexName} | ${stat.usageCount} | ${stat.uniqueTrades} | ${inputShort} → ${outputShort} |\n`;
  });

  report += `\n### 池子使用统计

总共发现 **${poolStats.length}** 个不同的池子地址。

`;

  report += `---

## 🏪 DEX 分布分析

| 排名 | DEX 名称 | 使用次数 | 占比 | 平均利润 (SOL) |
|------|---------|---------|------|----------------|
`;

  dexStats.forEach((stat, index) => {
    report += `| ${index + 1} | **${stat.dexName}** | ${stat.usageCount.toLocaleString()} | ${stat.percentage.toFixed(2)}% | ${stat.avgProfit.toFixed(4)} |\n`;
  });

  report += `\n---

## 💡 关键发现

### 1. 桥接代币偏好
`;

  if (bridgeTokenStats.length > 0) {
    const top3 = bridgeTokenStats.slice(0, 3);
    const top3Percentage = top3.reduce((sum, s) => sum + s.percentage, 0);
    report += `- 前 3 名桥接代币占比: **${top3Percentage.toFixed(2)}%**\n`;
    report += `- 最常用: **${top3[0].token}** (${top3[0].count} 次，${top3[0].percentage.toFixed(2)}%)\n`;
    
    const mostProfitable = [...bridgeTokenStats].sort((a, b) => b.avgProfit - a.avgProfit)[0];
    report += `- 最高平均利润: **${mostProfitable.token}** (${mostProfitable.avgProfit.toFixed(4)} SOL)\n`;
  }

  report += `\n### 2. 池子集中度
`;

  if (poolStats.length > 0) {
    const top10Pools = poolStats.slice(0, 10);
    const top10Count = top10Pools.reduce((sum, p) => sum + p.usageCount, 0);
    const totalCount = poolStats.reduce((sum, p) => sum + p.usageCount, 0);
    const concentration = (top10Count / totalCount) * 100;
    
    report += `- 总池子数: **${poolStats.length}**\n`;
    report += `- Top 10 池子占比: **${concentration.toFixed(2)}%**\n`;
    report += `- 最常用池子: \`${poolStats[0].poolAddress}\` (${poolStats[0].usageCount} 次)\n`;
  }

  report += `\n### 3. DEX 偏好
`;

  if (dexStats.length > 0) {
    report += `- 主要 DEX: **${dexStats[0].dexName}** (${dexStats[0].percentage.toFixed(2)}%)\n`;
    report += `- DEX 多样性: 使用了 **${dexStats.length}** 个不同的 DEX\n`;
  }

  report += `\n---

## 📝 建议

### 对 Rust Pool Cache 的建议

基于以上分析，建议优先监控以下池子和代币对：

1. **优先添加的桥接代币池子**:
`;

  bridgeTokenStats.slice(0, 5).forEach((stat, index) => {
    report += `   ${index + 1}. ${stat.token} 相关池子 (使用频率 ${stat.percentage.toFixed(2)}%)\n`;
  });

  report += `\n2. **优先添加的高频池子**:
`;

  poolStats.slice(0, 10).forEach((stat, index) => {
    report += `   ${index + 1}. ${stat.poolAddress} (${stat.dexName}, ${stat.usageCount} 次使用)\n`;
  });

  report += `\n3. **重点关注的 DEX**:
`;

  dexStats.slice(0, 5).forEach((stat, index) => {
    report += `   ${index + 1}. ${stat.dexName} (${stat.percentage.toFixed(2)}% 使用率)\n`;
  });

  report += `\n---

## 🔍 数据质量说明

- 数据源: PostgreSQL 数据库
- 分析表: opportunities, trades, trade_routes
- 数据时间范围: 数据库中所有历史记录
- 统计方法: 直接查询 + 聚合计算

---

**报告结束**
`;

  fs.writeFileSync('OPPORTUNITIES_ANALYSIS_REPORT.md', report, 'utf-8');
  console.log('   ✓ 生成 Markdown 报告');
}

/**
 * 导出数据到 JSON 文件
 */
async function exportData(
  summary: OpportunitySummary,
  bridgeTokenStats: BridgeTokenStat[],
  poolStats: PoolUsageStat[],
  dexStats: DexStat[]
) {
  // 导出汇总数据
  fs.writeFileSync(
    'opportunities-summary.json',
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  console.log('   ✓ 导出汇总数据 JSON');

  // 导出桥接代币统计
  fs.writeFileSync(
    'bridge-tokens-stats.json',
    JSON.stringify(bridgeTokenStats, null, 2),
    'utf-8'
  );
  console.log('   ✓ 导出桥接代币统计 JSON');

  // 导出池子使用统计
  fs.writeFileSync(
    'pool-usage-stats.json',
    JSON.stringify(poolStats, null, 2),
    'utf-8'
  );
  console.log('   ✓ 导出池子使用统计 JSON');

  // 导出 DEX 统计
  fs.writeFileSync(
    'dex-stats.json',
    JSON.stringify(dexStats, null, 2),
    'utf-8'
  );
  console.log('   ✓ 导出 DEX 统计 JSON');
}

// 主函数执行
if (require.main === module) {
  analyzeOpportunities()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export {
  analyzeOpportunities,
  getOpportunitySummary,
  analyzeBridgeTokens,
  analyzePoolUsage,
  analyzeDexDistribution,
};

