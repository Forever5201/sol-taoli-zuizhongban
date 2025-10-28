#!/usr/bin/env tsx
/**
 * 分析中间代币使用的具体池子
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

interface PoolInfo {
  address: string;
  dex: string;
  inputMint: string;
  outputMint: string;
  inputToken: string;
  outputToken: string;
  usageCount: number;
  totalProfit: number;
  avgProfit: number;
}

interface TokenPoolUsage {
  token: string;
  tokenMint: string;
  totalUsage: number;
  asInput: number;
  asOutput: number;
  pools: PoolInfo[];
}

async function analyzePoolDetails() {
  console.log('🔍 分析中间代币使用的具体池子...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
      expectedProfit: true,
    }
  });

  console.log(`📊 找到 ${opportunities.length} 条记录\n`);

  // 统计池子使用情况
  const poolStats = new Map<string, PoolInfo>();
  const tokenPoolUsage = new Map<string, TokenPoolUsage>();

  for (const opp of opportunities) {
    const metadata = opp.metadata as any;
    if (!metadata || !metadata.routeInfo) continue;

    const routeInfo = metadata.routeInfo;
    const allRoutes = [
      ...(routeInfo.outboundRoute || []),
      ...(routeInfo.returnRoute || [])
    ];

    for (const step of allRoutes) {
      const poolAddress = step.pool_address || step.poolAddress || step.pool;
      const dex = step.dex || 'Unknown';
      const inputMint = step.inputMint;
      const outputMint = step.outputMint;

      if (!poolAddress || !inputMint || !outputMint) continue;

      // 统计池子使用
      const poolKey = `${poolAddress}`;
      let poolInfo = poolStats.get(poolKey);

      if (!poolInfo) {
        poolInfo = {
          address: poolAddress,
          dex: dex,
          inputMint: inputMint,
          outputMint: outputMint,
          inputToken: getTokenName(inputMint),
          outputToken: getTokenName(outputMint),
          usageCount: 0,
          totalProfit: 0,
          avgProfit: 0,
        };
        poolStats.set(poolKey, poolInfo);
      }

      poolInfo.usageCount++;
      poolInfo.totalProfit += Number(opp.expectedProfit);

      // 统计代币在池子中的使用
      // 处理 inputMint
      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        let tokenUsage = tokenPoolUsage.get(inputMint);
        if (!tokenUsage) {
          tokenUsage = {
            token: getTokenName(inputMint),
            tokenMint: inputMint,
            totalUsage: 0,
            asInput: 0,
            asOutput: 0,
            pools: [],
          };
          tokenPoolUsage.set(inputMint, tokenUsage);
        }
        tokenUsage.totalUsage++;
        tokenUsage.asInput++;
      }

      // 处理 outputMint
      if (outputMint !== 'So11111111111111111111111111111111111111112') {
        let tokenUsage = tokenPoolUsage.get(outputMint);
        if (!tokenUsage) {
          tokenUsage = {
            token: getTokenName(outputMint),
            tokenMint: outputMint,
            totalUsage: 0,
            asInput: 0,
            asOutput: 0,
            pools: [],
          };
          tokenPoolUsage.set(outputMint, tokenUsage);
        }
        tokenUsage.totalUsage++;
        tokenUsage.asOutput++;
      }
    }
  }

  // 计算平均利润
  poolStats.forEach(pool => {
    pool.avgProfit = pool.totalProfit / pool.usageCount / 1e9;
  });

  // 将池子信息关联到代币
  poolStats.forEach(pool => {
    // 关联到 inputMint
    if (pool.inputMint !== 'So11111111111111111111111111111111111111112') {
      const tokenUsage = tokenPoolUsage.get(pool.inputMint);
      if (tokenUsage) {
        tokenUsage.pools.push(pool);
      }
    }
    
    // 关联到 outputMint
    if (pool.outputMint !== 'So11111111111111111111111111111111111111112') {
      const tokenUsage = tokenPoolUsage.get(pool.outputMint);
      if (tokenUsage) {
        tokenUsage.pools.push(pool);
      }
    }
  });

  // 去重池子并按使用次数排序
  tokenPoolUsage.forEach(tokenUsage => {
    const uniquePools = new Map<string, PoolInfo>();
    tokenUsage.pools.forEach(pool => {
      const existing = uniquePools.get(pool.address);
      if (!existing || existing.usageCount < pool.usageCount) {
        uniquePools.set(pool.address, pool);
      }
    });
    tokenUsage.pools = Array.from(uniquePools.values()).sort((a, b) => b.usageCount - a.usageCount);
  });

  await generateReport(tokenPoolUsage, poolStats);

  await prisma.$disconnect();
}

function getTokenName(mint: string): string {
  if (TOKEN_MAP[mint]) return TOKEN_MAP[mint];
  
  if (mint.length === 44) {
    return mint.substring(0, 4) + '...' + mint.substring(40);
  }
  
  return mint;
}

async function generateReport(
  tokenPoolUsage: Map<string, TokenPoolUsage>,
  poolStats: Map<string, PoolInfo>
) {
  let report = `# 🏊 中间代币使用的具体池子分析

**生成时间**: ${new Date().toISOString().split('T')[0]}  
**分析内容**: 每个中间代币使用的具体DEX池子

---

## 📊 总览

- **总池子数**: ${poolStats.size} 个不同的池子
- **涉及代币数**: ${tokenPoolUsage.size} 个代币

---

`;

  // 按使用次数排序代币
  const tokens = Array.from(tokenPoolUsage.values()).sort((a, b) => b.totalUsage - a.totalUsage);

  // 为每个重要代币生成详细报告
  const topTokens = tokens.slice(0, 15); // 只显示前15个最常用的代币

  topTokens.forEach((tokenUsage, index) => {
    report += `## ${index + 1}. ${tokenUsage.token}

**代币地址**: \`${tokenUsage.tokenMint}\`  
**总使用次数**: ${tokenUsage.totalUsage.toLocaleString()} 次  
**作为输入**: ${tokenUsage.asInput.toLocaleString()} 次  
**作为输出**: ${tokenUsage.asOutput.toLocaleString()} 次

### 使用的池子 (Top 10)

| 排名 | 池子地址 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|---------|-----|--------|---------|----------|
`;

    const topPools = tokenUsage.pools.slice(0, 10);
    topPools.forEach((pool, i) => {
      const shortAddress = pool.address.substring(0, 8) + '...' + pool.address.substring(pool.address.length - 6);
      report += `| ${i + 1} | \`${shortAddress}\` | ${pool.dex} | ${pool.inputToken} → ${pool.outputToken} | ${pool.usageCount.toLocaleString()} | ${pool.avgProfit.toFixed(4)} SOL |\n`;
    });

    report += `\n**完整池子列表**:\n\n`;
    topPools.forEach((pool, i) => {
      report += `${i + 1}. **${pool.dex}** - \`${pool.address}\`
   - 交易对: ${pool.inputToken} → ${pool.outputToken}
   - 使用次数: ${pool.usageCount.toLocaleString()}
   - 平均利润: ${pool.avgProfit.toFixed(4)} SOL

`;
    });

    report += `---\n\n`;
  });

  // 生成最常用池子排行榜
  report += `## 🏆 最常用的池子 (Top 30)

`;

  const topPools = Array.from(poolStats.values())
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 30);

  report += `| 排名 | 池子地址 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|---------|-----|--------|---------|----------|
`;

  topPools.forEach((pool, i) => {
    const shortAddress = pool.address.substring(0, 8) + '...' + pool.address.substring(pool.address.length - 6);
    report += `| ${i + 1} | \`${shortAddress}\` | ${pool.dex} | ${pool.inputToken} → ${pool.outputToken} | ${pool.usageCount.toLocaleString()} | ${pool.avgProfit.toFixed(4)} SOL |\n`;
  });

  report += `\n### 完整地址列表\n\n`;

  topPools.forEach((pool, i) => {
    report += `${i + 1}. **${pool.dex}** - ${pool.inputToken} → ${pool.outputToken}
   \`\`\`
   ${pool.address}
   \`\`\`
   使用次数: ${pool.usageCount.toLocaleString()} | 平均利润: ${pool.avgProfit.toFixed(4)} SOL

`;
  });

  report += `---

## 💡 关键发现

### DEX分布

`;

  // 统计DEX分布
  const dexStats = new Map<string, number>();
  poolStats.forEach(pool => {
    dexStats.set(pool.dex, (dexStats.get(pool.dex) || 0) + pool.usageCount);
  });

  const sortedDexes = Array.from(dexStats.entries()).sort((a, b) => b[1] - a[1]);
  
  sortedDexes.forEach(([dex, count]) => {
    const percentage = ((count / Array.from(poolStats.values()).reduce((sum, p) => sum + p.usageCount, 0)) * 100).toFixed(2);
    report += `- **${dex}**: ${count.toLocaleString()} 次使用 (${percentage}%)\n`;
  });

  report += `\n### 建议

基于池子使用分析：

1. **优先监控Top 30池子**: 这些池子覆盖了大部分套利机会
2. **重点关注USDC/USDT相关池子**: 它们是最活跃的中间代币
3. **多DEX覆盖**: 确保覆盖 ${sortedDexes.length} 个不同的DEX

---

**报告结束**
`;

  fs.writeFileSync('POOL_DETAILS_ANALYSIS.md', report, 'utf-8');
  console.log('📄 生成详细报告: POOL_DETAILS_ANALYSIS.md');

  // 导出JSON
  const exportData = {
    tokenPoolUsage: Array.from(tokenPoolUsage.values()),
    poolStatistics: Array.from(poolStats.values()).sort((a, b) => b.usageCount - a.usageCount),
    dexDistribution: Array.from(dexStats.entries()).sort((a, b) => b[1] - a[1]),
  };

  fs.writeFileSync(
    'pool-details-data.json',
    JSON.stringify(exportData, null, 2),
    'utf-8'
  );
  console.log('📄 导出数据: pool-details-data.json');
}

if (require.main === module) {
  analyzePoolDetails()
    .then(() => {
      console.log('\n✅ 池子分析完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

