#!/usr/bin/env node
/**
 * Jupiter Swap 测试 - 正确配置代理版本
 */

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

console.log('🚀 Jupiter Swap 测试 (带代理支持)\n');
console.log('========================================\n');

// 读取代理配置
const HTTP_PROXY = process.env.HTTP_PROXY || process.env.http_proxy;
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || HTTP_PROXY;

console.log('📋 代理配置:');
console.log(`   HTTP_PROXY: ${HTTP_PROXY || '未设置'}`);
console.log(`   HTTPS_PROXY: ${HTTPS_PROXY || '未设置'}\n`);

// Devnet常用代币
const DEVNET_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
};

async function testJupiterAPI() {
  try {
    // 配置axios代理
    const axiosConfig = {
      timeout: 10000,
    };

    if (HTTPS_PROXY) {
      const httpsAgent = new HttpsProxyAgent(HTTPS_PROXY);
      axiosConfig.httpsAgent = httpsAgent;
      axiosConfig.proxy = false; // 禁用axios内置代理，使用Agent
      console.log('✅ Axios代理已配置\n');
    } else {
      console.log('⚠️  未配置代理，使用直连\n');
    }

    console.log('✅ Test 1: Jupiter Quote API');
    const quoteUrl = 'https://quote-api.jup.ag/v6/quote';
    const params = new URLSearchParams({
      inputMint: DEVNET_TOKENS.SOL,
      outputMint: DEVNET_TOKENS.USDC,
      amount: '100000000', // 0.1 SOL
      slippageBps: '50', // 0.5%
    });

    console.log(`   请求: ${quoteUrl}`);
    console.log(`   参数: inputMint=SOL, outputMint=USDC, amount=0.1 SOL`);
    
    const response = await axios.get(`${quoteUrl}?${params}`, axiosConfig);

    if (response.data) {
      console.log(`\n   ✅ Quote获取成功！`);
      console.log(`   输入: ${response.data.inAmount} lamports (0.1 SOL)`);
      console.log(`   输出: ${response.data.outAmount} (最少: ${response.data.otherAmountThreshold})`);
      console.log(`   价格影响: ${response.data.priceImpactPct}%`);
      
      if (response.data.routePlan && response.data.routePlan.length > 0) {
        const dexes = response.data.routePlan.map(r => r.swapInfo?.label || 'Unknown').join(' → ');
        console.log(`   路由: ${dexes}`);
      }
      
      console.log(`   ✅ PASS\n`);
    } else {
      console.log('   ❌ FAIL: 无响应数据\n');
      process.exit(1);
    }

    console.log('========================================');
    console.log('🎉 Jupiter API测试通过！');
    console.log('========================================\n');
    console.log('✅ Jupiter集成正常工作');
    console.log('✅ 代理配置生效');
    console.log('✅ 可以获取实时报价\n');
    
    console.log('📚 下一步：');
    console.log('1. 测试完整的TypeScript集成');
    console.log('2. 创建Devnet测试钱包');
    console.log('3. 运行端到端套利测试\n');

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n⚠️  网络连接失败');
      console.error('可能的原因:');
      console.error('1. 代理未启动或端口错误');
      console.error('2. Jupiter API暂时不可用');
      console.error('3. 防火墙阻止连接\n');
      console.error('当前代理配置:');
      console.error(`   HTTP_PROXY=${HTTP_PROXY}`);
      console.error(`   HTTPS_PROXY=${HTTPS_PROXY}\n`);
    } else if (error.response) {
      console.error(`\nHTTP错误: ${error.response.status}`);
      console.error(`响应: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    process.exit(1);
  }
}

// 运行测试
testJupiterAPI();
