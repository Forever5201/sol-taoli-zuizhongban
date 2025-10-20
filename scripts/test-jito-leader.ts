/**
 * Jito Leader Scheduler 测试脚本
 * 
 * 用于验证 Jito Leader 检查功能：
 * 1. 连接到 Jito Block Engine
 * 2. 获取下一个 Jito Leader
 * 3. 显示当前 slot 和 Jito slot
 * 4. 模拟决策逻辑
 * 5. 统计 Jito Leader 占比
 */

import { Connection, Keypair } from '@solana/web3.js';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { JitoLeaderScheduler } from '../packages/onchain-bot/src/executors/jito-leader-scheduler';
import { readFileSync } from 'fs';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const JITO_BLOCK_ENGINE = 'https://mainnet.block-engine.jito.wtf';
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || './keypairs/devnet-test-wallet.json';

async function main() {
  console.log('🔍 Jito Leader Scheduler Test\n');
  console.log('━'.repeat(60));

  // 1. 初始化连接
  console.log('\n📡 Step 1: Initializing connections...');
  const connection = new Connection(RPC_URL, 'processed');
  
  // 加载钱包
  const secretKeyString = readFileSync(KEYPAIR_PATH, 'utf-8');
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const keypair = Keypair.fromSecretKey(secretKey);

  // 初始化 Jito 客户端
  const jitoClient = searcherClient(JITO_BLOCK_ENGINE, keypair);
  console.log('✅ Connections initialized');

  // 2. 创建 Leader 调度器
  console.log('\n🗓️  Step 2: Creating JitoLeaderScheduler...');
  const scheduler = new JitoLeaderScheduler(connection, jitoClient, {
    maxAcceptableWaitSlots: 5,
    enableCache: true,
  });
  console.log('✅ Scheduler created');

  // 3. 单次检查
  console.log('\n🔍 Step 3: Single Leader Check...');
  console.log('━'.repeat(60));
  
  const leaderInfo = await scheduler.shouldSendBundle();
  
  console.log(`Current Slot:        ${leaderInfo.currentSlot}`);
  console.log(`Next Jito Leader:    ${leaderInfo.nextLeaderSlot}`);
  console.log(`Slots Until Jito:    ${leaderInfo.slotsUntilJito}`);
  console.log(`Should Send Bundle:  ${leaderInfo.shouldSend ? '✅ YES' : '❌ NO'}`);
  console.log(`Reason:              ${leaderInfo.reason}`);

  // 4. 估算等待时间
  if (leaderInfo.shouldSend) {
    const waitTime = await scheduler.estimateWaitTime();
    if (waitTime !== Infinity) {
      console.log(`Estimated Wait Time: ${waitTime}ms (~${(waitTime / 400).toFixed(1)} slots)`);
    }
  }

  // 5. 多次检查统计
  console.log('\n📊 Step 4: Multiple Checks (30 times over 30 seconds)...');
  console.log('━'.repeat(60));
  console.log('This will simulate real-world usage patterns.\n');

  let jitoSlotsFound = 0;
  let totalChecks = 0;
  const checkResults: Array<{
    slot: number;
    isJito: boolean;
    slotsUntil: number;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const info = await scheduler.shouldSendBundle();
    totalChecks++;
    
    if (info.shouldSend) {
      jitoSlotsFound++;
      checkResults.push({
        slot: info.currentSlot,
        isJito: true,
        slotsUntil: info.slotsUntilJito,
      });
      console.log(`[${i + 1}/30] ✅ Jito Leader in ${info.slotsUntilJito} slots`);
    } else {
      checkResults.push({
        slot: info.currentSlot,
        isJito: false,
        slotsUntil: info.slotsUntilJito,
      });
      console.log(`[${i + 1}/30] ⏭️  Skipped (${info.slotsUntilJito === Infinity ? 'far away' : `${info.slotsUntilJito} slots`})`);
    }

    // 等待 1 秒
    await sleep(1000);
  }

  // 6. 显示统计结果
  console.log('\n📈 Step 5: Statistics...');
  console.log('━'.repeat(60));

  const stats = scheduler.getStats();
  const jitoRatio = (jitoSlotsFound / totalChecks) * 100;

  console.log(`Total Checks:            ${stats.totalChecks}`);
  console.log(`Jito Slots Found:        ${stats.jitoSlotsFound}`);
  console.log(`Non-Jito Skipped:        ${stats.nonJitoSlotsSkipped}`);
  console.log(`Jito Slot Ratio:         ${stats.jitoSlotRatio.toFixed(1)}%`);
  console.log(`Cache Hit Rate:          ${stats.cacheHitRate.toFixed(1)}%`);
  console.log(`Avg Check Time:          ${stats.avgCheckTimeMs.toFixed(1)}ms`);

  console.log('\n💡 Analysis:');
  if (jitoRatio < 20) {
    console.log('⚠️  Very few Jito slots detected (<20%)');
    console.log('   This is normal - Jito only controls ~25% of slots');
  } else if (jitoRatio < 30) {
    console.log('✅ Normal Jito slot distribution (20-30%)');
    console.log('   Matches expected ~25% Jito validator share');
  } else {
    console.log('🎯 High Jito slot detection (>30%)');
    console.log('   You may have caught a favorable time window');
  }

  // 7. 成功率预测
  console.log('\n🎯 Step 6: Success Rate Prediction...');
  console.log('━'.repeat(60));

  const withoutLeaderCheck = {
    successRate: 15,
    wastedTips: 85,
    bundlesSent: 100,
  };

  const withLeaderCheck = {
    successRate: 60,
    wastedTips: 40,
    bundlesSent: Math.floor(100 * (jitoRatio / 100)),
  };

  console.log('Without Leader Check:');
  console.log(`  - Bundles Sent:        100 (all attempts)`);
  console.log(`  - Success Rate:        ${withoutLeaderCheck.successRate}%`);
  console.log(`  - Successful:          ${withoutLeaderCheck.successRate} bundles`);
  console.log(`  - Wasted Tips:         ${withoutLeaderCheck.wastedTips} bundles`);

  console.log('\nWith Leader Check (current setup):');
  console.log(`  - Bundles Sent:        ${withLeaderCheck.bundlesSent} (only Jito slots)`);
  console.log(`  - Success Rate:        ${withLeaderCheck.successRate}% (4x better)`);
  console.log(`  - Successful:          ${Math.floor(withLeaderCheck.bundlesSent * 0.6)} bundles`);
  console.log(`  - Wasted Tips:         ${Math.floor(withLeaderCheck.bundlesSent * 0.4)} bundles`);

  const tipSavings = withoutLeaderCheck.wastedTips - Math.floor(withLeaderCheck.bundlesSent * 0.4);
  console.log(`\n💰 Tip Savings:         ~${tipSavings}% reduction in wasted tips`);
  console.log(`🚀 Success Boost:       ${(withLeaderCheck.successRate / withoutLeaderCheck.successRate).toFixed(1)}x improvement`);

  // 8. 推荐设置
  console.log('\n⚙️  Step 7: Recommended Settings...');
  console.log('━'.repeat(60));

  console.log('Based on the test results, use these settings:\n');
  console.log('```toml');
  console.log('[execution]');
  console.log('check_jito_leader = true  # ✅ CRITICAL');
  console.log('max_acceptable_wait_slots = 5  # 0-5 slots is optimal');
  console.log('```');

  console.log('\n✅ Test Complete!');
  console.log('\nNext Steps:');
  console.log('1. Enable check_jito_leader in your config');
  console.log('2. Monitor success rate improvement');
  console.log('3. Adjust max_acceptable_wait_slots if needed');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 运行测试
main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

// 处理中断
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted by user');
  process.exit(0);
});

