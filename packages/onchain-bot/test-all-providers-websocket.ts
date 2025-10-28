/**
 * 测试所有 RPC 提供商的 WebSocket 订阅支持
 * 直接使用原生 WebSocket 测试
 */

import WebSocket from 'ws';

// 测试池子地址
const TEST_POOL = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

const PROVIDERS = [
  {
    name: 'QuickNode',
    note: '需要完整 URL，这里尝试常见格式',
    endpoints: [
      'wss://api.quicknode.com/solana/mainnet/QN_e8ae6d6aa11f486895510c87b2178516',
      'wss://solana-mainnet.quiknode.pro/QN_e8ae6d6aa11f486895510c87b2178516'
    ]
  },
  {
    name: 'Alchemy',
    note: 'Alchemy Solana WebSocket',
    endpoints: [
      'wss://solana-mainnet.g.alchemy.com/v2/KdZvViY51ReRsivlLqSmx'
    ]
  },
  {
    name: 'Ankr',
    note: 'Ankr Solana WebSocket',
    endpoints: [
      'wss://rpc.ankr.com/solana/747ee7dc0a4f55bc0674bbee2040acc87f826a3335ea4fa72d72a40bcc909f42',
      'wss://rpc.ankr.com/solana'
    ]
  },
  {
    name: 'Helius 账号1 (对照组)',
    note: '已验证支持',
    endpoints: [
      'wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683'
    ]
  }
];

interface TestResult {
  provider: string;
  endpoint: string;
  wsConnected: boolean;
  slotSubscribeSupported: boolean;
  accountSubscribeSupported: boolean;
  realtimeUpdates: boolean;
  error?: string;
  connectionTime?: number;
  subscriptionIds?: {
    slot?: number;
    account?: number;
  };
}

/**
 * 测试单个端点的 WebSocket 功能
 */
async function testWebSocketEndpoint(
  provider: string,
  endpoint: string,
  note?: string
): Promise<TestResult> {
  return new Promise((resolve) => {
    const result: TestResult = {
      provider,
      endpoint,
      wsConnected: false,
      slotSubscribeSupported: false,
      accountSubscribeSupported: false,
      realtimeUpdates: false,
      subscriptionIds: {}
    };

    const startTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔌 ${provider}`);
    console.log(`   端点: ${endpoint}`);
    if (note) console.log(`   说明: ${note}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const ws = new WebSocket(endpoint);
      let slotUpdateCount = 0;
      let accountUpdateCount = 0;

      const timeout = setTimeout(() => {
        console.log(`⏱️  ${provider}: 测试超时（15秒）\n`);
        if (result.wsConnected) {
          result.error = 'Timeout - no subscription response';
        } else {
          result.error = 'Connection timeout';
        }
        ws.close();
        resolve(result);
      }, 15000);

      ws.on('open', () => {
        const connectionTime = Date.now() - startTime;
        result.wsConnected = true;
        result.connectionTime = connectionTime;
        console.log(`✅ WebSocket 连接成功！(${connectionTime}ms)\n`);

        // 测试1: slotSubscribe
        console.log(`📡 测试 slotSubscribe...`);
        try {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'slotSubscribe',
            params: []
          }));
        } catch (e: any) {
          console.log(`❌ 发送 slotSubscribe 失败: ${e.message}\n`);
          result.error = `Send failed: ${e.message}`;
          clearTimeout(timeout);
          ws.close();
          resolve(result);
        }
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          // 响应 slotSubscribe
          if (message.id === 1) {
            if (message.result !== undefined) {
              result.slotSubscribeSupported = true;
              result.subscriptionIds!.slot = message.result;
              console.log(`✅ slotSubscribe 支持！订阅ID: ${message.result}\n`);

              // 测试2: accountSubscribe
              console.log(`📡 测试 accountSubscribe...`);
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
              console.log(`❌ slotSubscribe 错误: ${JSON.stringify(message.error)}\n`);
              result.error = `slotSubscribe: ${message.error.message}`;
              clearTimeout(timeout);
              ws.close();
              resolve(result);
            }
          }

          // 响应 accountSubscribe
          if (message.id === 2) {
            if (message.result !== undefined) {
              result.accountSubscribeSupported = true;
              result.subscriptionIds!.account = message.result;
              console.log(`✅ accountSubscribe 支持！订阅ID: ${message.result}\n`);
              console.log(`⏳ 等待实时更新通知...（5秒）\n`);

              // 等待实时更新
              setTimeout(() => {
                console.log(`📊 统计:`);
                console.log(`   Slot 更新: ${slotUpdateCount} 次`);
                console.log(`   Account 更新: ${accountUpdateCount} 次\n`);
                
                if (slotUpdateCount > 0) {
                  result.realtimeUpdates = true;
                }
                
                clearTimeout(timeout);
                ws.close();
                resolve(result);
              }, 5000);
            } else if (message.error) {
              console.log(`❌ accountSubscribe 错误: ${JSON.stringify(message.error)}\n`);
              result.error = `accountSubscribe: ${message.error.message}`;
              clearTimeout(timeout);
              ws.close();
              resolve(result);
            }
          }

          // 实时通知：slot 更新
          if (message.method === 'slotNotification') {
            slotUpdateCount++;
            if (slotUpdateCount <= 3) {
              console.log(`📊 Slot 更新 #${slotUpdateCount}: ${message.params.result.slot}`);
            } else if (slotUpdateCount === 4) {
              console.log(`📊 ... (继续接收 slot 更新)`);
            }
          }

          // 实时通知：account 更新
          if (message.method === 'accountNotification') {
            accountUpdateCount++;
            console.log(`🎉 Account 更新 #${accountUpdateCount}: Slot ${message.params.context.slot}`);
          }

        } catch (e: any) {
          console.log(`⚠️  解析消息失败: ${e.message}`);
        }
      });

      ws.on('error', (error: Error) => {
        console.log(`❌ WebSocket 错误: ${error.message}\n`);
        result.error = error.message;
        clearTimeout(timeout);
        resolve(result);
      });

      ws.on('close', (code, reason) => {
        console.log(`🔌 连接关闭 (code: ${code})\n`);
      });

    } catch (error: any) {
      console.log(`❌ 异常: ${error.message}\n`);
      result.error = error.message;
      resolve(result);
    }
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 全面 WebSocket 订阅功能测试');
  console.log('='.repeat(80));

  console.log('\n📝 测试提供商:');
  console.log('  1. QuickNode (多种 URL 格式)');
  console.log('  2. Alchemy');
  console.log('  3. Ankr');
  console.log('  4. Helius (对照组)');

  console.log('\n🎯 测试内容:');
  console.log('  - WebSocket 连接');
  console.log('  - slotSubscribe (槽位订阅)');
  console.log('  - accountSubscribe (账户订阅)');
  console.log('  - 实时推送通知');

  console.log('\n🏊 测试账户: Raydium SOL/USDC 池子');
  console.log(`   ${TEST_POOL}\n`);

  const allResults: TestResult[] = [];

  // 测试所有提供商
  for (const provider of PROVIDERS) {
    for (const endpoint of provider.endpoints) {
      const result = await testWebSocketEndpoint(provider.name, endpoint, provider.note);
      allResults.push(result);
      
      // 如果成功，跳过同一提供商的其他端点
      if (result.accountSubscribeSupported) {
        console.log(`✅ ${provider.name} 验证成功，跳过其他端点\n`);
        break;
      }
    }
  }

  // 汇总结果
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(80) + '\n');

  console.log('┌──────────────────────┬────────┬──────────┬──────────┬──────────┐');
  console.log('│ 提供商               │ WS连接 │ Slot订阅 │ Acc订阅  │ 实时推送 │');
  console.log('├──────────────────────┼────────┼──────────┼──────────┼──────────┤');

  allResults.forEach(r => {
    const provider = r.provider.padEnd(20);
    const ws = r.wsConnected ? '✅' : '❌';
    const slot = r.slotSubscribeSupported ? '✅' : '❌';
    const account = r.accountSubscribeSupported ? '✅' : '❌';
    const realtime = r.realtimeUpdates ? '✅' : '❌';

    console.log(`│ ${provider} │ ${ws}     │ ${slot}       │ ${account}       │ ${realtime}       │`);
    
    if (r.error && !r.accountSubscribeSupported) {
      console.log(`│ ${' '.repeat(20)} │ ${' '.repeat(6)} │ ${' '.repeat(8)} │ ${' '.repeat(8)} │ ${' '.repeat(8)} │`);
      const errorMsg = r.error.substring(0, 50);
      console.log(`│ ⚠️  ${errorMsg.padEnd(64)} │`);
    }
  });

  console.log('└──────────────────────┴────────┴──────────┴──────────┴──────────┘\n');

  // 按提供商分组统计
  const providerStats = new Map<string, { success: boolean; endpoint?: string }>();
  
  allResults.forEach(r => {
    const providerName = r.provider.replace(/ \(.*\)/, ''); // 去掉备注
    if (!providerStats.has(providerName) || r.accountSubscribeSupported) {
      providerStats.set(providerName, {
        success: r.accountSubscribeSupported,
        endpoint: r.accountSubscribeSupported ? r.endpoint : undefined
      });
    }
  });

  console.log('='.repeat(80));
  console.log('🏆 提供商支持情况');
  console.log('='.repeat(80) + '\n');

  const supported: string[] = [];
  const unsupported: string[] = [];

  providerStats.forEach((stats, provider) => {
    if (stats.success) {
      supported.push(provider);
      console.log(`✅ ${provider}: 完全支持 WebSocket 订阅`);
      console.log(`   端点: ${stats.endpoint}\n`);
    } else {
      unsupported.push(provider);
      console.log(`❌ ${provider}: 不支持或连接失败\n`);
    }
  });

  // 最终建议
  console.log('='.repeat(80));
  console.log('💡 推荐配置');
  console.log('='.repeat(80) + '\n');

  if (supported.length > 0) {
    console.log(`✅ 发现 ${supported.length} 个支持 WebSocket 的提供商！\n`);
    console.log('推荐配置（按测试顺序）：\n');
    
    console.log('[rpc]');
    console.log('# HTTP 端点（用于初始查询和批量操作）');
    console.log('urls = [');
    
    const recommendedHTTP = allResults
      .filter(r => r.accountSubscribeSupported)
      .map(r => {
        if (r.endpoint.includes('helius')) {
          return r.endpoint.replace('wss://', 'https://');
        } else if (r.endpoint.includes('alchemy')) {
          return r.endpoint.replace('wss://', 'https://');
        } else if (r.endpoint.includes('ankr')) {
          return r.endpoint.replace('wss://', 'https://');
        } else if (r.endpoint.includes('quicknode')) {
          return r.endpoint.replace('wss://', 'https://');
        }
        return null;
      })
      .filter(Boolean);
    
    recommendedHTTP.forEach(url => {
      console.log(`  "${url}",`);
    });
    console.log(']\n');

    console.log('# WebSocket 端点（用于实时订阅）');
    console.log('[websocket]');
    console.log('enabled = true');
    
    const primaryWS = allResults.find(r => r.accountSubscribeSupported);
    if (primaryWS) {
      console.log(`primary = "${primaryWS.endpoint}"`);
    }
    
    const backupWS = allResults.filter(r => r.accountSubscribeSupported).slice(1, 2);
    if (backupWS.length > 0) {
      console.log(`backup = "${backupWS[0].endpoint}"`);
    }
    console.log('\n');

    console.log('🚀 性能预期:');
    console.log('  - 延迟: <100ms (WebSocket 实时推送)');
    console.log('  - RPC 使用: 仅初始化时使用');
    console.log('  - 实时性: 捕获 100% 价格变化');
    console.log('  - 成本: 免费（在套餐限额内）\n');

  } else {
    console.log('❌ 没有发现支持 WebSocket 的提供商\n');
    console.log('可能原因:');
    console.log('  1. 需要从提供商控制台获取正确的 WebSocket URL');
    console.log('  2. 免费套餐可能不支持 WebSocket');
    console.log('  3. 需要特殊配置或权限\n');
    
    console.log('建议:');
    console.log('  1. 检查各提供商的控制台和文档');
    console.log('  2. 验证 API Key 权限');
    console.log('  3. 考虑升级到付费套餐\n');
  }

  console.log('='.repeat(80));
  console.log('📚 相关文档');
  console.log('='.repeat(80) + '\n');
  console.log('  - QuickNode: https://www.quicknode.com/docs/solana');
  console.log('  - Alchemy: https://docs.alchemy.com/docs/solana');
  console.log('  - Ankr: https://www.ankr.com/docs/rpc-service/chains/chains-list/solana');
  console.log('  - Helius: https://docs.helius.dev');
  console.log('  - Solana WebSocket: https://solana.com/docs/rpc/websocket\n');

  process.exit(0);
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});

