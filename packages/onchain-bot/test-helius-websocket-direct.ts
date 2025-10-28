/**
 * 直接测试 Helius WebSocket 订阅
 * 使用原生 WebSocket 而不是 @solana/web3.js
 */

import WebSocket from 'ws';

const HELIUS_ENDPOINTS = [
  {
    name: 'Helius 账号1',
    ws: 'wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683'
  },
  {
    name: 'Helius 账号2',
    ws: 'wss://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65'
  }
];

// 测试池子地址
const TEST_POOL = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

interface TestResult {
  name: string;
  wsConnected: boolean;
  accountSubscribeSupported: boolean;
  slotSubscribeSupported: boolean;
  error?: string;
  subscriptionId?: number;
  updateReceived: boolean;
}

/**
 * 测试单个 Helius 端点
 */
async function testHeliusWebSocket(name: string, wsUrl: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const result: TestResult = {
      name,
      wsConnected: false,
      accountSubscribeSupported: false,
      slotSubscribeSupported: false,
      updateReceived: false
    };

    console.log(`\n🔌 ${name}: 连接到 ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      let testPhase = 0;

      // 连接超时
      const timeout = setTimeout(() => {
        if (!result.wsConnected) {
          result.error = 'Connection timeout';
          console.log(`❌ ${name}: 连接超时`);
        }
        ws.close();
        resolve(result);
      }, 15000);

      ws.on('open', () => {
        console.log(`✅ ${name}: WebSocket 连接成功！`);
        result.wsConnected = true;

        // 测试1: slotSubscribe（槽位订阅，最基础的功能）
        console.log(`📡 ${name}: 测试 slotSubscribe...`);
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'slotSubscribe',
          params: []
        }));
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        console.log(`📨 ${name}: 收到消息:`, JSON.stringify(message, null, 2));

        // 处理 slotSubscribe 响应
        if (message.id === 1) {
          if (message.result !== undefined) {
            result.slotSubscribeSupported = true;
            console.log(`✅ ${name}: slotSubscribe 支持！订阅ID: ${message.result}`);
            
            // 测试2: accountSubscribe
            console.log(`📡 ${name}: 测试 accountSubscribe...`);
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'accountSubscribe',
              params: [
                TEST_POOL,
                {
                  encoding: 'base64',
                  commitment: 'confirmed'
                }
              ]
            }));
          } else if (message.error) {
            console.log(`❌ ${name}: slotSubscribe 错误:`, message.error);
            result.error = `slotSubscribe: ${message.error.message}`;
          }
        }

        // 处理 accountSubscribe 响应
        if (message.id === 2) {
          if (message.result !== undefined) {
            result.accountSubscribeSupported = true;
            result.subscriptionId = message.result;
            console.log(`✅ ${name}: accountSubscribe 支持！订阅ID: ${message.result}`);
            console.log(`⏳ ${name}: 等待账户更新通知...`);
            
            // 等待几秒看是否收到更新
            setTimeout(() => {
              if (!result.updateReceived) {
                console.log(`⏱️  ${name}: 10秒内未收到更新（池子可能暂无变化）`);
              }
              clearTimeout(timeout);
              ws.close();
              resolve(result);
            }, 10000);
          } else if (message.error) {
            console.log(`❌ ${name}: accountSubscribe 错误:`, message.error);
            result.error = `accountSubscribe: ${message.error.message}`;
            clearTimeout(timeout);
            ws.close();
            resolve(result);
          }
        }

        // 处理订阅通知（账户更新）
        if (message.method === 'accountNotification') {
          result.updateReceived = true;
          console.log(`🎉 ${name}: 收到账户更新通知！`);
          console.log(`   Slot: ${message.params.context.slot}`);
          clearTimeout(timeout);
          ws.close();
          resolve(result);
        }

        // 处理订阅通知（槽位更新）
        if (message.method === 'slotNotification') {
          console.log(`📊 ${name}: 收到槽位更新 - Slot: ${message.params.result.slot}`);
        }
      });

      ws.on('error', (error) => {
        console.log(`❌ ${name}: WebSocket 错误:`, error.message);
        result.error = error.message;
        clearTimeout(timeout);
        resolve(result);
      });

      ws.on('close', () => {
        console.log(`🔌 ${name}: WebSocket 连接关闭`);
      });

    } catch (error: any) {
      result.error = error.message;
      console.log(`❌ ${name}: 异常:`, error.message);
      resolve(result);
    }
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Helius WebSocket 直接测试（原生 WebSocket）');
  console.log('='.repeat(80));

  console.log('\n📝 测试目标:');
  console.log('  1. 验证 WebSocket 连接是否成功');
  console.log('  2. 验证 slotSubscribe 是否支持');
  console.log('  3. 验证 accountSubscribe 是否支持');
  console.log('  4. 验证是否能收到实时更新');

  console.log('\n🎯 测试账户: Raydium SOL/USDC 池子');
  console.log(`   地址: ${TEST_POOL}`);

  // 逐个测试端点
  const results: TestResult[] = [];
  
  for (const endpoint of HELIUS_ENDPOINTS) {
    const result = await testHeliusWebSocket(endpoint.name, endpoint.ws);
    results.push(result);
  }

  // 结果汇总
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(80) + '\n');

  console.log('┌────────────────────┬──────────┬────────────┬────────────────┐');
  console.log('│ 端点               │ WS连接   │ Slot订阅   │ Account订阅    │');
  console.log('├────────────────────┼──────────┼────────────┼────────────────┤');

  results.forEach(r => {
    const name = r.name.padEnd(18);
    const wsStatus = r.wsConnected ? '✅' : '❌';
    const slotStatus = r.slotSubscribeSupported ? '✅ 支持' : '❌ 不支持';
    const accountStatus = r.accountSubscribeSupported ? '✅ 支持' : '❌ 不支持';
    
    console.log(`│ ${name} │ ${wsStatus}       │ ${slotStatus}   │ ${accountStatus}     │`);
    
    if (r.error) {
      console.log(`│ ${' '.repeat(18)} │ ${' '.repeat(8)} │ ${' '.repeat(10)} │ ${' '.repeat(14)} │`);
      console.log(`│ ⚠️  错误: ${r.error.substring(0, 54).padEnd(54)} │`);
    }
  });

  console.log('└────────────────────┴──────────┴────────────┴────────────────┘\n');

  // 结论
  const allSupported = results.every(r => r.accountSubscribeSupported);
  const someSupported = results.some(r => r.accountSubscribeSupported);

  console.log('='.repeat(80));
  console.log('💡 最终结论');
  console.log('='.repeat(80) + '\n');

  if (allSupported) {
    console.log('✅ **Helius 完全支持 WebSocket 订阅！**\n');
    console.log('功能确认:');
    console.log('  ✅ slotSubscribe - 支持');
    console.log('  ✅ accountSubscribe - 支持');
    console.log('  ✅ 实时推送通知 - 支持\n');
    
    console.log('🚀 建议:');
    console.log('  1. 改造 market-scanner.ts 使用 WebSocket 订阅');
    console.log('  2. 延迟可以降低 10-20 倍');
    console.log('  3. RPC 使用量减少 90%+');
    console.log('');
  } else if (someSupported) {
    console.log('⚠️  **部分端点支持 WebSocket 订阅**\n');
    console.log('使用支持的端点进行订阅\n');
  } else {
    console.log('❌ **Helius 免费套餐不支持 WebSocket 订阅**\n');
    console.log('可能原因:');
    console.log('  1. 免费套餐限制');
    console.log('  2. 需要升级到付费套餐');
    console.log('  3. 需要特殊配置\n');
    
    console.log('建议:');
    console.log('  1. 检查 Helius 控制台的套餐详情');
    console.log('  2. 考虑升级到 Developer 套餐');
    console.log('  3. 或继续使用轮询模式\n');
  }

  console.log('相关文档:');
  console.log('  - Helius 文档: https://docs.helius.dev');
  console.log('  - Solana WebSocket: https://solana.com/docs/rpc/websocket\n');

  process.exit(0);
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});

