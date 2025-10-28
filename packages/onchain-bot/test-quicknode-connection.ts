/**
 * QuickNode 连接测试脚本
 * 
 * 用途：
 * 1. 验证 QuickNode 端点是否正确配置
 * 2. 测试各个 RPC 端点的延迟和可用性
 * 3. 确认连接到正确的网络（mainnet-beta）
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('QuickNodeTest');

// 测试的 RPC 端点列表
const RPC_ENDPOINTS = [
  {
    name: 'QuickNode (请更新URL)',
    url: 'https://your-endpoint.solana-mainnet.quiknode.pro/QN_e8ae6d6aa11f486895510c87b2178516/',
    note: '⚠️ 需要从 QuickNode 控制台获取完整 URL'
  },
  {
    name: 'Helius 账号1',
    url: 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683'
  },
  {
    name: 'Helius 账号2',
    url: 'https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65'
  },
  {
    name: 'Ankr 公共',
    url: 'https://rpc.ankr.com/solana'
  },
  {
    name: 'Solana 官方',
    url: 'https://api.mainnet-beta.solana.com'
  }
];

// Mainnet-beta 的 Genesis Hash（用于验证网络）
const MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

interface TestResult {
  name: string;
  url: string;
  success: boolean;
  latency?: number;
  version?: string;
  genesisHash?: string;
  error?: string;
  note?: string;
}

/**
 * 测试单个 RPC 端点
 */
async function testEndpoint(
  name: string, 
  url: string, 
  note?: string
): Promise<TestResult> {
  const result: TestResult = {
    name,
    url,
    success: false,
    note
  };

  try {
    const startTime = Date.now();
    const connection = new Connection(url, 'confirmed');

    // 测试1: 获取版本信息
    const version = await connection.getVersion();
    result.version = `${version['solana-core']}`;

    // 测试2: 获取 Genesis Hash（验证网络）
    const genesisHash = await connection.getGenesisHash();
    result.genesisHash = genesisHash;

    // 测试3: 获取最新 slot（验证实时性）
    const slot = await connection.getSlot();

    const latency = Date.now() - startTime;
    result.latency = latency;

    // 验证是否连接到正确的网络
    if (genesisHash === MAINNET_GENESIS_HASH) {
      result.success = true;
      logger.info(
        `✅ ${name}: OK (${latency}ms) - Slot: ${slot}, Version: ${version['solana-core']}`
      );
    } else {
      result.success = false;
      result.error = `Wrong network! Genesis: ${genesisHash}`;
      logger.error(`❌ ${name}: Connected to wrong network!`);
    }

  } catch (error: any) {
    result.error = error.message;
    logger.error(`❌ ${name}: ${error.message}`);
  }

  return result;
}

/**
 * 主测试函数
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔬 QuickNode 和多 RPC 端点连接测试');
  console.log('='.repeat(70) + '\n');

  console.log('📍 测试目标：验证所有 RPC 端点是否正确连接到 Solana Mainnet-Beta\n');

  const results: TestResult[] = [];

  // 并发测试所有端点
  console.log('⏳ 正在测试所有端点...\n');
  const promises = RPC_ENDPOINTS.map(endpoint => 
    testEndpoint(endpoint.name, endpoint.url, endpoint.note)
  );
  const testResults = await Promise.all(promises);
  results.push(...testResults);

  // 统计结果
  console.log('\n' + '='.repeat(70));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(70) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`总端点数: ${results.length}`);
  console.log(`✅ 成功: ${successful.length}`);
  console.log(`❌ 失败: ${failed.length}\n`);

  // 详细结果表格
  console.log('详细结果：\n');
  console.log('┌────────────────────────┬──────────┬───────────┬─────────────────┐');
  console.log('│ 端点名称               │ 状态     │ 延迟(ms)  │ 版本            │');
  console.log('├────────────────────────┼──────────┼───────────┼─────────────────┤');

  results.forEach(r => {
    const status = r.success ? '✅ 正常' : '❌ 失败';
    const latency = r.latency ? r.latency.toString().padStart(7) : '   N/A';
    const version = r.version || 'N/A';
    const name = r.name.padEnd(22);
    console.log(`│ ${name} │ ${status}   │ ${latency}    │ ${version.padEnd(15)} │`);
    
    if (r.note) {
      console.log(`│ ${' '.repeat(22)} │ ${' '.repeat(8)} │ ${' '.repeat(9)} │ ${' '.repeat(15)} │`);
      console.log(`│ ⚠️  ${r.note.padEnd(66)} │`);
    }
    
    if (r.error) {
      console.log(`│ ${' '.repeat(22)} │ ${' '.repeat(8)} │ ${' '.repeat(9)} │ ${' '.repeat(15)} │`);
      console.log(`│ 错误: ${r.error.padEnd(63)} │`);
    }
  });
  console.log('└────────────────────────┴──────────┴───────────┴─────────────────┘\n');

  // 性能排名
  if (successful.length > 0) {
    console.log('🏆 延迟排名（越低越好）：\n');
    const sorted = [...successful].sort((a, b) => (a.latency || 999999) - (b.latency || 999999));
    sorted.forEach((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`${medal} ${(i + 1)}. ${r.name}: ${r.latency}ms`);
    });
    console.log('');
  }

  // QuickNode 特别提示
  const quicknodeResult = results.find(r => r.name.includes('QuickNode'));
  if (quicknodeResult && !quicknodeResult.success) {
    console.log('\n' + '⚠️ '.repeat(35));
    console.log('\n📢 QuickNode 配置提示：\n');
    console.log('您的 QuickNode 端点需要更新！请按以下步骤操作：\n');
    console.log('1. 访问 QuickNode 控制台: https://www.quicknode.com/endpoints');
    console.log('2. 选择您的 Solana Mainnet 端点');
    console.log('3. 复制 "HTTP Provider" 完整 URL');
    console.log('4. 更新配置文件: packages/onchain-bot/config.quicknode.toml');
    console.log('   将第一个 URL 替换为您复制的完整 URL\n');
    console.log('URL 格式示例:');
    console.log('https://xxx-xxx-xxx.solana-mainnet.quiknode.pro/YOUR-TOKEN/\n');
    console.log('⚠️ '.repeat(35) + '\n');
  }

  // 最终建议
  console.log('='.repeat(70));
  console.log('💡 使用建议');
  console.log('='.repeat(70) + '\n');

  if (successful.length >= 3) {
    console.log('✅ 您有足够的 RPC 端点，可以开始使用！');
    console.log('✅ 建议使用延迟最低的 3-5 个端点');
    console.log('✅ 配置文件: packages/onchain-bot/config.quicknode.toml\n');
  } else if (successful.length > 0) {
    console.log('⚠️  可用端点较少，建议添加更多备用端点');
    console.log('⚠️  至少配置 3 个可用端点以提高可靠性\n');
  } else {
    console.log('❌ 没有可用的 RPC 端点！');
    console.log('❌ 请检查网络连接和 API 密钥配置\n');
  }

  console.log('下一步：');
  console.log('1. 更新 QuickNode URL（如果失败）');
  console.log('2. 运行市场扫描器测试:');
  console.log('   pnpm tsx packages/onchain-bot/src/test-market-scanner-fix.ts');
  console.log('');

  // 退出码
  process.exit(failed.length > 0 ? 1 : 0);
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试脚本异常:', error);
  process.exit(1);
});

