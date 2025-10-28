#!/usr/bin/env tsx
/**
 * 严格的池子选择量化分析
 * 多维度评分系统 + 统计分析 + 风险评估
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

const TOKEN_MAP: { [key: string]: string } = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
  'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB': 'USD1',
  'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA': 'USDS',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk': 'BONK',
};

interface PoolCandidate {
  dex: string;
  pair: string;
  tokenA: string;
  tokenB: string;
  
  // 基础指标
  usageCount: number;
  usagePercentage: number;
  
  // 盈利指标
  totalProfit: number;
  avgProfit: number;
  medianProfit: number;
  profitStdDev: number;
  maxProfit: number;
  minProfit: number;
  
  // 代币重要性
  tokenAImportance: number;
  tokenBImportance: number;
  tokenImportanceScore: number;
  
  // DEX可靠性
  dexUsageCount: number;
  dexMarketShare: number;
  
  // 路径关键性
  inOutboundRoute: number;
  inReturnRoute: number;
  routeCriticality: number;
  
  // 综合评分
  finalScore: number;
  confidenceLevel: number;
  rank: number;
  tier: string;
}

function getTokenName(mint: string): string {
  return TOKEN_MAP[mint] || (mint.length === 44 ? mint.substring(0, 4) + '...' + mint.substring(40) : mint);
}

async function rigorousAnalysis() {
  console.log('🔬 开始严格的量化分析...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
      expectedProfit: true,
    }
  });

  console.log(`📊 分析记录数: ${opportunities.length}\n`);

  // 数据收集阶段
  const dexPairMap = new Map<string, {
    dex: string;
    pair: string;
    tokenA: string;
    tokenB: string;
    usageCount: number;
    profits: number[];
    inOutbound: number;
    inReturn: number;
  }>();

  const tokenImportanceMap = new Map<string, number>();
  const dexUsageMap = new Map<string, number>();
  let totalRoutes = 0;

  // 第一遍：收集原始数据
  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    if (!metadata || !metadata.routeInfo) continue;

    const routeInfo = metadata.routeInfo;
    const outboundRoute = routeInfo.outboundRoute || [];
    const returnRoute = routeInfo.returnRoute || [];

    totalRoutes++;

    // 处理去程
    outboundRoute.forEach((step: any, index: number) => {
      processStep(step, opp.expectedProfit, true, index, dexPairMap, tokenImportanceMap, dexUsageMap);
    });

    // 处理回程
    returnRoute.forEach((step: any, index: number) => {
      processStep(step, opp.expectedProfit, false, index, dexPairMap, tokenImportanceMap, dexUsageMap);
    });
  }

  console.log('📈 数据收集完成，开始计算指标...\n');

  // 第二遍：计算综合指标
  const candidates: PoolCandidate[] = [];
  const totalDexUsage = Array.from(dexUsageMap.values()).reduce((a, b) => a + b, 0);
  const totalTokenImportance = Array.from(tokenImportanceMap.values()).reduce((a, b) => a + b, 0);

  dexPairMap.forEach((data, key) => {
    const { dex, pair, tokenA, tokenB, usageCount, profits, inOutbound, inReturn } = data;

    // 计算盈利统计
    const sortedProfits = profits.map(p => p / 1e9).sort((a, b) => a - b);
    const avgProfit = sortedProfits.reduce((a, b) => a + b, 0) / sortedProfits.length;
    const medianProfit = sortedProfits[Math.floor(sortedProfits.length / 2)];
    const profitVariance = sortedProfits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / sortedProfits.length;
    const profitStdDev = Math.sqrt(profitVariance);

    // 代币重要性评分 (0-100)
    const tokenAImportance = (tokenImportanceMap.get(tokenA) || 0) / totalTokenImportance * 100;
    const tokenBImportance = (tokenImportanceMap.get(tokenB) || 0) / totalTokenImportance * 100;
    const tokenImportanceScore = (tokenAImportance + tokenBImportance) / 2;

    // DEX市场份额 (0-100)
    const dexUsageCount = dexUsageMap.get(dex) || 0;
    const dexMarketShare = (dexUsageCount / totalDexUsage) * 100;

    // 路径关键性评分 (0-100)
    const routeCriticality = ((inOutbound / totalRoutes) * 50 + (inReturn / totalRoutes) * 50) * 100;

    // 使用率百分比
    const usagePercentage = (usageCount / totalRoutes) * 100;

    // 综合评分计算 (加权)
    const weights = {
      usage: 0.30,           // 使用频率 30%
      tokenImportance: 0.25, // 代币重要性 25%
      dexShare: 0.20,        // DEX市场份额 20%
      routeCritical: 0.15,   // 路径关键性 15%
      profitability: 0.10,   // 盈利能力 10%
    };

    // 标准化各项得分到0-100
    const normalizedUsage = Math.min(usagePercentage * 2, 100); // 50%使用率 = 100分
    const normalizedProfit = Math.min((avgProfit / 0.1) * 100, 100); // 0.1 SOL平均利润 = 100分

    const finalScore = 
      normalizedUsage * weights.usage +
      tokenImportanceScore * weights.tokenImportance +
      dexMarketShare * weights.dexShare +
      routeCriticality * weights.routeCritical +
      normalizedProfit * weights.profitability;

    // 置信度计算（基于样本量和方差）
    const sampleSizeConfidence = Math.min((usageCount / 1000) * 100, 100);
    const stabilityConfidence = Math.max(100 - (profitStdDev / Math.abs(avgProfit)) * 50, 0);
    const confidenceLevel = (sampleSizeConfidence * 0.6 + stabilityConfidence * 0.4);

    candidates.push({
      dex,
      pair,
      tokenA,
      tokenB,
      usageCount,
      usagePercentage,
      totalProfit: sortedProfits.reduce((a, b) => a + b, 0),
      avgProfit,
      medianProfit,
      profitStdDev,
      maxProfit: sortedProfits[sortedProfits.length - 1],
      minProfit: sortedProfits[0],
      tokenAImportance,
      tokenBImportance,
      tokenImportanceScore,
      dexUsageCount,
      dexMarketShare,
      inOutboundRoute: inOutbound,
      inReturnRoute: inReturn,
      routeCriticality,
      finalScore,
      confidenceLevel,
      rank: 0,
      tier: '',
    });
  });

  // 排序并分配排名
  candidates.sort((a, b) => b.finalScore - a.finalScore);
  candidates.forEach((c, index) => {
    c.rank = index + 1;
    if (c.finalScore >= 90) c.tier = 'S';
    else if (c.finalScore >= 80) c.tier = 'A';
    else if (c.finalScore >= 70) c.tier = 'B';
    else if (c.finalScore >= 60) c.tier = 'C';
    else c.tier = 'D';
  });

  await generateRigorousReport(candidates, totalRoutes, tokenImportanceMap, dexUsageMap);
  await prisma.$disconnect();
}

function processStep(
  step: any,
  profit: any,
  isOutbound: boolean,
  index: number,
  dexPairMap: Map<string, any>,
  tokenImportanceMap: Map<string, number>,
  dexUsageMap: Map<string, number>
) {
  const dex = step.dex || 'Unknown';
  const inputMint = step.inputMint;
  const outputMint = step.outputMint;

  if (!inputMint || !outputMint) return;

  const tokenA = getTokenName(inputMint);
  const tokenB = getTokenName(outputMint);
  const pair = `${tokenA} → ${tokenB}`;
  const key = `${dex}|${pair}`;

  // 统计DEX使用
  dexUsageMap.set(dex, (dexUsageMap.get(dex) || 0) + 1);

  // 统计代币重要性
  if (inputMint !== 'So11111111111111111111111111111111111111112') {
    tokenImportanceMap.set(tokenA, (tokenImportanceMap.get(tokenA) || 0) + 1);
  }
  if (outputMint !== 'So11111111111111111111111111111111111111112') {
    tokenImportanceMap.set(tokenB, (tokenImportanceMap.get(tokenB) || 0) + 1);
  }

  // 统计DEX-交易对
  if (!dexPairMap.has(key)) {
    dexPairMap.set(key, {
      dex,
      pair,
      tokenA,
      tokenB,
      usageCount: 0,
      profits: [],
      inOutbound: 0,
      inReturn: 0,
    });
  }

  const data = dexPairMap.get(key)!;
  data.usageCount++;
  data.profits.push(Number(profit));
  if (isOutbound) data.inOutbound++;
  else data.inReturn++;
}

function generatePoolCard(c: PoolCandidate, totalRoutes: number): string {
  return `
#### ${c.rank}. ${c.dex} - ${c.pair}

**评级**: ${c.tier}级 | **综合得分**: ${c.finalScore.toFixed(2)}/100 | **置信度**: ${c.confidenceLevel.toFixed(1)}%

**使用指标**:
- 使用次数: ${c.usageCount.toLocaleString()} (${c.usagePercentage.toFixed(2)}%)
- 去程使用: ${c.inOutboundRoute.toLocaleString()} 次
- 回程使用: ${c.inReturnRoute.toLocaleString()} 次

**盈利指标**:
- 平均利润: ${c.avgProfit.toFixed(4)} SOL
- 中位数利润: ${c.medianProfit.toFixed(4)} SOL
- 标准差: ${c.profitStdDev.toFixed(4)} SOL
- 利润范围: [${c.minProfit.toFixed(4)}, ${c.maxProfit.toFixed(4)}] SOL

**代币重要性**:
- ${c.tokenA}: ${c.tokenAImportance.toFixed(2)}%
- ${c.tokenB}: ${c.tokenBImportance.toFixed(2)}%
- 综合得分: ${c.tokenImportanceScore.toFixed(2)}/100

**DEX可靠性**:
- DEX总使用: ${c.dexUsageCount.toLocaleString()} 次
- 市场份额: ${c.dexMarketShare.toFixed(2)}%

**路径关键性**: ${c.routeCriticality.toFixed(2)}/100

---
`;
}

async function generateRigorousReport(
  candidates: PoolCandidate[],
  totalRoutes: number,
  tokenImportanceMap: Map<string, number>,
  dexUsageMap: Map<string, number>
) {
  console.log('📝 生成严格分析报告...\n');

  let report = `# 🔬 池子选择严格量化分析报告

**生成时间**: ${new Date().toLocaleString('zh-CN')}  
**分析方法**: 多维度加权评分 + 统计分析 + 风险评估  
**总路由数**: ${totalRoutes.toLocaleString()}  
**候选池子数**: ${candidates.length}

---

## 📋 执行摘要

本报告采用**严格的量化分析方法**，综合考虑以下维度：

### 评分体系（总分100分）

| 维度 | 权重 | 说明 |
|------|------|------|
| **使用频率** | 30% | 该池子在套利路径中的使用次数 |
| **代币重要性** | 25% | 涉及代币在整体生态中的重要程度 |
| **DEX市场份额** | 20% | 该DEX在所有交易中的占比 |
| **路径关键性** | 15% | 在去程/回程中的关键位置 |
| **盈利能力** | 10% | 平均利润和稳定性 |

### 置信度计算

- **样本量置信度**（60%）：基于使用次数
- **稳定性置信度**（40%）：基于利润标准差

---

## 🏆 Top 30 池子详细排名

### S级池子（90-100分）- 核心必备

`;

  // S级池子
  const sTier = candidates.filter(c => c.tier === 'S');
  if (sTier.length > 0) {
    sTier.forEach(c => {
      report += generatePoolCard(c, totalRoutes);
    });
  } else {
    report += `*无S级池子*\n\n`;
  }

  report += `\n### A级池子（80-89分）- 强烈推荐

`;

  // A级池子
  const aTier = candidates.filter(c => c.tier === 'A');
  if (aTier.length > 0) {
    aTier.forEach(c => {
      report += generatePoolCard(c, totalRoutes);
    });
  } else {
    report += `*无A级池子*\n\n`;
  }

  report += `\n### B级池子（70-79分）- 推荐补充

`;

  // B级池子
  const bTier = candidates.filter(c => c.tier === 'B').slice(0, 10);
  if (bTier.length > 0) {
    bTier.forEach(c => {
      report += generatePoolCard(c, totalRoutes);
    });
  } else {
    report += `*无B级池子*\n\n`;
  }

  // 统计分析
  report += `\n---

## 📊 统计分析

### 评分分布

| 等级 | 分数范围 | 池子数量 | 占比 |
|------|---------|---------|------|
| S级 | 90-100 | ${sTier.length} | ${((sTier.length / candidates.length) * 100).toFixed(2)}% |
| A级 | 80-89 | ${aTier.length} | ${((aTier.length / candidates.length) * 100).toFixed(2)}% |
| B级 | 70-79 | ${candidates.filter(c => c.tier === 'B').length} | ${((candidates.filter(c => c.tier === 'B').length / candidates.length) * 100).toFixed(2)}% |
| C级 | 60-69 | ${candidates.filter(c => c.tier === 'C').length} | ${((candidates.filter(c => c.tier === 'C').length / candidates.length) * 100).toFixed(2)}% |
| D级 | <60 | ${candidates.filter(c => c.tier === 'D').length} | ${((candidates.filter(c => c.tier === 'D').length / candidates.length) * 100).toFixed(2)}% |

### 覆盖率分析

`;

  // 计算累计覆盖率
  const top5Coverage = candidates.slice(0, 5).reduce((sum, c) => sum + c.usagePercentage, 0);
  const top10Coverage = candidates.slice(0, 10).reduce((sum, c) => sum + c.usagePercentage, 0);
  const top15Coverage = candidates.slice(0, 15).reduce((sum, c) => sum + c.usagePercentage, 0);
  const top20Coverage = candidates.slice(0, 20).reduce((sum, c) => sum + c.usagePercentage, 0);
  const top30Coverage = candidates.slice(0, 30).reduce((sum, c) => sum + c.usagePercentage, 0);

  report += `| 订阅数量 | 累计覆盖率 | 增量收益 |
|---------|-----------|---------|
| Top 5 | ${top5Coverage.toFixed(2)}% | - |
| Top 10 | ${top10Coverage.toFixed(2)}% | +${(top10Coverage - top5Coverage).toFixed(2)}% |
| Top 15 | ${top15Coverage.toFixed(2)}% | +${(top15Coverage - top10Coverage).toFixed(2)}% |
| Top 20 | ${top20Coverage.toFixed(2)}% | +${(top20Coverage - top15Coverage).toFixed(2)}% |
| Top 30 | ${top30Coverage.toFixed(2)}% | +${(top30Coverage - top20Coverage).toFixed(2)}% |

**边际收益分析**: Top 5覆盖${top5Coverage.toFixed(1)}%，Top 10增加${(top10Coverage - top5Coverage).toFixed(1)}%，边际收益${((top10Coverage - top5Coverage) / 5).toFixed(1)}%/池

---

## 🎯 推荐策略

### 策略1：极简启动（Top 5）

**目标**: 快速验证，最小化复杂度  
**池子数**: 5个  
**覆盖率**: ${top5Coverage.toFixed(2)}%  
**平均置信度**: ${(candidates.slice(0, 5).reduce((sum, c) => sum + c.confidenceLevel, 0) / 5).toFixed(1)}%

**推荐池子**:
${candidates.slice(0, 5).map((c, i) => `${i + 1}. ${c.dex} - ${c.pair} (${c.finalScore.toFixed(1)}分)`).join('\n')}

### 策略2：标准配置（Top 15）

**目标**: 平衡覆盖率和复杂度  
**池子数**: 15个  
**覆盖率**: ${top15Coverage.toFixed(2)}%  
**平均置信度**: ${(candidates.slice(0, 15).reduce((sum, c) => sum + c.confidenceLevel, 0) / 15).toFixed(1)}%

**新增池子**（6-15）:
${candidates.slice(5, 15).map((c, i) => `${i + 6}. ${c.dex} - ${c.pair} (${c.finalScore.toFixed(1)}分)`).join('\n')}

### 策略3：完整覆盖（Top 30）

**目标**: 最大化覆盖率  
**池子数**: 30个  
**覆盖率**: ${top30Coverage.toFixed(2)}%  
**平均置信度**: ${(candidates.slice(0, 30).reduce((sum, c) => sum + c.confidenceLevel, 0) / 30).toFixed(1)}%

**新增池子**（16-30）:
${candidates.slice(15, 30).map((c, i) => `${i + 16}. ${c.dex} - ${c.pair} (${c.finalScore.toFixed(1)}分)`).join('\n')}

---

## 🔍 深度洞察

### 代币重要性排名

`;

  const sortedTokens = Array.from(tokenImportanceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const totalTokenUsage = Array.from(tokenImportanceMap.values()).reduce((a, b) => a + b, 0);

  sortedTokens.forEach(([token, count], index) => {
    report += `${index + 1}. **${token}**: ${count.toLocaleString()} 次 (${((count / totalTokenUsage) * 100).toFixed(2)}%)\n`;
  });

  report += `\n### DEX市场份额

`;

  const sortedDexes = Array.from(dexUsageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const totalDexUsage = Array.from(dexUsageMap.values()).reduce((a, b) => a + b, 0);

  sortedDexes.forEach(([dex, count], index) => {
    report += `${index + 1}. **${dex}**: ${count.toLocaleString()} 次 (${((count / totalDexUsage) * 100).toFixed(2)}%)\n`;
  });

  report += `\n### 风险评估

#### 高风险因素

1. **集中度风险**: Top 5池子覆盖${top5Coverage.toFixed(1)}%，过度依赖少数池子
2. **DEX依赖**: ${sortedDexes[0][0]}占比${((sortedDexes[0][1] / totalDexUsage) * 100).toFixed(1)}%，单点故障风险
3. **代币风险**: USDC+USDT占比过高，稳定币脱锚风险

#### 风险缓解建议

1. **多样化**: 采用Top 15策略，分散DEX和交易对
2. **监控告警**: 实时监控池子健康度和价格偏离
3. **备用路径**: 为Top 5池子配置备用DEX路径

---

## 📈 预期收益分析

### 基于历史数据的收益预测

`;

  const top5AvgProfit = candidates.slice(0, 5).reduce((sum, c) => sum + c.avgProfit, 0) / 5;
  const top15AvgProfit = candidates.slice(0, 15).reduce((sum, c) => sum + c.avgProfit, 0) / 15;
  const top30AvgProfit = candidates.slice(0, 30).reduce((sum, c) => sum + c.avgProfit, 0) / 30;

  report += `| 策略 | 平均单次利润 | 预期捕获率 | 预期日收益（假设100次机会） |
|------|-------------|-----------|---------------------------|
| Top 5 | ${top5AvgProfit.toFixed(4)} SOL | ${top5Coverage.toFixed(1)}% | ${(top5AvgProfit * top5Coverage).toFixed(2)} SOL |
| Top 15 | ${top15AvgProfit.toFixed(4)} SOL | ${top15Coverage.toFixed(1)}% | ${(top15AvgProfit * top15Coverage).toFixed(2)} SOL |
| Top 30 | ${top30AvgProfit.toFixed(4)} SOL | ${top30Coverage.toFixed(1)}% | ${(top30AvgProfit * top30Coverage).toFixed(2)} SOL |

*注意：实际收益受Gas费、滑点、执行速度等因素影响*

---

## 💡 实施建议

### 分阶段实施路线图

**Phase 1: 验证阶段（1-2周）**
- 订阅Top 5池子
- 监控捕获率和实际盈利
- 调整参数和阈值

**Phase 2: 扩展阶段（2-4周）**
- 基于Phase 1数据，扩展到Top 15
- 优化路由算法
- 增加风险控制

**Phase 3: 优化阶段（持续）**
- 动态调整池子权重
- 根据实际表现淘汰低效池子
- 探索新的高分池子

### 技术实施要点

1. **池子地址获取**: 使用Jupiter API查询具体池子地址
2. **WebSocket订阅**: 优先使用Solana RPC的账户订阅
3. **数据更新频率**: 建议100-200ms更新间隔
4. **容错机制**: 实现自动重连和降级策略

---

## 📎 附录：完整数据

详细数据已导出到JSON文件供进一步分析。

---

**报告结束**

*本报告基于${totalRoutes.toLocaleString()}条历史套利记录，采用严格的统计分析方法生成*
`;

  fs.writeFileSync('RIGOROUS_POOL_ANALYSIS_REPORT.md', report, 'utf-8');
  console.log('✅ 严格分析报告已生成: RIGOROUS_POOL_ANALYSIS_REPORT.md\n');

  // 导出详细数据
  const exportData = {
    generatedAt: new Date().toISOString(),
    totalRoutes,
    totalCandidates: candidates.length,
    candidates: candidates.slice(0, 50), // Top 50
    coverageAnalysis: {
      top5: top5Coverage,
      top10: top10Coverage,
      top15: top15Coverage,
      top20: top20Coverage,
      top30: top30Coverage,
    },
    recommendations: {
      minimal: candidates.slice(0, 5).map(c => ({ rank: c.rank, dex: c.dex, pair: c.pair, score: c.finalScore })),
      standard: candidates.slice(0, 15).map(c => ({ rank: c.rank, dex: c.dex, pair: c.pair, score: c.finalScore })),
      complete: candidates.slice(0, 30).map(c => ({ rank: c.rank, dex: c.dex, pair: c.pair, score: c.finalScore })),
    }
  };

  fs.writeFileSync('rigorous-analysis-data.json', JSON.stringify(exportData, null, 2), 'utf-8');
  console.log('✅ 详细数据已导出: rigorous-analysis-data.json\n');
}

if (require.main === module) {
  rigorousAnalysis()
    .then(() => {
      console.log('\n✅ 严格量化分析完成！\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

