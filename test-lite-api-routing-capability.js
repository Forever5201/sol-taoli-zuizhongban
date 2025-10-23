/**
 * 测试 Lite API 的路由能力
 * 
 * 问题：Lite API 是否只支持单跳（1条路由）？
 * 测试：移除 onlyDirectRoutes 参数，看是否能返回多跳路由
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY = 'http://127.0.0.1:7890';
const agent = new HttpsProxyAgent(PROXY);

async function testLiteAPIRouting() {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 测试 Lite API 的路由能力');
  console.log('='.repeat(80));

  const testCases = [
    {
      name: '场景1: 允许多跳路由 (无 onlyDirectRoutes)',
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '10000000000',
        slippageBps: '50',
        // onlyDirectRoutes: 'false',  // 不设置，让API自由选择
        // maxAccounts: '64',  // 增加账户数限制
      },
    },
    {
      name: '场景2: 强制单跳 (onlyDirectRoutes=true)',
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '10000000000',
        slippageBps: '50',
        onlyDirectRoutes: 'true',
        maxAccounts: '20',
      },
    },
    {
      name: '场景3: 明确允许多跳 (onlyDirectRoutes=false)',
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '10000000000',
        slippageBps: '50',
        onlyDirectRoutes: 'false',
        // maxAccounts: '64',
      },
    },
    {
      name: '场景4: 小金额测试多跳',
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000000',
        slippageBps: '50',
        onlyDirectRoutes: 'false',
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'━'.repeat(80)}`);
    console.log(`📊 ${testCase.name}`);
    console.log(`${'━'.repeat(80)}\n`);

    try {
      const startTime = Date.now();
      const response = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
        params: testCase.params,
        httpsAgent: agent,
        proxy: false,
        timeout: 5000,
      });
      const latency = Date.now() - startTime;

      console.log('✅ 查询成功');
      console.log(`   延迟: ${latency}ms`);
      console.log(`   输入: ${Number(testCase.params.amount) / 1e9} SOL`);
      console.log(`   输出: ${(Number(response.data.outAmount) / 1e6).toFixed(6)} USDC`);
      console.log(`   价格影响: ${response.data.priceImpactPct || 0}%`);
      console.log(`   路由跳数: ${response.data.routePlan.length} 跳`);
      
      if (response.data.routePlan && response.data.routePlan.length > 0) {
        console.log(`\n   路由详情:`);
        response.data.routePlan.forEach((route, idx) => {
          const swap = route.swapInfo;
          console.log(`     ${idx + 1}. ${swap.label || 'Unknown DEX'}`);
          console.log(`        In:  ${swap.inAmount} ${swap.inputMint.slice(0, 4)}...`);
          console.log(`        Out: ${swap.outAmount} ${swap.outputMint.slice(0, 4)}...`);
          console.log(`        Split: ${route.percent}%`);
        });
      }

      // 分析是否真的是多跳
      const uniqueDEXs = new Set(response.data.routePlan.map(r => r.swapInfo.label));
      console.log(`\n   使用的DEX数量: ${uniqueDEXs.size}`);
      console.log(`   DEX列表: ${Array.from(uniqueDEXs).join(', ')}`);
      
      if (response.data.routePlan.length > 1) {
        console.log(`   🎯 这是多跳路由！`);
      } else {
        console.log(`   ⚪ 单跳路由`);
      }

    } catch (error) {
      console.log(`❌ 查询失败: ${error.message}`);
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   错误详情:`, error.response.data);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 对比测试：检查完整的API参数文档
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('📚 Lite API 支持的参数（根据响应推断）');
  console.log('═'.repeat(80));
  console.log(`
参数说明：
  - inputMint: 输入代币地址
  - outputMint: 输出代币地址
  - amount: 交易金额
  - slippageBps: 滑点（基点）
  - onlyDirectRoutes: true/false (是否只用直接路由)
  - maxAccounts: 最大账户数（影响交易复杂度）
  - swapMode: ExactIn / ExactOut (默认 ExactIn)
  - asLegacyTransaction: true/false (是否返回legacy格式)
  
关键发现：
  onlyDirectRoutes=false → 可能启用多跳路由
  maxAccounts 增加 → 允许更复杂的路由
  `);
}

// 额外测试：对比 Lite vs Quote API v6 的路由能力
async function compareLiteVsQuoteV6() {
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('🔬 对比 Lite API vs Quote API v6 的路由能力');
  console.log('═'.repeat(80));

  const amount = '10000000000';

  // Test Lite API
  console.log('\n🔵 Lite API (/swap/v1/quote):');
  try {
    const lite = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount,
        slippageBps: '50',
        onlyDirectRoutes: 'false',  // 允许多跳
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 5000,
    });

    console.log(`   路由数: ${lite.data.routePlan.length}`);
    console.log(`   输出: ${(Number(lite.data.outAmount) / 1e6).toFixed(6)} USDC`);
    lite.data.routePlan.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.swapInfo.label} (${r.percent}%)`);
    });
  } catch (e) {
    console.log(`   ❌ 失败: ${e.message}`);
  }

  // Test Quote API v6 (如果能连接)
  console.log('\n🟢 Quote API v6 (/v6/quote):');
  try {
    const quote = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount,
        slippageBps: '50',
        onlyDirectRoutes: 'false',
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 5000,
    });

    console.log(`   路由数: ${quote.data.routePlan.length}`);
    console.log(`   输出: ${(Number(quote.data.outAmount) / 1e6).toFixed(6)} USDC`);
    quote.data.routePlan.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.swapInfo.label} (${r.percent}%)`);
    });
  } catch (e) {
    console.log(`   ❌ 失败: ${e.message} (可能是TLS问题)`);
  }
}

async function main() {
  await testLiteAPIRouting();
  await compareLiteVsQuoteV6();
  
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('📝 结论');
  console.log('═'.repeat(80));
  console.log(`
根据测试结果：
1. Lite API 是否支持多跳？ 
   → 查看上述 routePlan.length 是否 > 1

2. onlyDirectRoutes 参数的影响？
   → 对比 true vs false 的路由数差异

3. 是否因为Worker配置限制了多跳？
   → 检查 onlyDirectRoutes: 'true' 这一行配置

4. 建议：
   - 如果 Lite 支持多跳 → 移除 onlyDirectRoutes 限制
   - 如果 Lite 不支持多跳 → 切换到 Ultra/Quote API
  `);
}

main().catch(console.error);

