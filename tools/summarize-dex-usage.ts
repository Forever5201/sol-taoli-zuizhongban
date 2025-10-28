#!/usr/bin/env tsx
/**
 * 简洁总结：中间代币使用的DEX
 */

import * as fs from 'fs';

interface DexPairData {
  tokenDexUsage: Array<{
    token: string;
    tokenMint: string;
    totalUsage: number;
    topDexes: Array<[string, number]>;
  }>;
  dexFrequency: Array<[string, number]>;
}

async function summarizeDexUsage() {
  console.log('📊 中间代币使用的DEX总结\n');
  console.log('='.repeat(80));

  const dataPath = 'packages/core/dex-pairs-data.json';
  if (!fs.existsSync(dataPath)) {
    console.error('找不到数据文件，请先运行 analyze-dex-pairs.ts');
    return;
  }

  const data: DexPairData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // 1. 所有DEX的总体使用情况
  console.log('\n## 🏦 所有DEX使用频率排行榜\n');
  console.log('(所有中间代币在各DEX上的总使用次数)\n');

  const topDexes = data.dexFrequency.slice(0, 30);
  const totalUsage = topDexes.reduce((sum, [, count]) => sum + count, 0);

  topDexes.forEach(([dex, count], index) => {
    const percentage = ((count / totalUsage) * 100).toFixed(2);
    const bar = '█'.repeat(Math.floor(parseFloat(percentage) / 2));
    console.log(`${(index + 1).toString().padStart(2)}. ${dex.padEnd(25)} ${count.toLocaleString().padStart(8)} 次 (${percentage.padStart(6)}%) ${bar}`);
  });

  console.log('\n' + '='.repeat(80));

  // 2. 每个重要中间代币使用的DEX
  console.log('\n## 🪙 各中间代币使用的DEX详情\n');

  const importantTokens = data.tokenDexUsage.filter(t => t.totalUsage > 20);
  
  importantTokens.forEach((tokenUsage, index) => {
    console.log(`\n### ${index + 1}. ${tokenUsage.token}`);
    console.log(`代币地址: ${tokenUsage.tokenMint}`);
    console.log(`总使用次数: ${tokenUsage.totalUsage.toLocaleString()} 次\n`);
    console.log('使用的DEX:');

    const sortedDexes = Array.from(tokenUsage.topDexes as any as Map<string, number>)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10);

    sortedDexes.forEach(([dex, count]: [string, number], i) => {
      const percentage = ((count / tokenUsage.totalUsage) * 100).toFixed(1);
      const bar = '▓'.repeat(Math.floor(parseFloat(percentage) / 5));
      console.log(`  ${(i + 1).toString().padStart(2)}. ${dex.padEnd(25)} ${count.toLocaleString().padStart(6)} 次 (${percentage.padStart(5)}%) ${bar}`);
    });

    console.log('-'.repeat(80));
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ 总结完成！\n');

  // 生成简洁的Markdown报告
  let report = `# 🏦 中间代币使用的DEX - 简洁总结

**生成时间**: ${new Date().toLocaleString('zh-CN')}

---

## 📊 所有DEX使用频率排行榜

> 统计所有中间代币在各DEX上的总使用次数

| 排名 | DEX名称 | 使用次数 | 占比 |
|------|---------|---------|------|
`;

  topDexes.forEach(([dex, count], index) => {
    const percentage = ((count / totalUsage) * 100).toFixed(2);
    report += `| ${index + 1} | **${dex}** | ${count.toLocaleString()} | ${percentage}% |\n`;
  });

  report += `\n**总计**: ${totalUsage.toLocaleString()} 次使用\n`;

  report += `\n---

## 🪙 各中间代币使用的DEX详情

`;

  importantTokens.forEach((tokenUsage, index) => {
    report += `### ${index + 1}. ${tokenUsage.token}

**代币地址**: \`${tokenUsage.tokenMint}\`  
**总使用次数**: ${tokenUsage.totalUsage.toLocaleString()} 次

**使用的DEX**:

| 排名 | DEX | 使用次数 | 占比 |
|------|-----|---------|------|
`;

    const sortedDexes = Array.from(tokenUsage.topDexes as any as Map<string, number>)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10);

    sortedDexes.forEach(([dex, count]: [string, number], i) => {
      const percentage = ((count / tokenUsage.totalUsage) * 100).toFixed(1);
      report += `| ${i + 1} | ${dex} | ${count.toLocaleString()} | ${percentage}% |\n`;
    });

    report += `\n`;
  });

  report += `---

## 💡 关键结论

### 主力DEX (前5名)

`;

  topDexes.slice(0, 5).forEach(([dex, count], index) => {
    const percentage = ((count / totalUsage) * 100).toFixed(2);
    report += `${index + 1}. **${dex}**: ${count.toLocaleString()} 次 (${percentage}%)\n`;
  });

  report += `\n### 建议

1. **优先监控这 ${Math.min(5, topDexes.length)} 个DEX**，它们覆盖了大部分套利路径
2. 对于USDC和USDT这两个核心中间代币，确保覆盖前3个最常用的DEX
3. 使用Jupiter API可以动态获取这些DEX上的最优池子

---

**报告结束**
`;

  fs.writeFileSync('DEX_USAGE_SUMMARY.md', report, 'utf-8');
  console.log('📄 已生成简洁报告: DEX_USAGE_SUMMARY.md\n');
}

if (require.main === module) {
  summarizeDexUsage()
    .catch((error) => {
      console.error('❌ 错误:', error);
      process.exit(1);
    });
}

