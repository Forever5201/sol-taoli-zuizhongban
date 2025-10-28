#!/usr/bin/env tsx
/**
 * 改进版池子排名系统
 * 修复置信度计算 + 多维度可区分性评分
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
  'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB': 'USD1',
  'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA': 'USDS',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk': 'BONK',
};

interface ImprovedPoolRanking {
  rank: number;
  dex: string;
  pair: string;
  tokenA: string;
  tokenB: string;
  
  // 核心指标
  usageCount: number;
  usagePercentage: number;
  
  // 盈利指标
  avgProfit: number;
  medianProfit: number;
  profitStdDev: number;
  positiveRatio: number; // 盈利交易占比
  
  // 改进的置信度评分
  sampleSizeScore: number;      // 样本量得分 (0-100)
  stabilityScore: number;        // 稳定性得分 (0-100)
  profitabilityScore: number;    // 盈利能力得分 (0-100)
  diversityScore: number;        // 多样性得分 (0-100)
  confidenceLevel: number;       // 综合置信度 (0-100)
  
  // 路径指标
  inOutboundRoute: number;
  inReturnRoute: number;
  routeBalance: number; // 去程/回程平衡度
  
  // 代币和DEX指标
  tokenImportance: number;
  dexReliability: number;
  
  // 最终评分
  finalScore: number;
  recommendationLevel: string; // 推荐等级
}

function getTokenName(mint: string): string {
  return TOKEN_MAP[mint] || (mint.length === 44 ? mint.substring(0, 4) + '...' + mint.substring(40) : mint);
}

async function improvedAnalysis() {
  console.log('🔬 开始改进版池子排名分析...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
      expectedProfit: true,
    }
  });

  console.log(`📊 分析记录数: ${opportunities.length}\n`);

  // 数据收集
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

  // 收集数据
  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    if (!metadata || !metadata.routeInfo) continue;

    const routeInfo = metadata.routeInfo;
    const outboundRoute = routeInfo.outboundRoute || [];
    const returnRoute = routeInfo.returnRoute || [];

    totalRoutes++;

    [...outboundRoute, ...returnRoute].forEach((step: any, index: number) => {
      const dex = step.dex || 'Unknown';
      const inputMint = step.inputMint;
      const outputMint = step.outputMint;

      if (!inputMint || !outputMint) return;

      const tokenA = getTokenName(inputMint);
      const tokenB = getTokenName(outputMint);
      const pair = `${tokenA} → ${tokenB}`;
      const key = `${dex}|${pair}`;

      dexUsageMap.set(dex, (dexUsageMap.get(dex) || 0) + 1);

      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        tokenImportanceMap.set(tokenA, (tokenImportanceMap.get(tokenA) || 0) + 1);
      }
      if (outputMint !== 'So11111111111111111111111111111111111111112') {
        tokenImportanceMap.set(tokenB, (tokenImportanceMap.get(tokenB) || 0) + 1);
      }

      if (!dexPairMap.has(key)) {
        dexPairMap.set(key, {
          dex, pair, tokenA, tokenB,
          usageCount: 0,
          profits: [],
          inOutbound: 0,
          inReturn: 0,
        });
      }

      const data = dexPairMap.get(key)!;
      data.usageCount++;
      data.profits.push(Number(opp.expectedProfit));
      
      if (index < outboundRoute.length) data.inOutbound++;
      else data.inReturn++;
    });
  }

  console.log('📈 数据收集完成，计算改进指标...\n');

  // 计算排名
  const rankings: ImprovedPoolRanking[] = [];
  const totalDexUsage = Array.from(dexUsageMap.values()).reduce((a, b) => a + b, 0);
  const totalTokenImportance = Array.from(tokenImportanceMap.values()).reduce((a, b) => a + b, 0);

  dexPairMap.forEach((data) => {
    const { dex, pair, tokenA, tokenB, usageCount, profits, inOutbound, inReturn } = data;

    // 盈利统计
    const profitsInSol = profits.map(p => p / 1e9).sort((a, b) => a - b);
    const avgProfit = profitsInSol.reduce((a, b) => a + b, 0) / profitsInSol.length;
    const medianProfit = profitsInSol[Math.floor(profitsInSol.length / 2)];
    const variance = profitsInSol.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profitsInSol.length;
    const profitStdDev = Math.sqrt(variance);
    const positiveCount = profitsInSol.filter(p => p > 0).length;
    const positiveRatio = positiveCount / profitsInSol.length;

    // 1. 样本量得分 (0-100)
    // 使用对数函数，避免线性增长导致所有大样本得分相同
    const sampleSizeScore = Math.min(
      100,
      30 * Math.log10(usageCount + 1) + 10 // log scale
    );

    // 2. 稳定性得分 (0-100)
    // 基于变异系数（CV = stdDev / mean）
    const cv = Math.abs(avgProfit) > 0.0001 ? profitStdDev / Math.abs(avgProfit) : 100;
    const stabilityScore = Math.max(0, Math.min(100, 100 - cv * 10));

    // 3. 盈利能力得分 (0-100)
    // 综合考虑平均利润和正盈利比例
    const avgProfitScore = Math.min(100, (avgProfit / 0.01) * 20); // 0.01 SOL = 20分
    const positiveRatioScore = positiveRatio * 100;
    const profitabilityScore = avgProfitScore * 0.6 + positiveRatioScore * 0.4;

    // 4. 多样性得分 (0-100)
    // 基于去程/回程的平衡度
    const routeTotal = inOutbound + inReturn;
    const routeBalance = routeTotal > 0 
      ? 1 - Math.abs(inOutbound - inReturn) / routeTotal 
      : 0;
    const diversityScore = routeBalance * 100;

    // 综合置信度 (加权平均)
    const confidenceLevel = 
      sampleSizeScore * 0.35 +      // 样本量 35%
      stabilityScore * 0.25 +        // 稳定性 25%
      profitabilityScore * 0.25 +    // 盈利能力 25%
      diversityScore * 0.15;         // 多样性 15%

    // 代币重要性
    const tokenAImp = (tokenImportanceMap.get(tokenA) || 0) / totalTokenImportance * 100;
    const tokenBImp = (tokenImportanceMap.get(tokenB) || 0) / totalTokenImportance * 100;
    const tokenImportance = (tokenAImp + tokenBImp) / 2;

    // DEX可靠性
    const dexReliability = ((dexUsageMap.get(dex) || 0) / totalDexUsage) * 100;

    // 使用率
    const usagePercentage = (usageCount / totalRoutes) * 100;

    // 最终评分（综合考虑所有因素）
    const finalScore = 
      usagePercentage * 0.30 +      // 使用频率 30%
      confidenceLevel * 0.25 +      // 置信度 25%
      tokenImportance * 0.20 +      // 代币重要性 20%
      dexReliability * 0.15 +       // DEX可靠性 15%
      profitabilityScore * 0.10;    // 盈利能力 10%

    // 推荐等级
    let recommendationLevel = 'E';
    if (confidenceLevel >= 85 && finalScore >= 80) recommendationLevel = 'S+';
    else if (confidenceLevel >= 75 && finalScore >= 70) recommendationLevel = 'S';
    else if (confidenceLevel >= 65 && finalScore >= 60) recommendationLevel = 'A+';
    else if (confidenceLevel >= 55 && finalScore >= 50) recommendationLevel = 'A';
    else if (confidenceLevel >= 45 && finalScore >= 40) recommendationLevel = 'B';
    else if (confidenceLevel >= 35) recommendationLevel = 'C';
    else recommendationLevel = 'D';

    rankings.push({
      rank: 0,
      dex,
      pair,
      tokenA,
      tokenB,
      usageCount,
      usagePercentage,
      avgProfit,
      medianProfit,
      profitStdDev,
      positiveRatio,
      sampleSizeScore,
      stabilityScore,
      profitabilityScore,
      diversityScore,
      confidenceLevel,
      inOutboundRoute: inOutbound,
      inReturnRoute: inReturn,
      routeBalance,
      tokenImportance,
      dexReliability,
      finalScore,
      recommendationLevel,
    });
  });

  // 排序
  rankings.sort((a, b) => {
    // 首先按置信度排序，再按最终得分
    if (Math.abs(b.confidenceLevel - a.confidenceLevel) > 5) {
      return b.confidenceLevel - a.confidenceLevel;
    }
    return b.finalScore - a.finalScore;
  });

  rankings.forEach((r, i) => r.rank = i + 1);

  await generateImprovedReport(rankings, totalRoutes);
  await prisma.$disconnect();
}

async function generateImprovedReport(rankings: ImprovedPoolRanking[], totalRoutes: number) {
  console.log('📝 生成改进版分析报告...\n');

  let report = `# 🎯 改进版池子排名分析报告

**生成时间**: ${new Date().toLocaleString('zh-CN')}  
**分析方法**: 多维度可区分性评分 + 改进的置信度计算  
**总路由数**: ${totalRoutes.toLocaleString()}  
**候选池子数**: ${rankings.length}

---

## 🔧 改进说明

### 修复的问题

1. **置信度计算bug修复**
   - 旧版：样本量>1000都是60%（无区分度）
   - 新版：使用对数函数，充分区分不同样本量

2. **新增多维度置信度**
   - 样本量得分（35%）
   - 稳定性得分（25%）
   - 盈利能力得分（25%）
   - 多样性得分（15%）

3. **推荐等级系统**
   - S+: 最高置信度（85+）+ 最高得分（80+）
   - S: 高置信度（75+）+ 高得分（70+）
   - A+/A: 中高置信度和得分
   - B/C/D: 较低置信度

---

## 🏆 Top 30 推荐池子（按置信度+得分排序）

| 排名 | 推荐等级 | DEX | 交易对 | 使用次数 | 置信度 | 最终得分 | 平均利润 |
|------|---------|-----|--------|---------|--------|---------|----------|
`;

  rankings.slice(0, 30).forEach(r => {
    report += `| ${r.rank} | **${r.recommendationLevel}** | ${r.dex} | ${r.pair} | ${r.usageCount.toLocaleString()} | **${r.confidenceLevel.toFixed(1)}%** | ${r.finalScore.toFixed(1)} | ${r.avgProfit.toFixed(4)} SOL |\n`;
  });

  report += `\n---

## 📊 详细分析（Top 15）

`;

  rankings.slice(0, 15).forEach(r => {
    report += `
### ${r.rank}. ${r.dex} - ${r.pair}

**推荐等级**: ${r.recommendationLevel} | **置信度**: ${r.confidenceLevel.toFixed(1)}% | **最终得分**: ${r.finalScore.toFixed(1)}

#### 置信度构成分析
- 📊 **样本量得分**: ${r.sampleSizeScore.toFixed(1)}/100 (使用${r.usageCount.toLocaleString()}次)
- 📈 **稳定性得分**: ${r.stabilityScore.toFixed(1)}/100 (标准差${r.profitStdDev.toFixed(4)})
- 💰 **盈利能力得分**: ${r.profitabilityScore.toFixed(1)}/100 (正盈利率${(r.positiveRatio * 100).toFixed(1)}%)
- 🔄 **多样性得分**: ${r.diversityScore.toFixed(1)}/100 (路径平衡度${r.routeBalance.toFixed(2)})

#### 核心指标
- 使用次数: ${r.usageCount.toLocaleString()} (${r.usagePercentage.toFixed(2)}%)
- 平均利润: ${r.avgProfit.toFixed(4)} SOL
- 中位数利润: ${r.medianProfit.toFixed(4)} SOL
- 去程/回程: ${r.inOutboundRoute}/${r.inReturnRoute}

#### 综合评估
- 代币重要性: ${r.tokenImportance.toFixed(1)}/100
- DEX可靠性: ${r.dexReliability.toFixed(1)}/100

---
`;
  });

  // 按推荐等级分组
  const sPlusCount = rankings.filter(r => r.recommendationLevel === 'S+').length;
  const sCount = rankings.filter(r => r.recommendationLevel === 'S').length;
  const aPlusCount = rankings.filter(r => r.recommendationLevel === 'A+').length;
  const aCount = rankings.filter(r => r.recommendationLevel === 'A').length;

  report += `
## 🎯 推荐等级分布

| 等级 | 数量 | 置信度范围 | 得分范围 | 说明 |
|------|------|-----------|---------|------|
| **S+** | ${sPlusCount} | 85%+ | 80+ | 最高优先级，强烈推荐 |
| **S** | ${sCount} | 75%+ | 70+ | 高优先级，推荐 |
| **A+** | ${aPlusCount} | 65%+ | 60+ | 中高优先级，建议考虑 |
| **A** | ${aCount} | 55%+ | 50+ | 中等优先级 |
| **B** | ${rankings.filter(r => r.recommendationLevel === 'B').length} | 45%+ | 40+ | 可选补充 |
| **C/D** | ${rankings.filter(r => ['C', 'D', 'E'].includes(r.recommendationLevel)).length} | <45% | <40 | 不推荐 |

---

## 💡 如何选择池子

### 方案1：保守型（S+级别）

**选择标准**: 只选择置信度≥85%且得分≥80的池子

**推荐池子**:
${rankings.filter(r => r.recommendationLevel === 'S+').slice(0, 10).map(r => 
  `- ${r.dex} - ${r.pair} (置信度${r.confidenceLevel.toFixed(1)}%, 得分${r.finalScore.toFixed(1)})`
).join('\n')}

**优点**: 最高可靠性，风险最低  
**缺点**: 覆盖率可能不足

---

### 方案2：平衡型（S+和S级别）⭐ 推荐

**选择标准**: 置信度≥75%且得分≥70

**推荐池子**:
${rankings.filter(r => ['S+', 'S'].includes(r.recommendationLevel)).slice(0, 15).map(r => 
  `- ${r.dex} - ${r.pair} (置信度${r.confidenceLevel.toFixed(1)}%, 得分${r.finalScore.toFixed(1)})`
).join('\n')}

**优点**: 平衡可靠性和覆盖率  
**缺点**: 需要监控较多池子

---

### 方案3：激进型（S+、S、A+级别）

**选择标准**: 置信度≥65%且得分≥60

**池子数**: ${rankings.filter(r => ['S+', 'S', 'A+'].includes(r.recommendationLevel)).length}个

**优点**: 最大化覆盖率  
**缺点**: 包含部分中等可靠性池子

---

## 📈 置信度vs得分散点分析

`;

  // 统计各象限的池子
  const highConfHighScore = rankings.filter(r => r.confidenceLevel >= 70 && r.finalScore >= 60).length;
  const highConfLowScore = rankings.filter(r => r.confidenceLevel >= 70 && r.finalScore < 60).length;
  const lowConfHighScore = rankings.filter(r => r.confidenceLevel < 70 && r.finalScore >= 60).length;
  const lowConfLowScore = rankings.filter(r => r.confidenceLevel < 70 && r.finalScore < 60).length;

  report += `
| 象限 | 置信度 | 得分 | 数量 | 建议 |
|------|-------|------|------|------|
| **象限I（理想）** | ≥70% | ≥60 | ${highConfHighScore} | **优先选择** |
| **象限II（可靠但低频）** | ≥70% | <60 | ${highConfLowScore} | 备用选择 |
| **象限III（高频但不稳）** | <70% | ≥60 | ${lowConfHighScore} | 谨慎评估 |
| **象限IV（不推荐）** | <70% | <60 | ${lowConfLowScore} | 不推荐 |

**选择建议**: 优先从象限I选择，覆盖率不足时考虑象限II

---

## 🎯 最终推荐

基于改进的置信度计算，**我的具体建议**：

### 推荐配置：S+和S级池子（Top ${sPlusCount + sCount}）

`;

  const recommended = rankings.filter(r => ['S+', 'S'].includes(r.recommendationLevel));
  recommended.forEach((r, i) => {
    report += `${i + 1}. **${r.dex}** - ${r.pair}\n`;
    report += `   - 置信度: **${r.confidenceLevel.toFixed(1)}%**\n`;
    report += `   - 得分: ${r.finalScore.toFixed(1)}\n`;
    report += `   - 推荐等级: ${r.recommendationLevel}\n\n`;
  });

  const totalCoverage = recommended.reduce((sum, r) => sum + r.usagePercentage, 0);
  
  report += `
**预期覆盖率**: ${totalCoverage.toFixed(1)}% (注意：会有重复计数)  
**推荐理由**: 这些池子在置信度和综合得分上都表现优秀，平衡了可靠性和覆盖率

---

## 📎 附录：数据导出

详细数据已导出到JSON文件。

---

**报告结束**
`;

  fs.writeFileSync('IMPROVED_POOL_RANKING_REPORT.md', report, 'utf-8');
  console.log('✅ 改进版报告已生成: IMPROVED_POOL_RANKING_REPORT.md\n');

  // 导出JSON
  const exportData = {
    generatedAt: new Date().toISOString(),
    totalRoutes,
    rankings: rankings.slice(0, 50),
    byLevel: {
      sPlus: rankings.filter(r => r.recommendationLevel === 'S+'),
      s: rankings.filter(r => r.recommendationLevel === 'S'),
      aPlus: rankings.filter(r => r.recommendationLevel === 'A+'),
      a: rankings.filter(r => r.recommendationLevel === 'A'),
    }
  };

  fs.writeFileSync('improved-ranking-data.json', JSON.stringify(exportData, null, 2), 'utf-8');
  console.log('✅ 详细数据已导出: improved-ranking-data.json\n');
}

if (require.main === module) {
  improvedAnalysis()
    .then(() => {
      console.log('\n✅ 改进版分析完成！\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

