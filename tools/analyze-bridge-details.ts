#!/usr/bin/env tsx
/**
 * 详细分析桥接代币和交易对
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

// 已知代币映射
const TOKEN_MAP: { [key: string]: string } = {
  'So11111111111111111111111111111111111111112': 'SOL (Wrapped)',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH (Wormhole)',
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': 'BTC (Wormhole)',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
};

interface BridgeDetail {
  bridgeToken: string;
  bridgeMint: string;
  count: number;
  avgProfit: number;
  totalProfit: number;
  inputMints: Map<string, number>;
  outputMints: Map<string, number>;
  tradingPairs: Map<string, number>;
}

async function analyzeBridgeDetails() {
  console.log('🔍 分析桥接代币详情...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      bridgeToken: true,
      bridgeMint: true,
      inputMint: true,
      outputMint: true,
      expectedProfit: true,
      metadata: true,
    }
  });

  console.log(`📊 找到 ${opportunities.length} 条记录\n`);

  // 按桥接代币分组
  const bridgeMap = new Map<string, BridgeDetail>();

  for (const opp of opportunities) {
    if (!opp.bridgeToken || !opp.bridgeMint) continue;

    const key = opp.bridgeToken;
    let detail = bridgeMap.get(key);

    if (!detail) {
      detail = {
        bridgeToken: opp.bridgeToken,
        bridgeMint: opp.bridgeMint,
        count: 0,
        avgProfit: 0,
        totalProfit: 0,
        inputMints: new Map(),
        outputMints: new Map(),
        tradingPairs: new Map(),
      };
      bridgeMap.set(key, detail);
    }

    detail.count++;
    detail.totalProfit += Number(opp.expectedProfit);

    // 统计输入输出代币
    detail.inputMints.set(opp.inputMint, (detail.inputMints.get(opp.inputMint) || 0) + 1);
    detail.outputMints.set(opp.outputMint, (detail.outputMints.get(opp.outputMint) || 0) + 1);

    // 统计交易对
    const pair = `${opp.inputMint} → ${opp.bridgeMint} → ${opp.outputMint}`;
    detail.tradingPairs.set(pair, (detail.tradingPairs.get(pair) || 0) + 1);

    // 从 metadata 提取路由信息
    if (opp.metadata) {
      const metadata = opp.metadata as any;
      const routeInfo = metadata.routeInfo || {};
      const dexes = routeInfo.dexes || [];
      
      // 可以进一步分析每个DEX使用的代币对
    }
  }

  // 计算平均利润
  for (const detail of bridgeMap.values()) {
    detail.avgProfit = detail.totalProfit / detail.count / 1e9;
    detail.totalProfit = detail.totalProfit / 1e9;
  }

  // 生成报告
  await generateBridgeReport(bridgeMap);

  await prisma.$disconnect();
}

function getTokenName(mint: string): string {
  return TOKEN_MAP[mint] || `${mint.substring(0, 8)}...`;
}

async function generateBridgeReport(bridgeMap: Map<string, BridgeDetail>) {
  let report = `# 🔗 桥接代币和池子详细分析报告

**生成时间**: ${new Date().toISOString().split('T')[0]}  
**分析内容**: 桥接代币使用情况和交易对分布

---

## 📊 桥接代币总览

`;

  // 按使用次数排序
  const bridges = Array.from(bridgeMap.values()).sort((a, b) => b.count - a.count);

  bridges.forEach((bridge, index) => {
    report += `### ${index + 1}. ${bridge.bridgeToken}

**基本信息**:
- **代币符号**: ${bridge.bridgeToken}
- **代币地址**: \`${bridge.bridgeMint}\`
- **使用次数**: ${bridge.count.toLocaleString()}
- **平均利润**: ${bridge.avgProfit.toFixed(4)} SOL
- **总利润**: ${bridge.totalProfit.toFixed(2)} SOL

**输入代币分布** (Top 5):
`;

    // 输入代币统计
    const topInputs = Array.from(bridge.inputMints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    topInputs.forEach(([mint, count]) => {
      const percentage = ((count / bridge.count) * 100).toFixed(2);
      report += `- \`${getTokenName(mint)}\`: ${count.toLocaleString()} 次 (${percentage}%)\n`;
    });

    report += `\n**输出代币分布** (Top 5):
`;

    // 输出代币统计
    const topOutputs = Array.from(bridge.outputMints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    topOutputs.forEach(([mint, count]) => {
      const percentage = ((count / bridge.count) * 100).toFixed(2);
      report += `- \`${getTokenName(mint)}\`: ${count.toLocaleString()} 次 (${percentage}%)\n`;
    });

    report += `\n**最常见的交易路径** (Top 10):
`;

    // 交易对统计
    const topPairs = Array.from(bridge.tradingPairs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topPairs.forEach(([pair, count]) => {
      const percentage = ((count / bridge.count) * 100).toFixed(2);
      // 美化显示
      const parts = pair.split(' → ');
      const formatted = `${getTokenName(parts[0])} → ${getTokenName(parts[1])} → ${getTokenName(parts[2])}`;
      report += `- ${formatted}: ${count.toLocaleString()} 次 (${percentage}%)\n`;
    });

    report += `\n---\n\n`;
  });

  // 汇总统计
  report += `## 📈 代币使用汇总

### 所有使用的代币 Mint 地址

`;

  // 收集所有代币
  const allMints = new Set<string>();
  bridges.forEach(bridge => {
    bridge.inputMints.forEach((_, mint) => allMints.add(mint));
    bridge.outputMints.forEach((_, mint) => allMints.add(mint));
    allMints.add(bridge.bridgeMint);
  });

  report += `**总计发现 ${allMints.size} 个不同的代币地址**\n\n`;

  Array.from(allMints).forEach(mint => {
    report += `- \`${mint}\` - ${getTokenName(mint)}\n`;
  });

  report += `\n---

## 💡 关键发现

### 1. 主要桥接代币

`;

  if (bridges.length > 0) {
    report += `- **最常用**: ${bridges[0].bridgeToken} (${bridges[0].bridgeMint})\n`;
    report += `- **使用次数**: ${bridges[0].count.toLocaleString()} 次\n`;
    report += `- **平均利润**: ${bridges[0].avgProfit.toFixed(4)} SOL\n`;
  }

  report += `\n### 2. 交易模式

您的套利机会主要是 **环形套利**：
`;

  // 找出最常见的输入/输出代币
  const inputCounts = new Map<string, number>();
  const outputCounts = new Map<string, number>();

  bridges.forEach(bridge => {
    bridge.inputMints.forEach((count, mint) => {
      inputCounts.set(mint, (inputCounts.get(mint) || 0) + count);
    });
    bridge.outputMints.forEach((count, mint) => {
      outputCounts.set(mint, (outputCounts.get(mint) || 0) + count);
    });
  });

  const topInput = Array.from(inputCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const topOutput = Array.from(outputCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  if (topInput && topOutput) {
    report += `- **起始代币**: ${getTokenName(topInput[0])} (${topInput[1].toLocaleString()} 次)\n`;
    report += `- **结束代币**: ${getTokenName(topOutput[0])} (${topOutput[1].toLocaleString()} 次)\n`;
    
    if (topInput[0] === topOutput[0]) {
      report += `- **模式**: 环形套利 (输入和输出相同)\n`;
    }
  }

  report += `\n### 3. 对 Rust Pool Cache 的建议

基于实际数据，建议监控以下交易对：

`;

  bridges.forEach(bridge => {
    const topPair = Array.from(bridge.tradingPairs.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topPair) {
      const parts = topPair[0].split(' → ');
      report += `#### ${bridge.bridgeToken} 路径
- 主要路径: ${getTokenName(parts[0])} → ${bridge.bridgeToken} → ${getTokenName(parts[2])}
- 使用频率: ${topPair[1].toLocaleString()} 次
- 建议监控: ${getTokenName(parts[0])}/${bridge.bridgeToken} 和 ${bridge.bridgeToken}/${getTokenName(parts[2])} 池子

`;
    }
  });

  report += `\n---

**报告结束**
`;

  fs.writeFileSync('BRIDGE_TOKENS_DETAILED_ANALYSIS.md', report, 'utf-8');
  console.log('📄 生成详细报告: BRIDGE_TOKENS_DETAILED_ANALYSIS.md');

  // 导出JSON
  const exportData = bridges.map(bridge => ({
    bridgeToken: bridge.bridgeToken,
    bridgeMint: bridge.bridgeMint,
    count: bridge.count,
    avgProfit: bridge.avgProfit,
    totalProfit: bridge.totalProfit,
    topInputMints: Array.from(bridge.inputMints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mint, count]) => ({ mint, name: getTokenName(mint), count })),
    topOutputMints: Array.from(bridge.outputMints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mint, count]) => ({ mint, name: getTokenName(mint), count })),
    topTradingPairs: Array.from(bridge.tradingPairs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([pair, count]) => ({ pair, count })),
  }));

  fs.writeFileSync(
    'bridge-tokens-detailed.json',
    JSON.stringify(exportData, null, 2),
    'utf-8'
  );
  console.log('📄 导出详细数据: bridge-tokens-detailed.json');
}

if (require.main === module) {
  analyzeBridgeDetails()
    .then(() => {
      console.log('\n✅ 分析完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

