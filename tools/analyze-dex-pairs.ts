#!/usr/bin/env tsx
/**
 * 分析中间代币使用的DEX和交易对
 * 由于metadata中没有池子地址，我们分析DEX和交易对组合
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

// 扩展的代币映射
const TOKEN_MAP: { [key: string]: string } = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH (Wormhole)',
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': 'BTC (Wormhole)',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'stSOL',
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 'bSOL',
};

interface DexPairInfo {
  dex: string;
  pair: string;
  inputMint: string;
  outputMint: string;
  inputToken: string;
  outputToken: string;
  usageCount: number;
  totalProfit: number;
  avgProfit: number;
}

interface TokenDexUsage {
  token: string;
  tokenMint: string;
  totalUsage: number;
  dexPairs: DexPairInfo[];
  topDexes: Map<string, number>;
}

async function analyzeDexPairs() {
  console.log('🔍 分析中间代币使用的DEX和交易对...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
      expectedProfit: true,
    }
  });

  console.log(`📊 找到 ${opportunities.length} 条记录\n`);

  // 统计 DEX-交易对组合
  const dexPairStats = new Map<string, DexPairInfo>();
  const tokenDexUsage = new Map<string, TokenDexUsage>();

  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    if (!metadata || !metadata.routeInfo) continue;

    const routeInfo = metadata.routeInfo;
    const allRoutes = [
      ...(routeInfo.outboundRoute || []),
      ...(routeInfo.returnRoute || [])
    ];

    for (const step of allRoutes) {
      const dex = step.dex || 'Unknown';
      const inputMint = step.inputMint;
      const outputMint = step.outputMint;

      if (!inputMint || !outputMint) continue;

      const inputToken = getTokenName(inputMint);
      const outputToken = getTokenName(outputMint);
      const pair = `${inputToken} → ${outputToken}`;
      const key = `${dex}|${pair}`;

      // 统计 DEX-交易对组合
      let dexPairInfo = dexPairStats.get(key);

      if (!dexPairInfo) {
        dexPairInfo = {
          dex: dex,
          pair: pair,
          inputMint: inputMint,
          outputMint: outputMint,
          inputToken: inputToken,
          outputToken: outputToken,
          usageCount: 0,
          totalProfit: 0,
          avgProfit: 0,
        };
        dexPairStats.set(key, dexPairInfo);
      }

      dexPairInfo.usageCount++;
      dexPairInfo.totalProfit += Number(opp.expectedProfit);

      // 统计每个中间代币在哪些DEX上使用
      // 处理 inputMint (如果不是SOL)
      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        updateTokenDexUsage(inputMint, inputToken, dex, tokenDexUsage);
      }

      // 处理 outputMint (如果不是SOL)
      if (outputMint !== 'So11111111111111111111111111111111111111112') {
        updateTokenDexUsage(outputMint, outputToken, dex, tokenDexUsage);
      }
    }
  }

  // 计算平均利润
  dexPairStats.forEach(pair => {
    pair.avgProfit = pair.totalProfit / pair.usageCount / 1e9;
  });

  // 关联 DEX-交易对到代币
  dexPairStats.forEach(dexPair => {
    if (dexPair.inputMint !== 'So11111111111111111111111111111111111111112') {
      const tokenUsage = tokenDexUsage.get(dexPair.inputMint);
      if (tokenUsage) {
        tokenUsage.dexPairs.push(dexPair);
      }
    }
    
    if (dexPair.outputMint !== 'So11111111111111111111111111111111111111112') {
      const tokenUsage = tokenDexUsage.get(dexPair.outputMint);
      if (tokenUsage) {
        tokenUsage.dexPairs.push(dexPair);
      }
    }
  });

  // 去重并排序
  tokenDexUsage.forEach(tokenUsage => {
    const uniquePairs = new Map<string, DexPairInfo>();
    tokenUsage.dexPairs.forEach(pair => {
      const key = `${pair.dex}|${pair.pair}`;
      const existing = uniquePairs.get(key);
      if (!existing || existing.usageCount < pair.usageCount) {
        uniquePairs.set(key, pair);
      }
    });
    tokenUsage.dexPairs = Array.from(uniquePairs.values()).sort((a, b) => b.usageCount - a.usageCount);
  });

  await generateReport(tokenDexUsage, dexPairStats);

  await prisma.$disconnect();
}

function updateTokenDexUsage(
  mint: string,
  tokenName: string,
  dex: string,
  tokenDexUsage: Map<string, TokenDexUsage>
) {
  let tokenUsage = tokenDexUsage.get(mint);
  if (!tokenUsage) {
    tokenUsage = {
      token: tokenName,
      tokenMint: mint,
      totalUsage: 0,
      dexPairs: [],
      topDexes: new Map<string, number>(),
    };
    tokenDexUsage.set(mint, tokenUsage);
  }
  tokenUsage.totalUsage++;
  tokenUsage.topDexes.set(dex, (tokenUsage.topDexes.get(dex) || 0) + 1);
}

function getTokenName(mint: string): string {
  if (TOKEN_MAP[mint]) return TOKEN_MAP[mint];
  
  if (mint.length === 44) {
    return mint.substring(0, 4) + '...' + mint.substring(40);
  }
  
  return mint;
}

async function generateReport(
  tokenDexUsage: Map<string, TokenDexUsage>,
  dexPairStats: Map<string, DexPairInfo>
) {
  let report = `# 🏊 中间代币使用的DEX和交易对分析

**生成时间**: ${new Date().toISOString().split('T')[0]}  
**分析说明**: 由于您的系统使用Jupiter聚合路由，metadata中没有存储具体池子地址，仅有DEX名称和交易对。

---

## ⚠️ 重要说明

**您的系统没有记录池子地址**

- Jupiter 聚合器会动态选择最优池子
- Metadata中只记录了 DEX 名称和代币地址
- 要监控具体池子，需要：
  1. 从各个DEX获取该交易对的所有池子列表
  2. 按流动性排序，优先监控高流动性池子

---

## 📊 总览

- **不同DEX-交易对组合**: ${dexPairStats.size} 个
- **涉及中间代币**: ${tokenDexUsage.size} 个

---

`;

  // 按使用次数排序代币
  const tokens = Array.from(tokenDexUsage.values()).sort((a, b) => b.totalUsage - a.totalUsage);

  // 为每个重要代币生成详细报告
  const topTokens = tokens.slice(0, 10); // 显示前10个最常用的中间代币

  topTokens.forEach((tokenUsage, index) => {
    report += `## ${index + 1}. ${tokenUsage.token}

**代币地址**: \`${tokenUsage.tokenMint}\`  
**总使用次数**: ${tokenUsage.totalUsage.toLocaleString()} 次

### 主要使用的DEX

`;

    const sortedDexes = Array.from(tokenUsage.topDexes.entries()).sort((a, b) => b[1] - a[1]);
    sortedDexes.slice(0, 10).forEach(([dex, count]) => {
      const percentage = ((count / tokenUsage.totalUsage) * 100).toFixed(1);
      report += `- **${dex}**: ${count.toLocaleString()} 次 (${percentage}%)\n`;
    });

    report += `\n### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
`;

    const topPairs = tokenUsage.dexPairs.slice(0, 10);
    topPairs.forEach((pair, i) => {
      report += `| ${i + 1} | ${pair.dex} | ${pair.pair} | ${pair.usageCount.toLocaleString()} | ${pair.avgProfit.toFixed(4)} SOL |\n`;
    });

    report += `\n`;

    // 如果这个代币在很多DEX上使用，给出建议
    if (sortedDexes.length >= 3) {
      report += `**💡 监控建议**: \n该代币在 **${sortedDexes.length}** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：\n`;
      
      const mainPairs = new Set<string>();
      topPairs.forEach(pair => mainPairs.add(pair.pair));
      
      Array.from(mainPairs).slice(0, 5).forEach(pair => {
        report += `- ${pair}\n`;
      });
      report += `\n`;
    }

    report += `---\n\n`;
  });

  // 生成最常用DEX-交易对排行榜
  report += `## 🏆 最常用的DEX-交易对组合 (Top 50)

`;

  const topPairs = Array.from(dexPairStats.values())
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 50);

  report += `| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
`;

  topPairs.forEach((pair, i) => {
    report += `| ${i + 1} | ${pair.dex} | ${pair.pair} | ${pair.usageCount.toLocaleString()} | ${pair.avgProfit.toFixed(4)} SOL |\n`;
  });

  report += `\n---

## 💡 如何获取具体池子地址

### 方法 1: 使用 Jupiter API

对于每个高频使用的交易对，调用 Jupiter API 获取可用池子列表：

\`\`\`bash
# 例如：查询 SOL → USDC 的所有池子
curl "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000"
\`\`\`

返回的路由信息中包含具体的池子地址。

### 方法 2: 直接查询各DEX

根据上面的分析，您需要从以下DEX获取池子信息：

`;

  // 统计DEX使用频率
  const dexFrequency = new Map<string, number>();
  dexPairStats.forEach(pair => {
    dexFrequency.set(pair.dex, (dexFrequency.get(pair.dex) || 0) + pair.usageCount);
  });

  const topDexes = Array.from(dexFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  topDexes.forEach(([dex, count]) => {
    const percentage = ((count / Array.from(dexPairStats.values()).reduce((sum, p) => sum + p.usageCount, 0)) * 100).toFixed(2);
    report += `- **${dex}**: ${count.toLocaleString()} 次使用 (${percentage}%)\n`;
  });

  report += `\n### 方法 3: 从交易历史提取

如果您执行过交易，可以从 \`trade_routes\` 表或交易签名中提取实际使用的池子地址。

---

## 🎯 对 Rust Pool Cache 的具体建议

### 优先监控的交易对 (Top 20)

`;

  // 汇总交易对（不区分DEX）
  const pairFrequency = new Map<string, number>();
  dexPairStats.forEach(pair => {
    pairFrequency.set(pair.pair, (pairFrequency.get(pair.pair) || 0) + pair.usageCount);
  });

  const topTradingPairs = Array.from(pairFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  topTradingPairs.forEach(([pair, count], index) => {
    const percentage = ((count / Array.from(dexPairStats.values()).reduce((sum, p) => sum + p.usageCount, 0)) * 100).toFixed(2);
    report += `${index + 1}. **${pair}** - ${count.toLocaleString()} 次 (${percentage}%)\n`;
  });

  report += `\n### 实施步骤

1. **确定高频交易对**: 使用上面的Top 20列表
2. **查询池子列表**: 使用Jupiter API或各DEX的SDK
3. **按流动性筛选**: 每个交易对选择流动性最高的3-5个池子
4. **配置Rust Pool Cache**: 将这些池子地址添加到config.toml

### 预估池子数量

- 如果每个Top 20交易对监控5个池子 = **100个池子**
- 覆盖多个DEX，每个交易对10个池子 = **200个池子**

这是一个可行的起点，可以覆盖您大部分的套利机会。

---

**报告结束**
`;

  fs.writeFileSync('DEX_PAIRS_ANALYSIS.md', report, 'utf-8');
  console.log('📄 生成详细报告: DEX_PAIRS_ANALYSIS.md');

  // 导出JSON
  const exportData = {
    tokenDexUsage: Array.from(tokenDexUsage.values()),
    dexPairStatistics: Array.from(dexPairStats.values()).sort((a, b) => b.usageCount - a.usageCount),
    dexFrequency: Array.from(dexFrequency.entries()).sort((a, b) => b[1] - a[1]),
    topTradingPairs: topTradingPairs,
  };

  fs.writeFileSync(
    'dex-pairs-data.json',
    JSON.stringify(exportData, null, 2),
    'utf-8'
  );
  console.log('📄 导出数据: dex-pairs-data.json');
}

if (require.main === module) {
  analyzeDexPairs()
    .then(() => {
      console.log('\n✅ DEX-交易对分析完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

