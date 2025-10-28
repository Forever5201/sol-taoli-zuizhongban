#!/usr/bin/env tsx
/**
 * 实用排名系统
 * 核心逻辑：DEX使用率 × 代币重要性
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

interface PracticalRanking {
  rank: number;
  dex: string;
  pair: string;
  tokenA: string;
  tokenB: string;
  
  // 核心指标
  usageCount: number;
  usagePercentage: number;
  
  // DEX指标
  dexUsageCount: number;
  dexUsageRate: number;
  dexRank: number;
  
  // 代币指标
  tokenAUsage: number;
  tokenBUsage: number;
  tokenImportanceScore: number;
  
  // 综合评分（简单直接）
  finalScore: number;
  recommendation: string;
}

function getTokenName(mint: string): string {
  return TOKEN_MAP[mint] || (mint.length === 44 ? mint.substring(0, 4) + '...' + mint.substring(40) : mint);
}

async function practicalRanking() {
  console.log('🎯 实用排名分析（DEX使用率 × 代币重要性）...\n');

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
  }>();

  const tokenUsageMap = new Map<string, number>();
  const dexUsageMap = new Map<string, number>();
  let totalSteps = 0;

  // 收集数据
  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    if (!metadata || !metadata.routeInfo) continue;

    const routeInfo = metadata.routeInfo;
    const allRoutes = [
      ...(routeInfo.outboundRoute || []),
      ...(routeInfo.returnRoute || [])
    ];

    allRoutes.forEach((step: any) => {
      const dex = step.dex || 'Unknown';
      const inputMint = step.inputMint;
      const outputMint = step.outputMint;

      if (!inputMint || !outputMint) return;

      totalSteps++;

      const tokenA = getTokenName(inputMint);
      const tokenB = getTokenName(outputMint);
      const pair = `${tokenA} → ${tokenB}`;
      const key = `${dex}|${pair}`;

      // 统计DEX使用
      dexUsageMap.set(dex, (dexUsageMap.get(dex) || 0) + 1);

      // 统计代币使用（排除SOL）
      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        tokenUsageMap.set(tokenA, (tokenUsageMap.get(tokenA) || 0) + 1);
      }
      if (outputMint !== 'So11111111111111111111111111111111111111112') {
        tokenUsageMap.set(tokenB, (tokenUsageMap.get(tokenB) || 0) + 1);
      }

      // 统计DEX-交易对
      if (!dexPairMap.has(key)) {
        dexPairMap.set(key, {
          dex, pair, tokenA, tokenB,
          usageCount: 0,
          profits: [],
        });
      }

      const data = dexPairMap.get(key)!;
      data.usageCount++;
      data.profits.push(Number(opp.expectedProfit) / 1e9);
    });
  }

  console.log('📈 数据收集完成，计算排名...\n');

  // DEX排名
  const sortedDexes = Array.from(dexUsageMap.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const dexRankMap = new Map<string, number>();
  sortedDexes.forEach(([dex], index) => {
    dexRankMap.set(dex, index + 1);
  });

  // 计算排名
  const rankings: PracticalRanking[] = [];

  dexPairMap.forEach((data) => {
    const { dex, pair, tokenA, tokenB, usageCount, profits } = data;

    // DEX指标
    const dexUsageCount = dexUsageMap.get(dex) || 0;
    const dexUsageRate = (dexUsageCount / totalSteps) * 100;
    const dexRank = dexRankMap.get(dex) || 999;

    // 代币重要性（排除SOL）
    const tokenAUsage = tokenUsageMap.get(tokenA) || 0;
    const tokenBUsage = tokenUsageMap.get(tokenB) || 0;
    
    // 代币重要性得分（0-100）
    const totalTokenUsage = Array.from(tokenUsageMap.values()).reduce((a, b) => a + b, 0);
    const tokenImportanceScore = ((tokenAUsage + tokenBUsage) / totalTokenUsage) * 100;

    // 使用率
    const usagePercentage = (usageCount / opportunities.length) * 100;

    // 综合评分（简单直接）
    // DEX使用率 × 代币重要性
    const finalScore = dexUsageRate * 0.5 + tokenImportanceScore * 0.5;

    // 推荐等级
    let recommendation = '';
    if (dexRank <= 3 && tokenImportanceScore >= 30) {
      recommendation = 'S+ 核心必备';
    } else if (dexRank <= 5 && tokenImportanceScore >= 20) {
      recommendation = 'S 强烈推荐';
    } else if (dexRank <= 10 && tokenImportanceScore >= 10) {
      recommendation = 'A 推荐';
    } else if (dexRank <= 15) {
      recommendation = 'B 可选';
    } else {
      recommendation = 'C 备用';
    }

    rankings.push({
      rank: 0,
      dex,
      pair,
      tokenA,
      tokenB,
      usageCount,
      usagePercentage,
      dexUsageCount,
      dexUsageRate,
      dexRank,
      tokenAUsage,
      tokenBUsage,
      tokenImportanceScore,
      finalScore,
      recommendation,
    });
  });

  // 排序：先按DEX排名，再按代币重要性
  rankings.sort((a, b) => {
    // 首先按DEX排名
    if (a.dexRank !== b.dexRank) {
      return a.dexRank - b.dexRank;
    }
    // 然后按代币重要性
    if (Math.abs(b.tokenImportanceScore - a.tokenImportanceScore) > 5) {
      return b.tokenImportanceScore - a.tokenImportanceScore;
    }
    // 最后按使用次数
    return b.usageCount - a.usageCount;
  });

  rankings.forEach((r, i) => r.rank = i + 1);

  await generatePracticalReport(rankings, sortedDexes, tokenUsageMap, totalSteps, opportunities.length);
  await prisma.$disconnect();
}

async function generatePracticalReport(
  rankings: PracticalRanking[],
  sortedDexes: [string, number][],
  tokenUsageMap: Map<string, number>,
  totalSteps: number,
  totalRoutes: number
) {
  console.log('📝 生成实用排名报告...\n');

  let report = `# 🎯 实用池子排名报告

**生成时间**: ${new Date().toLocaleString('zh-CN')}  
**排名逻辑**: DEX使用率 × 代币重要性  
**总路由数**: ${totalRoutes.toLocaleString()}  
**总交易步数**: ${totalSteps.toLocaleString()}

---

## 📋 排名逻辑说明

### 核心原则：简单实用

1. **DEX排名优先**
   - 使用率最高的DEX最可靠
   - Top 3 DEX的池子优先级最高

2. **代币重要性次之**
   - USDC和USDT是核心中间代币
   - 代币使用量越大，优先级越高

3. **排序规则**
   - 首先按DEX排名排序（Top DEX优先）
   - 其次按代币重要性排序（核心代币优先）
   - 最后按使用次数排序（高频优先）

---

## 📊 基础数据

### DEX使用率排行

| 排名 | DEX | 使用次数 | 使用率 | 评级 |
|------|-----|---------|-------|------|
`;

  sortedDexes.slice(0, 15).forEach(([dex, count], index) => {
    const rate = (count / totalSteps) * 100;
    let rating = '';
    if (index < 3) rating = '⭐⭐⭐⭐⭐ 顶级';
    else if (index < 5) rating = '⭐⭐⭐⭐ 优秀';
    else if (index < 10) rating = '⭐⭐⭐ 良好';
    else rating = '⭐⭐ 一般';
    
    report += `| ${index + 1} | **${dex}** | ${count.toLocaleString()} | ${rate.toFixed(2)}% | ${rating} |\n`;
  });

  report += `\n### 代币使用量排行

| 排名 | 代币 | 使用次数 | 占比 | 评级 |
|------|------|---------|------|------|
`;

  const sortedTokens = Array.from(tokenUsageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const totalTokenUsage = Array.from(tokenUsageMap.values()).reduce((a, b) => a + b, 0);

  sortedTokens.forEach(([token, count], index) => {
    const percentage = (count / totalTokenUsage) * 100;
    let rating = '';
    if (percentage >= 50) rating = '⭐⭐⭐⭐⭐ 核心';
    else if (percentage >= 20) rating = '⭐⭐⭐⭐ 重要';
    else if (percentage >= 5) rating = '⭐⭐⭐ 常用';
    else rating = '⭐⭐ 偶尔';
    
    report += `| ${index + 1} | **${token}** | ${count.toLocaleString()} | ${percentage.toFixed(2)}% | ${rating} |\n`;
  });

  report += `\n---

## 🏆 Top 30 池子推荐（按实用性排序）

| 排名 | 推荐等级 | DEX | 交易对 | 使用次数 | DEX排名 | 代币重要性 |
|------|---------|-----|--------|---------|---------|-----------|
`;

  rankings.slice(0, 30).forEach(r => {
    report += `| ${r.rank} | **${r.recommendation}** | ${r.dex} | ${r.pair} | ${r.usageCount.toLocaleString()} | #${r.dexRank} (${r.dexUsageRate.toFixed(1)}%) | ${r.tokenImportanceScore.toFixed(1)} |\n`;
  });

  report += `\n---

## 📊 详细分析（Top 20）

`;

  rankings.slice(0, 20).forEach(r => {
    report += `
### ${r.rank}. ${r.dex} - ${r.pair}

**推荐等级**: ${r.recommendation}

**为什么推荐它？**
- 🏢 **DEX排名**: #${r.dexRank}（使用率${r.dexUsageRate.toFixed(2)}%）
- 🪙 **代币重要性**: ${r.tokenImportanceScore.toFixed(1)}/100
  - ${r.tokenA}: ${r.tokenAUsage.toLocaleString()}次
  - ${r.tokenB}: ${r.tokenBUsage.toLocaleString()}次
- 📊 **使用频率**: ${r.usageCount.toLocaleString()}次 (${r.usagePercentage.toFixed(2)}%)

---
`;
  });

  // 按推荐等级分组
  const sPlus = rankings.filter(r => r.recommendation.startsWith('S+ '));
  const s = rankings.filter(r => r.recommendation.startsWith('S ') && !r.recommendation.startsWith('S+ '));
  const a = rankings.filter(r => r.recommendation.startsWith('A '));
  const b = rankings.filter(r => r.recommendation.startsWith('B '));

  report += `
## 🎯 推荐方案

### 推荐等级分布

| 等级 | 数量 | 说明 | 
|------|------|------|
| **S+ (核心必备)** | ${sPlus.length} | Top 3 DEX + 核心代币 |
| **S (强烈推荐)** | ${s.length} | Top 5 DEX + 重要代币 |
| **A (推荐)** | ${a.length} | Top 10 DEX + 常用代币 |
| **B (可选)** | ${b.length} | Top 15 DEX |

---

### 方案1：极简配置（S+级别）⭐⭐⭐⭐⭐ 推荐

**池子数**: ${sPlus.length}个  
**特点**: 最核心的DEX + 最重要的代币

`;

  sPlus.forEach((r, i) => {
    report += `${i + 1}. **${r.dex}** - ${r.pair}\n`;
    report += `   - DEX排名: #${r.dexRank}\n`;
    report += `   - 代币重要性: ${r.tokenImportanceScore.toFixed(1)}/100\n`;
    report += `   - 使用次数: ${r.usageCount.toLocaleString()}\n\n`;
  });

  const sPlusCoverage = sPlus.reduce((sum, r) => sum + r.usagePercentage, 0);
  report += `**预期覆盖率**: ${sPlusCoverage.toFixed(1)}%\n`;

  report += `\n---

### 方案2：标准配置（S+和S级别）⭐⭐⭐⭐ 平衡

**池子数**: ${sPlus.length + s.length}个  
**特点**: 平衡覆盖率和复杂度

**新增S级池子**:

`;

  s.forEach((r, i) => {
    report += `${i + 1}. **${r.dex}** - ${r.pair} (DEX #${r.dexRank}, 代币 ${r.tokenImportanceScore.toFixed(1)}/100)\n`;
  });

  const totalCoverage = [...sPlus, ...s].reduce((sum, r) => sum + r.usagePercentage, 0);
  report += `\n**预期覆盖率**: ${totalCoverage.toFixed(1)}%\n`;

  report += `\n---

### 方案3：完整配置（S+、S、A级别）⭐⭐⭐ 全面

**池子数**: ${sPlus.length + s.length + a.length}个  
**特点**: 最大化覆盖率

**新增A级池子数**: ${a.length}个

`;

  const fullCoverage = [...sPlus, ...s, ...a].reduce((sum, r) => sum + r.usagePercentage, 0);
  report += `**预期覆盖率**: ${fullCoverage.toFixed(1)}%\n`;

  report += `\n---

## 💡 选择建议

### 我的推荐：方案1（S+级别，${sPlus.length}个池子）

**为什么？**
1. ✅ **最核心的DEX**（Top 3）
2. ✅ **最重要的代币**（USDC/USDT）
3. ✅ **高覆盖率**（${sPlusCoverage.toFixed(1)}%）
4. ✅ **低复杂度**（只需监控${sPlus.length}个池子）

**实施步骤**：
1. 从上面S+级别列表选择所有池子
2. 使用Jupiter API查询具体池子地址
3. 配置Rust Pool Cache订阅这些池子
4. 监控1-2周，评估实际捕获率
5. 如果捕获率<80%，考虑扩展到S级

---

## 📎 附录

详细数据已导出到JSON文件。

---

**报告结束**

*排名逻辑：DEX使用率优先，代币重要性次之，简单实用*
`;

  fs.writeFileSync('PRACTICAL_RANKING_REPORT.md', report, 'utf-8');
  console.log('✅ 实用排名报告已生成: PRACTICAL_RANKING_REPORT.md\n');

  // 导出JSON
  const exportData = {
    generatedAt: new Date().toISOString(),
    totalRoutes,
    totalSteps,
    dexRankings: sortedDexes.map(([dex, count], index) => ({
      rank: index + 1,
      dex,
      usageCount: count,
      usageRate: (count / totalSteps) * 100,
    })),
    tokenRankings: sortedTokens.map(([token, count], index) => ({
      rank: index + 1,
      token,
      usageCount: count,
      percentage: (count / totalTokenUsage) * 100,
    })),
    poolRankings: rankings.slice(0, 50),
    recommendations: {
      sPlus: sPlus,
      s: s,
      a: a,
    }
  };

  fs.writeFileSync('practical-ranking-data.json', JSON.stringify(exportData, null, 2), 'utf-8');
  console.log('✅ 详细数据已导出: practical-ranking-data.json\n');
}

if (require.main === module) {
  practicalRanking()
    .then(() => {
      console.log('\n✅ 实用排名分析完成！\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

