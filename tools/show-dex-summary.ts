#!/usr/bin/env tsx
/**
 * 直接显示DEX使用总结
 */

import * as fs from 'fs';
import * as path from 'path';

async function showDexSummary() {
  // 尝试多个可能的位置
  const possiblePaths = [
    'packages/core/dex-pairs-data.json',
    'dex-pairs-data.json',
    '../packages/core/dex-pairs-data.json',
  ];

  let dataPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dataPath = p;
      break;
    }
  }

  if (!dataPath) {
    console.error('❌ 找不到 dex-pairs-data.json 文件');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log('\n' + '='.repeat(100));
  console.log('🏦 中间代币使用的DEX - 完整列表');
  console.log('='.repeat(100) + '\n');

  // 1. 所有DEX的总体使用情况
  console.log('## 📊 所有DEX使用频率排行榜\n');
  console.log('(所有中间代币在各DEX上的总使用次数)\n');

  const dexFrequency = data.dexFrequency;
  const totalUsage = dexFrequency.reduce((sum: number, [, count]: [string, number]) => sum + count, 0);

  dexFrequency.slice(0, 30).forEach(([dex, count]: [string, number], index: number) => {
    const percentage = ((count / totalUsage) * 100).toFixed(2);
    const bar = '█'.repeat(Math.floor(parseFloat(percentage) / 2));
    console.log(`${(index + 1).toString().padStart(3)}. ${dex.padEnd(30)} ${count.toLocaleString().padStart(10)} 次 (${percentage.padStart(6)}%) ${bar}`);
  });

  console.log(`\n总计: ${totalUsage.toLocaleString()} 次使用\n`);
  console.log('='.repeat(100) + '\n');

  // 2. 每个重要中间代币使用的DEX
  console.log('## 🪙 各中间代币使用的DEX详情\n');

  const tokenDexUsage = data.tokenDexUsage;
  const importantTokens = tokenDexUsage.filter((t: any) => t.totalUsage > 20);
  
  importantTokens.forEach((tokenUsage: any, index: number) => {
    console.log(`\n### ${index + 1}. ${tokenUsage.token}`);
    console.log(`\n代币地址: ${tokenUsage.tokenMint}`);
    console.log(`总使用次数: ${tokenUsage.totalUsage.toLocaleString()} 次\n`);
    console.log('使用的DEX:\n');

    const dexEntries = Object.entries(tokenUsage.topDexes) as [string, number][];
    const sortedDexes = dexEntries.sort((a, b) => b[1] - a[1]).slice(0, 15);

    sortedDexes.forEach(([dex, count], i) => {
      const percentage = ((count / tokenUsage.totalUsage) * 100).toFixed(1);
      const bar = '▓'.repeat(Math.floor(parseFloat(percentage) / 3));
      console.log(`  ${(i + 1).toString().padStart(3)}. ${dex.padEnd(30)} ${count.toLocaleString().padStart(8)} 次 (${percentage.padStart(6)}%) ${bar}`);
    });

    console.log('\n' + '-'.repeat(100));
  });

  console.log('\n' + '='.repeat(100));
  console.log('\n✅ 总结完成！\n');
}

if (require.main === module) {
  showDexSummary()
    .catch((error) => {
      console.error('❌ 错误:', error);
      process.exit(1);
    });
}

