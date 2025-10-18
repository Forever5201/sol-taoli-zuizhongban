#!/usr/bin/env node
/**
 * Jupiter测试 - 终极版（TUN模式支持）
 */

require('dotenv').config();
const axios = require('axios');

console.log('🚀 Jupiter Swap 测试 (TUN模式)\n');
console.log('========================================\n');

// Clash TUN模式启用后，应该可以透明代理所有流量
// 不需要显式配置代理agent

const DEVNET_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
};

async function testJupiterAPI() {
  try {
    console.log('✅ Test 1: Jupiter Token List API');
    
    // 先测试简单的token list
    const tokenResponse = await axios.get('https://token.jup.ag/all', {
      timeout: 10000,
    });
    
    console.log(`   ✅ Token List API可用 (${tokenResponse.data.length} tokens)\n`);

    console.log('✅ Test 2: Jupiter Quote API');
    const quoteUrl = 'https://quote-api.jup.ag/v6/quote';
    const params = new URLSearchParams({
      inputMint: DEVNET_TOKENS.SOL,
      outputMint: DEVNET_TOKENS.USDC,
      amount: '100000000',
      slippageBps: '50',
    });

    console.log(`   请求报价: SOL → USDC (0.1 SOL)`);
    
    const response = await axios.get(`${quoteUrl}?${params}`, {
      timeout: 15000,
    });

    if (response.data) {
      console.log(`\n   ✅ Quote获取成功！`);
      console.log(`   输入: ${response.data.inAmount} lamports (0.1 SOL)`);
      console.log(`   输出: ${response.data.outAmount}`);
      console.log(`   价格影响: ${response.data.priceImpactPct}%`);
      
      if (response.data.routePlan) {
        const dexes = response.data.routePlan.map(r => r.swapInfo?.label || 'Unknown').join(' → ');
        console.log(`   路由: ${dexes}`);
      }
      
      console.log(`\n   ✅ PASS\n`);
      
      console.log('========================================');
      console.log('🎉 所有测试通过！');
      console.log('========================================\n');
      console.log('✅ Jupiter API集成正常');
      console.log('✅ 网络连接稳定');
      console.log('✅ 可以获取实时报价\n');
      
      console.log('📚 准备就绪，可以进行：');
      console.log('1. 创建Devnet测试钱包');
      console.log('2. 运行完整TypeScript测试');
      console.log('3. 启动套利机器人Devnet测试\n');
      
      return true;
    }

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    console.error(`错误代码: ${error.code || 'N/A'}`);
    
    if (error.response) {
      console.error(`HTTP状态: ${error.response.status}`);
    }
    
    console.log('\n💡 故障排查:');
    console.log('1. 确认Clash的TUN Mode已启用（截图显示已启用）');
    console.log('2. 确认Clash的"Allow LAN"已启用');
    console.log('3. 重启Clash或重启网络适配器');
    console.log('4. 检查防火墙设置');
    console.log('5. 尝试关闭TUN模式，仅使用System Proxy\n');
    
    return false;
  }
}

testJupiterAPI();
