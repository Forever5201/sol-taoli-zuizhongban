/**
 * 完整 RPC 端点测试脚本
 * 
 * 测试用户提供的所有 RPC API 密钥
 */

import { Connection } from '@solana/web3.js';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('RPC-Test');

// 用户提供的所有 RPC 端点
const RPC_ENDPOINTS = [
  // Helius (2个账号)
  {
    name: 'Helius 账号1',
    provider: 'Helius',
    url: 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683',
    wsUrl: 'wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683',
    rateLimit: '10 RPS'
  },
  {
    name: 'Helius 账号2',
    provider: 'Helius',
    url: 'https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65',
    wsUrl: 'wss://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65',
    rateLimit: '10 RPS'
  },
  
  // Alchemy
  {
    name: 'Alchemy',
    provider: 'Alchemy',
    url: 'https://solana-mainnet.g.alchemy.com/v2/KdZvViY51ReRsivlLqSmx',
    wsUrl: 'wss://solana-mainnet.g.alchemy.com/v2/KdZvViY51ReRsivlLqSmx',
    rateLimit: '330 CU/s (~50 RPS)'
  },
  
  // Ankr
  {
    name: 'Ankr',
    provider: 'Ankr',
    url: 'https://rpc.ankr.com/solana/747ee7dc0a4f55bc0674bbee2040acc87f826a3335ea4fa72d72a40bcc909f42',
    wsUrl: undefined,
    rateLimit: '30 RPS'
  },
  
  // QuickNode - 尝试多种可能的 URL 格式
  {
    name: 'QuickNode (格式1)',
    provider: 'QuickNode',
    url: 'https://api.quicknode.com/solana/mainnet/QN_e8ae6d6aa11f486895510c87b2178516',
    wsUrl: undefined,
    rateLimit: '~50 RPS',
    note: '需要从控制台获取完整 URL'
  },
  
  // 公共端点（备用）
  {
    name: 'Solana 官方公共',
    provider: 'Solana',
    url: 'https://api.mainnet-beta.solana.com',
    wsUrl: undefined,
    rateLimit: '~10 RPS (严格限制)'
  }
];

// Mainnet-beta 的 Genesis Hash
const MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

interface TestResult {
  name: string;
  provider: string;
  url: string;
  success: boolean;
  latency?: number;
  version?: string;
  slot?: number;
  genesisHash?: string;
  wsSupport?: boolean;
  error?: string;
  rateLimit?: string;
  note?: string;
}

/**
 * 测试单个端点
 */
async function testEndpoint(config: typeof RPC_ENDPOINTS[0]): Promise<TestResult> {
  const result: TestResult = {
    name: config.name,
    provider: config.provider,
    url: config.url,
    success: false,
    rateLimit: config.rateLimit,
    note: config.note
  };

  try {
    const startTime = Date.now();
    const connection = new Connection(config.url, 'confirmed');

    // 测试1: 获取版本
    const version = await connection.getVersion();
    result.version = version['solana-core'];

    // 测试2: 获取 Genesis Hash
    const genesisHash = await connection.getGenesisHash();
    result.genesisHash = genesisHash;

    // 测试3: 获取当前 slot
    const slot = await connection.getSlot();
    result.slot = slot;

    const latency = Date.now() - startTime;
    result.latency = latency;

    // 验证网络
    if (genesisHash === MAINNET_GENESIS_HASH) {
      result.success = true;
      result.wsSupport = !!config.wsUrl;
      
      logger.info(
        `✅ ${config.name} [${config.provider}]: OK (${latency}ms) - ` +
        `Slot: ${slot}, Version: ${version['solana-core']}`
      );
    } else {
      result.error = `Wrong network (Genesis: ${genesisHash})`;
      logger.error(`❌ ${config.name}: Wrong network!`);
    }

  } catch (error: any) {
    result.error = error.message;
    logger.error(`❌ ${config.name} [${config.provider}]: ${error.message}`);
  }

  return result;
}

/**
 * 测试 WebSocket 连接
 */
async function testWebSocket(url: string): Promise<boolean> {
  try {
    const connection = new Connection(url, {
      commitment: 'confirmed',
      wsEndpoint: url
    });
    
    const slot = await connection.getSlot();
    return slot > 0;
  } catch {
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 完整 RPC 端点测试 - 所有提供商');
  console.log('='.repeat(80) + '\n');

  console.log('📝 测试的 API 密钥：');
  console.log('  - Helius 账号1: d261c4a1-fffe-4263-b0ac-a667c05b5683');
  console.log('  - Helius 账号2: 7df840f7-134f-4b6a-91fb-a4515a5f3f65');
  console.log('  - Alchemy:      KdZvViY51ReRsivlLqSmx');
  console.log('  - Ankr:         747ee7dc...909f42');
  console.log('  - QuickNode:    QN_e8ae6d6aa11f486895510c87b2178516\n');

  console.log('⏳ 正在测试所有端点...\n');

  // 并发测试
  const promises = RPC_ENDPOINTS.map(testEndpoint);
  const results = await Promise.all(promises);

  // 统计
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(80) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`总端点数: ${results.length}`);
  console.log(`✅ 成功: ${successful.length}`);
  console.log(`❌ 失败: ${failed.length}\n`);

  // 按提供商分组
  const byProvider: Record<string, TestResult[]> = {};
  results.forEach(r => {
    if (!byProvider[r.provider]) byProvider[r.provider] = [];
    byProvider[r.provider].push(r);
  });

  console.log('按提供商分类：\n');
  Object.entries(byProvider).forEach(([provider, endpoints]) => {
    const successCount = endpoints.filter(e => e.success).length;
    const totalCount = endpoints.length;
    const status = successCount > 0 ? '✅' : '❌';
    console.log(`${status} ${provider}: ${successCount}/${totalCount} 成功`);
  });

  // 详细表格
  console.log('\n' + '='.repeat(80));
  console.log('详细测试结果');
  console.log('='.repeat(80) + '\n');

  console.log('┌─────────────────────────┬──────────┬──────────┬──────────┬──────────────────┐');
  console.log('│ 端点                    │ 提供商   │ 状态     │ 延迟(ms) │ 速率限制         │');
  console.log('├─────────────────────────┼──────────┼──────────┼──────────┼──────────────────┤');

  results.forEach(r => {
    const name = r.name.padEnd(23);
    const provider = r.provider.padEnd(8);
    const status = r.success ? '✅ 正常' : '❌ 失败';
    const latency = r.latency ? r.latency.toString().padStart(6) : '  N/A';
    const rateLimit = (r.rateLimit || 'Unknown').padEnd(16);
    
    console.log(`│ ${name} │ ${provider} │ ${status}   │ ${latency}   │ ${rateLimit} │`);
    
    if (r.error) {
      console.log(`│ ${' '.repeat(23)} │ ${' '.repeat(8)} │ ${' '.repeat(8)} │ ${' '.repeat(8)} │ ${' '.repeat(16)} │`);
      const errorMsg = r.error.substring(0, 60);
      console.log(`│ ⚠️  错误: ${errorMsg.padEnd(68)} │`);
    }
    
    if (r.note) {
      console.log(`│ ${' '.repeat(23)} │ ${' '.repeat(8)} │ ${' '.repeat(8)} │ ${' '.repeat(8)} │ ${' '.repeat(16)} │`);
      console.log(`│ 💡 ${r.note.padEnd(73)} │`);
    }
  });
  
  console.log('└─────────────────────────┴──────────┴──────────┴──────────┴──────────────────┘\n');

  // 性能排名
  if (successful.length > 0) {
    console.log('🏆 性能排名（按延迟从低到高）：\n');
    const sorted = [...successful].sort((a, b) => (a.latency || 999999) - (b.latency || 999999));
    
    sorted.forEach((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const ws = r.wsSupport ? '📡 WebSocket' : '';
      console.log(`${medal} ${r.name} [${r.provider}]: ${r.latency}ms ${ws}`);
    });
    console.log('');
  }

  // 容量计算
  if (successful.length > 0) {
    console.log('='.repeat(80));
    console.log('💪 总容量估算');
    console.log('='.repeat(80) + '\n');

    let totalRPS = 0;
    const capacityBreakdown: string[] = [];

    successful.forEach(r => {
      let rps = 0;
      if (r.rateLimit?.includes('10 RPS')) rps = 10;
      else if (r.rateLimit?.includes('30 RPS')) rps = 30;
      else if (r.rateLimit?.includes('50 RPS')) rps = 50;
      else if (r.rateLimit?.includes('330 CU')) rps = 50; // Alchemy 估算
      
      if (rps > 0) {
        totalRPS += rps;
        capacityBreakdown.push(`  - ${r.name}: ${rps} RPS`);
      }
    });

    console.log('可用端点容量：\n');
    capacityBreakdown.forEach(line => console.log(line));
    console.log('');
    console.log(`📈 总计：约 ${totalRPS} RPS (请求/秒)`);
    console.log(`📈 每秒可执行约 ${Math.floor(totalRPS / 2)} 次市场扫描 (每次2个RPC请求)\n`);
  }

  // WebSocket 测试
  const wsEndpoints = successful.filter(r => r.wsSupport);
  if (wsEndpoints.length > 0) {
    console.log('='.repeat(80));
    console.log('📡 WebSocket 支持');
    console.log('='.repeat(80) + '\n');

    wsEndpoints.forEach(r => {
      console.log(`✅ ${r.name}: 支持 WebSocket 订阅`);
    });
    console.log('');
  }

  // 推荐配置
  console.log('='.repeat(80));
  console.log('💡 推荐配置');
  console.log('='.repeat(80) + '\n');

  if (successful.length >= 3) {
    console.log('✅ 您有充足的 RPC 端点！\n');
    console.log('推荐配置（按性能排序）：\n');
    console.log('[rpc]');
    console.log('urls = [');
    
    const sorted = [...successful].sort((a, b) => (a.latency || 999999) - (b.latency || 999999));
    sorted.slice(0, 5).forEach(r => {
      console.log(`  "${r.url}",`);
    });
    
    console.log(']');
    console.log('');
    console.log('commitment = "confirmed"');
    console.log('min_time = 30          # 可以提高频率');
    console.log('max_concurrent = 20    # 可以提高并发');
    console.log('');
    
    console.log('[markets]');
    console.log('scan_interval_ms = 150  # 每秒约 6-7 次扫描');
    console.log('');
    
  } else if (successful.length > 0) {
    console.log('⚠️  端点数量较少，建议保守配置：\n');
    console.log('[rpc]');
    console.log('min_time = 100');
    console.log('max_concurrent = 10');
    console.log('');
  } else {
    console.log('❌ 没有可用端点！请检查 API 密钥和网络连接。\n');
  }

  // QuickNode 特别提示
  const qnResult = results.find(r => r.provider === 'QuickNode');
  if (qnResult && !qnResult.success) {
    console.log('='.repeat(80));
    console.log('⚠️  QuickNode 配置提示');
    console.log('='.repeat(80) + '\n');
    console.log('您的 QuickNode API Key 需要从控制台获取完整 URL：\n');
    console.log('1. 访问: https://www.quicknode.com/endpoints');
    console.log('2. 选择 Solana Mainnet 端点');
    console.log('3. 复制 "HTTP Provider" 完整 URL\n');
    console.log('正确的 URL 格式类似：');
    console.log('https://xxx-xxx-xxx.solana-mainnet.quiknode.pro/YOUR-TOKEN/\n');
  }

  // 下一步
  console.log('='.repeat(80));
  console.log('🚀 下一步');
  console.log('='.repeat(80) + '\n');

  if (successful.length >= 2) {
    console.log('1. 复制上面的推荐配置到 config.quicknode.toml');
    console.log('2. 运行市场扫描器测试:');
    console.log('   pnpm tsx packages/onchain-bot/src/test-market-scanner-fix.ts');
    console.log('3. 开始套利机器人测试\n');
  } else {
    console.log('1. 检查失败的端点错误信息');
    console.log('2. 验证 API 密钥是否正确');
    console.log('3. 确认网络连接正常\n');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});

