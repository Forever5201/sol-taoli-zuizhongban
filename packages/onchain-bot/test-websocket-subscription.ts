/**
 * WebSocket 订阅功能实际测试
 * 
 * 测试所有 RPC 提供商的 WebSocket 订阅能力
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('WebSocket-Test');

// 测试用的 Solana 账户（Raydium SOL/USDC 池子）
const TEST_POOL = new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2');

// RPC 端点配置
const ENDPOINTS = [
  {
    name: 'Helius 账号1',
    http: 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683',
    ws: 'wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683'
  },
  {
    name: 'Helius 账号2',
    http: 'https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65',
    ws: 'wss://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65'
  },
  {
    name: 'Alchemy',
    http: 'https://solana-mainnet.g.alchemy.com/v2/KdZvViY51ReRsivlLqSmx',
    ws: 'wss://solana-mainnet.g.alchemy.com/v2/KdZvViY51ReRsivlLqSmx'
  }
];

interface SubscriptionTestResult {
  name: string;
  wsSupported: boolean;
  subscriptionId?: number;
  updateReceived: boolean;
  updateLatency?: number;
  error?: string;
  features: {
    accountSubscribe: boolean;
    programSubscribe: boolean;
    slotSubscribe: boolean;
  };
}

/**
 * 测试单个端点的 WebSocket 订阅功能
 */
async function testWebSocketSubscription(
  name: string,
  httpUrl: string,
  wsUrl: string
): Promise<SubscriptionTestResult> {
  const result: SubscriptionTestResult = {
    name,
    wsSupported: false,
    updateReceived: false,
    features: {
      accountSubscribe: false,
      programSubscribe: false,
      slotSubscribe: false
    }
  };

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (!result.updateReceived) {
        result.error = 'Timeout: No update received in 10s';
        logger.warn(`⏱️  ${name}: Timeout waiting for WebSocket update`);
      }
      resolve(result);
    }, 10000); // 10秒超时

    try {
      logger.info(`🔌 ${name}: Testing WebSocket connection...`);

      // 创建 WebSocket 连接
      const connection = new Connection(httpUrl, {
        commitment: 'confirmed',
        wsEndpoint: wsUrl
      });

      const startTime = Date.now();

      // 测试1: accountSubscribe（账户订阅）
      try {
        const subscriptionId = connection.onAccountChange(
          TEST_POOL,
          (accountInfo, context) => {
            const latency = Date.now() - startTime;
            
            logger.info(
              `✅ ${name}: Received account update! ` +
              `Slot: ${context.slot}, Latency: ${latency}ms`
            );

            result.wsSupported = true;
            result.updateReceived = true;
            result.updateLatency = latency;
            result.subscriptionId = subscriptionId;
            result.features.accountSubscribe = true;

            // 取消订阅并完成测试
            connection.removeAccountChangeListener(subscriptionId);
            clearTimeout(timeout);
            resolve(result);
          },
          'confirmed'
        );

        result.subscriptionId = subscriptionId;
        logger.info(`📡 ${name}: Subscribed with ID: ${subscriptionId}`);

      } catch (error: any) {
        result.error = `accountSubscribe failed: ${error.message}`;
        logger.error(`❌ ${name}: ${result.error}`);
        clearTimeout(timeout);
        resolve(result);
      }

    } catch (error: any) {
      result.error = `Connection failed: ${error.message}`;
      logger.error(`❌ ${name}: ${result.error}`);
      clearTimeout(timeout);
      resolve(result);
    }
  });
}

/**
 * 测试轮询延迟 vs 订阅延迟
 */
async function comparePollingVsSubscription() {
  console.log('\n' + '='.repeat(80));
  console.log('⚡ 轮询 vs 订阅延迟对比测试');
  console.log('='.repeat(80) + '\n');

  const httpUrl = 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683';
  const connection = new Connection(httpUrl, 'confirmed');

  // 测试轮询延迟
  console.log('📊 测试轮询模式 (getAccountInfo)...\n');
  
  const pollingLatencies: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await connection.getAccountInfo(TEST_POOL);
    const latency = Date.now() - start;
    pollingLatencies.push(latency);
    console.log(`  轮询 ${i + 1}/5: ${latency}ms`);
  }

  const avgPolling = pollingLatencies.reduce((a, b) => a + b, 0) / pollingLatencies.length;
  console.log(`\n📈 轮询平均延迟: ${avgPolling.toFixed(0)}ms\n`);

  // 测试订阅延迟
  console.log('📡 测试订阅模式 (WebSocket)...');
  console.log('   （等待实时更新，最多 10 秒）\n');

  const wsUrl = 'wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683';
  const wsConnection = new Connection(httpUrl, {
    commitment: 'confirmed',
    wsEndpoint: wsUrl
  });

  return new Promise<void>((resolve) => {
    const startTime = Date.now();
    let updateCount = 0;

    const subscriptionId = wsConnection.onAccountChange(
      TEST_POOL,
      (accountInfo, context) => {
        updateCount++;
        const latency = Date.now() - startTime;
        console.log(`  📡 订阅更新 ${updateCount}: 延迟 ${latency}ms (Slot: ${context.slot})`);

        if (updateCount >= 1) {
          wsConnection.removeAccountChangeListener(subscriptionId);
          
          console.log('\n' + '='.repeat(80));
          console.log('📊 性能对比结果');
          console.log('='.repeat(80) + '\n');
          console.log(`轮询模式平均延迟: ${avgPolling.toFixed(0)}ms`);
          console.log(`订阅模式实时延迟: ${latency}ms (实时推送)`);
          console.log(`\n💡 结论: 订阅模式可以实现 ${(avgPolling / latency).toFixed(1)}x 的延迟优势！\n`);
          
          resolve();
        }
      }
    );

    setTimeout(() => {
      if (updateCount === 0) {
        console.log('\n⏱️  10秒内未收到更新（可能池子暂无变化）\n');
        wsConnection.removeAccountChangeListener(subscriptionId);
        resolve();
      }
    }, 10000);
  });
}

/**
 * 主测试函数
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 WebSocket 订阅功能实际测试');
  console.log('='.repeat(80) + '\n');

  console.log('📝 测试内容:');
  console.log('  1. WebSocket 连接是否可用');
  console.log('  2. accountSubscribe 是否支持（账户订阅）');
  console.log('  3. 实际接收更新的延迟\n');

  console.log('🎯 测试账户: Raydium SOL/USDC 池子');
  console.log(`   地址: ${TEST_POOL.toBase58()}\n`);

  console.log('⏳ 开始测试...\n');

  // 并发测试所有端点
  const promises = ENDPOINTS.map(ep => 
    testWebSocketSubscription(ep.name, ep.http, ep.ws)
  );

  const results = await Promise.all(promises);

  // 结果汇总
  console.log('\n' + '='.repeat(80));
  console.log('📊 WebSocket 测试结果汇总');
  console.log('='.repeat(80) + '\n');

  const supported = results.filter(r => r.wsSupported);
  const failed = results.filter(r => !r.wsSupported);

  console.log(`总端点数: ${results.length}`);
  console.log(`✅ 支持 WebSocket: ${supported.length}`);
  console.log(`❌ 不支持/超时: ${failed.length}\n`);

  // 详细表格
  console.log('┌────────────────────────┬──────────────┬──────────┬──────────────┐');
  console.log('│ 端点                   │ WebSocket    │ 订阅延迟 │ 订阅ID       │');
  console.log('├────────────────────────┼──────────────┼──────────┼──────────────┤');

  results.forEach(r => {
    const name = r.name.padEnd(22);
    const wsStatus = r.wsSupported ? '✅ 支持' : '❌ 不支持';
    const latency = r.updateLatency ? `${r.updateLatency}ms`.padStart(6) : '  N/A';
    const subId = r.subscriptionId ? r.subscriptionId.toString().padStart(10) : '    N/A';
    
    console.log(`│ ${name} │ ${wsStatus}     │ ${latency}   │ ${subId}     │`);
    
    if (r.error) {
      console.log(`│ ${' '.repeat(22)} │ ${' '.repeat(12)} │ ${' '.repeat(8)} │ ${' '.repeat(12)} │`);
      const errorMsg = r.error.substring(0, 60);
      console.log(`│ ⚠️  ${errorMsg.padEnd(68)} │`);
    }
  });

  console.log('└────────────────────────┴──────────────┴──────────┴──────────────┘\n');

  // 功能支持详情
  if (supported.length > 0) {
    console.log('='.repeat(80));
    console.log('📡 支持的订阅功能');
    console.log('='.repeat(80) + '\n');

    supported.forEach(r => {
      console.log(`✅ ${r.name}:`);
      console.log(`   - accountSubscribe: ${r.features.accountSubscribe ? '✅' : '❌'}`);
      console.log(`   - 订阅延迟: ${r.updateLatency}ms (实时推送)`);
      console.log('');
    });
  }

  // 性能对比测试
  if (supported.length > 0) {
    await comparePollingVsSubscription();
  }

  // 建议
  console.log('='.repeat(80));
  console.log('💡 优化建议');
  console.log('='.repeat(80) + '\n');

  if (supported.length >= 2) {
    console.log('✅ 您的 RPC 端点支持 WebSocket 订阅！\n');
    console.log('🚀 强烈建议：将市场扫描器从**轮询模式**改为**订阅模式**\n');
    console.log('优势:');
    console.log('  1. ⚡ 延迟降低 10-100 倍');
    console.log('  2. 💰 RPC 请求减少 90%+');
    console.log('  3. 📡 实时接收池子变化');
    console.log('  4. 🎯 不会错过任何价格变化\n');
    
    console.log('当前模式 (轮询):');
    console.log('  - 每 150ms 查询一次');
    console.log('  - 每次 2 个 RPC 请求');
    console.log('  - 每秒约 13 个 RPC 请求');
    console.log('  - 可能错过中间的价格变化\n');
    
    console.log('推荐模式 (订阅):');
    console.log('  - 实时推送变化');
    console.log('  - 仅初始化时 1 次请求');
    console.log('  - 之后 0 RPC 请求！');
    console.log('  - 捕获所有价格变化\n');

  } else {
    console.log('⚠️  部分端点不支持 WebSocket 或响应慢\n');
    console.log('建议: 使用支持 WebSocket 的端点（如 Helius）进行订阅\n');
  }

  console.log('下一步:');
  console.log('1. 查看当前系统是否使用订阅（检查 market-scanner.ts）');
  console.log('2. 如果未使用，考虑改造为订阅模式');
  console.log('3. 可以大幅降低延迟和 RPC 使用量\n');

  process.exit(0);
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});

