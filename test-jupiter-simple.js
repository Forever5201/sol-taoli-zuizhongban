#!/usr/bin/env node
/**
 * Jupiter Swap 简化测试
 * 
 * 快速验证Jupiter API集成是否正常
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');

console.log('🚀 Jupiter Swap 简化测试\n');
console.log('========================================\n');

// Devnet常用代币
const DEVNET_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
};

async function testJupiterAPI() {
  try {
    console.log('✅ Test 1: 基础连接测试');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const slot = await connection.getSlot();
    console.log(`   Devnet Slot: ${slot}`);
    console.log('   ✅ PASS\n');

    console.log('✅ Test 2: Jupiter Quote API');
    const quoteUrl = 'https://quote-api.jup.ag/v6/quote';
    const params = new URLSearchParams({
      inputMint: DEVNET_TOKENS.SOL,
      outputMint: DEVNET_TOKENS.USDC,
      amount: '100000000', // 0.1 SOL
      slippageBps: '50', // 0.5%
    });

    console.log(`   请求: ${quoteUrl}?${params}`);
    
    const response = await axios.get(`${quoteUrl}?${params}`, {
      timeout: 10000,
    });

    if (response.data) {
      console.log(`   ✅ Quote获取成功`);
      console.log(`   输入: ${response.data.inAmount} lamports`);
      console.log(`   输出: ${response.data.outAmount} (${response.data.otherAmountThreshold})`);
      console.log(`   价格影响: ${response.data.priceImpactPct}%`);
      console.log(`   ✅ PASS\n`);
    } else {
      console.log('   ❌ FAIL: 无响应数据\n');
      process.exit(1);
    }

    console.log('========================================');
    console.log('🎉 所有测试通过！');
    console.log('========================================\n');
    console.log('Jupiter API集成正常工作！');
    console.log('下一步：运行完整的TypeScript测试');
    console.log('命令: npm run test-jupiter\n');

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  网络连接失败');
      console.error('提示: 如果需要代理，请在.env文件中配置：');
      console.error('  HTTP_PROXY=http://127.0.0.1:7980');
      console.error('  HTTPS_PROXY=http://127.0.0.1:7980\n');
    }
    process.exit(1);
  }
}

// 运行测试
testJupiterAPI();
