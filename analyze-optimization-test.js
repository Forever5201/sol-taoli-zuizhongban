/**
 * 优化测试结果自动分析脚本
 * 
 * 用法: node analyze-optimization-test.js [log-file]
 * 默认: node analyze-optimization-test.js bot-console-output.txt
 */

const fs = require('fs');
const path = require('path');

// 获取日志文件路径
const logFile = process.argv[2] || 'bot-console-output.txt';

if (!fs.existsSync(logFile)) {
  console.error(`❌ 日志文件不存在: ${logFile}`);
  console.log('提示: 请确保机器人已经运行并生成了日志');
  process.exit(1);
}

console.log(`\n📊 分析日志文件: ${logFile}\n`);

// 读取日志
const logs = fs.readFileSync(logFile, 'utf-8');
const lines = logs.split('\n');

// === 1. Bundle 延迟统计 ===
console.log('═'.repeat(80));
console.log('1️⃣  Bundle 延迟统计');
console.log('═'.repeat(80));

const latencies = [];
const latencyRegex = /Latency:\s*(\d+)ms/g;
let match;
while ((match = latencyRegex.exec(logs)) !== null) {
  latencies.push(parseInt(match[1]));
}

if (latencies.length > 0) {
  const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const medianLatency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];

  console.log(`样本数量: ${latencies.length}`);
  console.log(`平均延迟: ${avgLatency.toFixed(0)}ms`);
  console.log(`中位数: ${medianLatency}ms`);
  console.log(`最小值: ${minLatency}ms`);
  console.log(`最大值: ${maxLatency}ms`);
  
  // 对比目标
  const target = 500;
  const baseline = 1300;
  const improvement = ((baseline - avgLatency) / baseline * 100).toFixed(1);
  
  console.log(`\n📈 对比分析:`);
  console.log(`  优化前基线: ${baseline}ms`);
  console.log(`  优化后平均: ${avgLatency.toFixed(0)}ms`);
  console.log(`  改善幅度: ${improvement}%`);
  console.log(`  目标延迟: ${target}ms`);
  console.log(`  达标状态: ${avgLatency < target * 1.2 ? '✅ 达标' : '⚠️ 未达标'} (允许 20% 误差)`);
  
  // 分布统计
  const under400 = latencies.filter(l => l < 400).length;
  const between400_600 = latencies.filter(l => l >= 400 && l < 600).length;
  const between600_800 = latencies.filter(l => l >= 600 && l < 800).length;
  const over800 = latencies.filter(l => l >= 800).length;
  
  console.log(`\n📊 延迟分布:`);
  console.log(`  < 400ms:     ${under400} (${(under400/latencies.length*100).toFixed(1)}%) ⚡ 极快`);
  console.log(`  400-600ms:   ${between400_600} (${(between400_600/latencies.length*100).toFixed(1)}%) ✅ 良好`);
  console.log(`  600-800ms:   ${between600_800} (${(between600_800/latencies.length*100).toFixed(1)}%) ⚠️ 一般`);
  console.log(`  > 800ms:     ${over800} (${(over800/latencies.length*100).toFixed(1)}%) ❌ 较慢`);
} else {
  console.log('⚠️ 未找到 Bundle 延迟数据');
  console.log('提示: 请确保机器人已经处理了至少一个机会');
}

// === 2. 并行构建时间统计 ===
console.log('\n' + '═'.repeat(80));
console.log('2️⃣  并行构建时间统计');
console.log('═'.repeat(80));

const buildTimes = [];
const buildRegex = /Parallel swap instructions built in (\d+)ms/g;
while ((match = buildRegex.exec(logs)) !== null) {
  buildTimes.push(parseInt(match[1]));
}

if (buildTimes.length > 0) {
  const avgBuild = buildTimes.reduce((a, b) => a + b) / buildTimes.length;
  const minBuild = Math.min(...buildTimes);
  const maxBuild = Math.max(...buildTimes);

  console.log(`样本数量: ${buildTimes.length}`);
  console.log(`平均构建时间: ${avgBuild.toFixed(0)}ms`);
  console.log(`最小值: ${minBuild}ms`);
  console.log(`最大值: ${maxBuild}ms`);
  
  const target = 300;
  console.log(`\n📈 对比分析:`);
  console.log(`  优化前基线: 200-500ms (串行)`);
  console.log(`  优化后平均: ${avgBuild.toFixed(0)}ms (并行)`);
  console.log(`  目标时间: < ${target}ms`);
  console.log(`  达标状态: ${avgBuild < target ? '✅ 达标' : '⚠️ 未达标'}`);
  
  // 预估节省时间
  const serialEstimate = avgBuild * 2; // 串行大约是并行的 2 倍
  const timeSaved = serialEstimate - avgBuild;
  console.log(`\n💰 优化收益:`);
  console.log(`  串行预估时间: ${serialEstimate.toFixed(0)}ms`);
  console.log(`  并行实际时间: ${avgBuild.toFixed(0)}ms`);
  console.log(`  节省时间: ${timeSaved.toFixed(0)}ms (~${(timeSaved/serialEstimate*100).toFixed(1)}%)`);
} else {
  console.log('⚠️ 未找到并行构建时间数据');
  console.log('提示: 请检查日志中是否有 "Parallel swap instructions built" 字样');
}

// === 3. WebSocket 订阅统计 ===
console.log('\n' + '═'.repeat(80));
console.log('3️⃣  WebSocket 订阅统计');
console.log('═'.repeat(80));

const wsUsage = (logs.match(/Using WebSocket subscription/g) || []).length;
const pollingUsage = (logs.match(/Using polling mode/g) || []).length;
const wsFallback = (logs.match(/falling back to polling/g) || []).length;

if (wsUsage + pollingUsage > 0) {
  const total = wsUsage + pollingUsage;
  const wsRate = (wsUsage / total * 100).toFixed(1);
  const pollingRate = (pollingUsage / total * 100).toFixed(1);
  
  console.log(`WebSocket 使用: ${wsUsage} 次 (${wsRate}%)`);
  console.log(`轮询模式使用: ${pollingUsage} 次 (${pollingRate}%)`);
  console.log(`WebSocket 失败回退: ${wsFallback} 次`);
  
  console.log(`\n📈 对比分析:`);
  console.log(`  目标使用率: > 80%`);
  console.log(`  实际使用率: ${wsRate}%`);
  console.log(`  达标状态: ${wsRate > 80 ? '✅ 达标' : wsRate > 60 ? '⚠️ 一般' : '❌ 较低'}`);
  
  if (wsRate > 80) {
    console.log(`  🎉 WebSocket 优化工作良好！实时订阅生效。`);
  } else if (wsRate > 60) {
    console.log(`  ⚠️ WebSocket 使用率偏低，但仍在工作。可能是网络波动。`);
  } else {
    console.log(`  ❌ WebSocket 使用率过低，建议检查 RPC 连接质量。`);
  }
  
  // 预估节省时间
  const avgPollingDelay = 100; // 轮询平均延迟 100ms
  const avgWsDelay = 10; // WebSocket 平均延迟 10ms
  const timeSaved = wsUsage * (avgPollingDelay - avgWsDelay);
  console.log(`\n💰 优化收益:`);
  console.log(`  通过 WebSocket 节省时间: ~${(timeSaved/1000).toFixed(1)}秒`);
  console.log(`  平均每次节省: ~${avgPollingDelay - avgWsDelay}ms`);
} else {
  console.log('⚠️ 未找到 WebSocket 或轮询使用数据');
  console.log('提示: 可能机器人还没有提交任何 Bundle');
}

// === 4. processed 确认级别使用统计 ===
console.log('\n' + '═'.repeat(80));
console.log('4️⃣  确认级别统计');
console.log('═'.repeat(80));

const processedCount = (logs.match(/status: processed/g) || []).length;
const confirmedCount = (logs.match(/status: confirmed/g) || []).length;

if (processedCount + confirmedCount > 0) {
  const total = processedCount + confirmedCount;
  const processedRate = (processedCount / total * 100).toFixed(1);
  
  console.log(`processed 级别: ${processedCount} 次 (${processedRate}%)`);
  console.log(`confirmed 级别: ${confirmedCount} 次 (${(100-processedRate).toFixed(1)}%)`);
  
  console.log(`\n📈 对比分析:`);
  console.log(`  优化前: 100% confirmed (需要 2/3 验证者确认)`);
  console.log(`  优化后: ${processedRate}% processed (更快确认)`);
  console.log(`  达标状态: ${processedRate > 50 ? '✅ 优化生效' : '⚠️ 大部分仍用 confirmed'}`);
  
  // 预估节省时间
  const timeSavedPerTx = 300; // processed 比 confirmed 快约 300ms
  const totalTimeSaved = processedCount * timeSavedPerTx;
  console.log(`\n💰 优化收益:`);
  console.log(`  每笔交易节省: ~${timeSavedPerTx}ms`);
  console.log(`  累计节省时间: ~${(totalTimeSaved/1000).toFixed(1)}秒`);
} else {
  console.log('⚠️ 未找到确认级别数据');
}

// === 5. 成功率统计 ===
console.log('\n' + '═'.repeat(80));
console.log('5️⃣  交易成功率统计');
console.log('═'.repeat(80));

const successCount = (logs.match(/Bundle landed successfully!/g) || []).length;
const failCount = (logs.match(/Bundle failed to land/g) || []).length;
const timeoutCount = (logs.match(/Bundle confirmation timeout/g) || []).length;

if (successCount + failCount + timeoutCount > 0) {
  const total = successCount + failCount + timeoutCount;
  const successRate = (successCount / total * 100).toFixed(1);
  
  console.log(`成功: ${successCount} 次 (${successRate}%)`);
  console.log(`失败: ${failCount} 次`);
  console.log(`超时: ${timeoutCount} 次`);
  
  console.log(`\n📈 对比分析:`);
  console.log(`  目标成功率: 80-95%`);
  console.log(`  实际成功率: ${successRate}%`);
  console.log(`  达标状态: ${successRate >= 80 ? '✅ 达标' : successRate >= 60 ? '⚠️ 偏低' : '❌ 过低'}`);
  
  if (successRate < 80) {
    console.log(`  ⚠️ 成功率低于预期，建议检查:`);
    console.log(`    - Jito Leader 调度是否正常`);
    console.log(`    - Tip 金额是否合理`);
    console.log(`    - 网络连接是否稳定`);
  }
} else {
  console.log('⚠️ 未找到交易成功/失败数据');
  console.log('提示: 可能还没有完成交易提交');
}

// === 6. 机会发现统计 ===
console.log('\n' + '═'.repeat(80));
console.log('6️⃣  机会发现统计');
console.log('═'.repeat(80));

const oppFound = (logs.match(/Opportunity found:/g) || []).length;
const oppValidated = (logs.match(/机会通过二次验证/g) || []).length;
const oppFiltered = (logs.match(/Opportunity expired on re-validation/g) || []).length;

console.log(`发现机会: ${oppFound} 个`);
console.log(`通过验证: ${oppValidated} 个 (${oppFound > 0 ? (oppValidated/oppFound*100).toFixed(1) : 0}%)`);
console.log(`验证过滤: ${oppFiltered} 个`);

// === 总结 ===
console.log('\n' + '═'.repeat(80));
console.log('📊 总体评估');
console.log('═'.repeat(80));

let score = 0;
let maxScore = 0;

// 评分项 1: 延迟改善
if (latencies.length > 0) {
  maxScore += 30;
  const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
  if (avgLatency < 500) score += 30;
  else if (avgLatency < 600) score += 25;
  else if (avgLatency < 800) score += 20;
  else score += 10;
}

// 评分项 2: 并行构建
if (buildTimes.length > 0) {
  maxScore += 20;
  const avgBuild = buildTimes.reduce((a, b) => a + b) / buildTimes.length;
  if (avgBuild < 250) score += 20;
  else if (avgBuild < 300) score += 17;
  else if (avgBuild < 400) score += 14;
  else score += 10;
}

// 评分项 3: WebSocket 使用率
if (wsUsage + pollingUsage > 0) {
  maxScore += 20;
  const wsRate = wsUsage / (wsUsage + pollingUsage);
  if (wsRate > 0.8) score += 20;
  else if (wsRate > 0.6) score += 15;
  else if (wsRate > 0.4) score += 10;
  else score += 5;
}

// 评分项 4: processed 使用
if (processedCount + confirmedCount > 0) {
  maxScore += 15;
  const processedRate = processedCount / (processedCount + confirmedCount);
  if (processedRate > 0.7) score += 15;
  else if (processedRate > 0.5) score += 12;
  else if (processedRate > 0.3) score += 8;
  else score += 5;
}

// 评分项 5: 成功率
if (successCount + failCount + timeoutCount > 0) {
  maxScore += 15;
  const successRate = successCount / (successCount + failCount + timeoutCount);
  if (successRate > 0.85) score += 15;
  else if (successRate > 0.75) score += 12;
  else if (successRate > 0.65) score += 9;
  else score += 5;
}

if (maxScore > 0) {
  const finalScore = (score / maxScore * 100).toFixed(0);
  console.log(`\n总体得分: ${score}/${maxScore} (${finalScore}分)`);
  
  if (finalScore >= 90) {
    console.log(`\n🎉 优化效果: 优秀！所有优化都工作良好。`);
    console.log(`   建议: 可以部署到生产环境。`);
  } else if (finalScore >= 75) {
    console.log(`\n✅ 优化效果: 良好！大部分优化生效。`);
    console.log(`   建议: 可以部署，但建议监控指标偏低的项目。`);
  } else if (finalScore >= 60) {
    console.log(`\n⚠️ 优化效果: 一般。部分优化未达预期。`);
    console.log(`   建议: 分析问题原因，调整后重新测试。`);
  } else {
    console.log(`\n❌ 优化效果: 较差。大部分优化未生效。`);
    console.log(`   建议: 检查代码实现和日志，可能需要回滚。`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log('分析完成！');
console.log('═'.repeat(80));
console.log(`\n详细测试指南: TEST_OPTIMIZATION_VERIFICATION.md`);
console.log(`优化实施文档: JITO_EXECUTION_OPTIMIZATION_COMPLETE.md\n`);

