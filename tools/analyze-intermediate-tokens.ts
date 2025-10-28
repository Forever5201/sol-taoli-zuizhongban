#!/usr/bin/env tsx
/**
 * 分析套利路径中的中间代币
 * 多跳路由分析
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

interface TokenUsage {
  mint: string;
  name: string;
  count: number;
  asIntermediate: number;  // 作为中间代币的次数
  asStart: number;         // 作为起始代币的次数
  asEnd: number;           // 作为结束代币的次数
  asBridge: number;        // 作为桥接代币的次数
}

interface RoutePattern {
  pattern: string;
  count: number;
  avgProfit: number;
  hopCount: number;
  intermediateTokens: string[];
}

async function analyzeIntermediateTokens() {
  console.log('🔍 分析多跳路由中的中间代币...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      inputMint: true,
      outputMint: true,
      bridgeToken: true,
      bridgeMint: true,
      expectedProfit: true,
      metadata: true,
    }
  });

  console.log(`📊 找到 ${opportunities.length} 条记录\n`);

  // 统计所有代币使用情况
  const tokenStats = new Map<string, TokenUsage>();
  const routePatterns = new Map<string, RoutePattern>();
  const hopDistribution = new Map<number, number>();

  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    if (!metadata || !metadata.routeInfo) continue;

    const routeInfo = metadata.routeInfo;
    const outboundRoute = routeInfo.outboundRoute || [];
    const returnRoute = routeInfo.returnRoute || [];
    
    const totalHops = routeInfo.totalHops || (outboundRoute.length + returnRoute.length);
    
    // 统计跳数分布
    hopDistribution.set(totalHops, (hopDistribution.get(totalHops) || 0) + 1);

    // 收集路径中的所有代币
    const allTokens = new Set<string>();
    const pathTokens: string[] = [];

    // 处理去程
    for (const step of outboundRoute) {
      const inputMint = step.inputMint;
      const outputMint = step.outputMint;
      
      if (inputMint) {
        allTokens.add(inputMint);
        if (pathTokens.length === 0) pathTokens.push(inputMint);
      }
      if (outputMint) {
        allTokens.add(outputMint);
        pathTokens.push(outputMint);
      }
    }

    // 处理回程
    for (const step of returnRoute) {
      const inputMint = step.inputMint;
      const outputMint = step.outputMint;
      
      if (inputMint) allTokens.add(inputMint);
      if (outputMint) {
        allTokens.add(outputMint);
        pathTokens.push(outputMint);
      }
    }

    // 去重路径代币
    const uniquePathTokens = Array.from(new Set(pathTokens));

    // 创建路径模式
    const patternKey = uniquePathTokens.map(t => getTokenName(t)).join(' → ');
    const existingPattern = routePatterns.get(patternKey);
    
    if (existingPattern) {
      existingPattern.count++;
      existingPattern.avgProfit += Number(opp.expectedProfit);
    } else {
      routePatterns.set(patternKey, {
        pattern: patternKey,
        count: 1,
        avgProfit: Number(opp.expectedProfit),
        hopCount: totalHops,
        intermediateTokens: uniquePathTokens.map(t => getTokenName(t)),
      });
    }

    // 统计每个代币的使用情况
    const pathArray = Array.from(uniquePathTokens);
    
    pathArray.forEach((mint, index) => {
      let usage = tokenStats.get(mint);
      if (!usage) {
        usage = {
          mint,
          name: getTokenName(mint),
          count: 0,
          asIntermediate: 0,
          asStart: 0,
          asEnd: 0,
          asBridge: 0,
        };
        tokenStats.set(mint, usage);
      }

      usage.count++;

      // 判断角色
      if (index === 0) {
        usage.asStart++;
      }
      if (index === pathArray.length - 1) {
        usage.asEnd++;
      }
      if (index > 0 && index < pathArray.length - 1) {
        usage.asIntermediate++;
      }
      if (mint === opp.bridgeMint) {
        usage.asBridge++;
      }
    });
  }

  // 计算平均利润
  routePatterns.forEach(pattern => {
    pattern.avgProfit = pattern.avgProfit / pattern.count / 1e9;
  });

  await generateReport(tokenStats, routePatterns, hopDistribution);

  await prisma.$disconnect();
}

function getTokenName(mint: string): string {
  if (TOKEN_MAP[mint]) return TOKEN_MAP[mint];
  
  // 尝试识别未知代币
  if (mint.length === 44) {
    return mint.substring(0, 4) + '...' + mint.substring(40);
  }
  
  return mint;
}

async function generateReport(
  tokenStats: Map<string, TokenUsage>,
  routePatterns: Map<string, RoutePattern>,
  hopDistribution: Map<number, number>
) {
  let report = `# 🔄 多跳路由和中间代币详细分析

**生成时间**: ${new Date().toISOString().split('T')[0]}  
**分析内容**: 套利路径中的所有代币和跳数分布

---

## 📊 跳数分布

`;

  // 跳数统计
  const hopStats = Array.from(hopDistribution.entries()).sort((a, b) => a[0] - b[0]);
  const totalRecords = Array.from(hopDistribution.values()).reduce((a, b) => a + b, 0);

  report += '| 跳数 | 记录数 | 占比 |\n';
  report += '|------|--------|------|\n';

  hopStats.forEach(([hops, count]) => {
    const percentage = ((count / totalRecords) * 100).toFixed(2);
    report += `| ${hops} 跳 | ${count.toLocaleString()} | ${percentage}% |\n`;
  });

  const avgHops = hopStats.reduce((sum, [hops, count]) => sum + hops * count, 0) / totalRecords;
  report += `\n**平均跳数**: ${avgHops.toFixed(2)} 跳\n`;

  report += `\n---

## 🪙 所有涉及的代币

`;

  // 按使用次数排序
  const tokens = Array.from(tokenStats.values()).sort((a, b) => b.count - a.count);

  report += `**总计发现 ${tokens.length} 个不同的代币**\n\n`;

  report += '| 排名 | 代币名称 | 总使用次数 | 作为起始 | 作为中间跳 | 作为结束 | 作为桥接 |\n';
  report += '|------|---------|-----------|---------|-----------|---------|----------|\n';

  tokens.forEach((token, index) => {
    report += `| ${index + 1} | **${token.name}** | ${token.count.toLocaleString()} | ${token.asStart.toLocaleString()} | ${token.asIntermediate.toLocaleString()} | ${token.asEnd.toLocaleString()} | ${token.asBridge.toLocaleString()} |\n`;
  });

  report += `\n### 中间代币详情

**仅作为中间跳转的代币** (不是起始也不是结束):

`;

  const intermediateOnly = tokens.filter(t => t.asIntermediate > 0);
  
  if (intermediateOnly.length > 0) {
    intermediateOnly.forEach(token => {
      const intermediatePercentage = ((token.asIntermediate / token.count) * 100).toFixed(1);
      report += `- **${token.name}** (\`${token.mint}\`)
  - 作为中间跳: ${token.asIntermediate.toLocaleString()} 次 (${intermediatePercentage}%)
  - 作为桥接代币: ${token.asBridge.toLocaleString()} 次
  - 总使用: ${token.count.toLocaleString()} 次

`;
    });
  } else {
    report += '未发现纯中间代币（所有代币都可能作为起始或结束）\n';
  }

  report += `\n---

## 🛤️ 常见路由模式 (Top 20)

`;

  // 按使用次数排序路由模式
  const topPatterns = Array.from(routePatterns.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  topPatterns.forEach((pattern, index) => {
    const percentage = ((pattern.count / totalRecords) * 100).toFixed(2);
    report += `### ${index + 1}. ${pattern.pattern}

- **使用次数**: ${pattern.count.toLocaleString()} (${percentage}%)
- **平均利润**: ${pattern.avgProfit.toFixed(4)} SOL
- **跳数**: ${pattern.hopCount}
- **路径**: ${pattern.intermediateTokens.join(' → ')}

`;
  });

  report += `\n---

## 💡 关键发现

### 1. 路由复杂度

`;

  const minHops = Math.min(...Array.from(hopDistribution.keys()));
  const maxHops = Math.max(...Array.from(hopDistribution.keys()));
  const mostCommonHops = Array.from(hopDistribution.entries()).sort((a, b) => b[1] - a[1])[0];

  report += `- **最少跳数**: ${minHops} 跳
- **最多跳数**: ${maxHops} 跳
- **最常见跳数**: ${mostCommonHops[0]} 跳 (${mostCommonHops[1].toLocaleString()} 次)
- **平均跳数**: ${avgHops.toFixed(2)} 跳

### 2. 代币角色分析

`;

  // 找出主要的起始/结束代币
  const mainStart = tokens.filter(t => t.asStart > 1000).sort((a, b) => b.asStart - a.asStart);
  const mainEnd = tokens.filter(t => t.asEnd > 1000).sort((a, b) => b.asEnd - a.asEnd);
  const mainBridge = tokens.filter(t => t.asBridge > 1000).sort((a, b) => b.asBridge - a.asBridge);

  report += `**主要起始代币**:
`;
  mainStart.forEach(t => {
    report += `- ${t.name}: ${t.asStart.toLocaleString()} 次\n`;
  });

  report += `\n**主要结束代币**:
`;
  mainEnd.forEach(t => {
    report += `- ${t.name}: ${t.asEnd.toLocaleString()} 次\n`;
  });

  report += `\n**主要桥接代币**:
`;
  mainBridge.forEach(t => {
    report += `- ${t.name}: ${t.asBridge.toLocaleString()} 次\n`;
  });

  report += `\n### 3. 多跳特征

`;

  const multiHopCount = Array.from(hopDistribution.entries())
    .filter(([hops]) => hops > 2)
    .reduce((sum, [, count]) => sum + count, 0);
  
  const multiHopPercentage = ((multiHopCount / totalRecords) * 100).toFixed(2);

  report += `- **多跳路由** (> 2 跳): ${multiHopCount.toLocaleString()} 条 (${multiHopPercentage}%)
- **简单路由** (≤ 2 跳): ${(totalRecords - multiHopCount).toLocaleString()} 条 (${(100 - parseFloat(multiHopPercentage)).toFixed(2)}%)

这说明您的套利策略中，有 **${multiHopPercentage}%** 的机会涉及复杂的多跳路由。

---

## 🎯 对 Rust Pool Cache 的建议

基于多跳分析：

`;

  // 找出最常见的中间代币
  const topIntermediate = tokens
    .filter(t => t.asIntermediate > 0)
    .sort((a, b) => b.asIntermediate - a.asIntermediate)
    .slice(0, 10);

  if (topIntermediate.length > 0) {
    report += `### 应该监控的中间代币池子

`;
    topIntermediate.forEach((token, index) => {
      report += `${index + 1}. **${token.name}** 相关池子
   - 作为中间跳: ${token.asIntermediate.toLocaleString()} 次
   - 建议监控与 SOL/USDC/USDT 的交易对
   
`;
    });
  }

  report += `
### 推荐监控的交易对优先级

基于实际使用频率：

`;

  // 生成推荐的交易对
  const recommendations = new Map<string, number>();
  
  tokens.forEach(token => {
    if (token.asIntermediate > 100 || token.asBridge > 100) {
      // 与主要代币的组合
      ['SOL', 'USDC', 'USDT'].forEach(main => {
        const pair = `${token.name}/${main}`;
        recommendations.set(pair, token.asIntermediate + token.asBridge);
      });
    }
  });

  const topPairs = Array.from(recommendations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  topPairs.forEach(([pair, count], index) => {
    report += `${index + 1}. ${pair} (使用 ${count.toLocaleString()} 次)\n`;
  });

  report += `\n---

**报告结束**
`;

  fs.writeFileSync('INTERMEDIATE_TOKENS_ANALYSIS.md', report, 'utf-8');
  console.log('📄 生成详细报告: INTERMEDIATE_TOKENS_ANALYSIS.md');

  // 导出JSON
  const exportData = {
    tokenStatistics: Array.from(tokenStats.values()),
    routePatterns: Array.from(routePatterns.values()).sort((a, b) => b.count - a.count),
    hopDistribution: Array.from(hopDistribution.entries()).sort((a, b) => a[0] - b[0]),
  };

  fs.writeFileSync(
    'intermediate-tokens-data.json',
    JSON.stringify(exportData, null, 2),
    'utf-8'
  );
  console.log('📄 导出数据: intermediate-tokens-data.json');
}

if (require.main === module) {
  analyzeIntermediateTokens()
    .then(() => {
      console.log('\n✅ 分析完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

