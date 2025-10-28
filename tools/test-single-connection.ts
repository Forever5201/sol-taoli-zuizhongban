#!/usr/bin/env tsx
/**
 * 最简单的 Jupiter API 单次连接测试
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

async function testSingleConnection() {
  console.log('🧪 Jupiter API 单次连接测试\n');

  // 测试 URL (使用免费的 Lite API)
  const testUrl = 'https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50';

  console.log('📍 测试 URL:', testUrl.substring(0, 80) + '...\n');

  // 方式 1: 不使用代理
  console.log('方式 1: 直连（不使用代理）');
  try {
    const response = await axios.get(testUrl, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      }
    });
    console.log('✅ 成功！');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应长度: ${JSON.stringify(response.data).length} 字符`);
    if (response.data.routePlan) {
      console.log(`   找到路由: ${response.data.routePlan.length} 步`);
    }
    console.log();
    return true;
  } catch (error: any) {
    console.log('❌ 失败');
    console.log(`   错误: ${error.message}`);
    if (error.code) console.log(`   错误代码: ${error.code}`);
    console.log();
  }

  // 方式 2: 使用代理
  console.log('方式 2: 使用代理 (http://127.0.0.1:7890)');
  const proxyUrl = 'http://127.0.0.1:7890';
  const httpsAgent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: false, // 忽略 SSL 证书验证
    timeout: 15000,
    keepAlive: true,
  });

  try {
    const response = await axios.get(testUrl, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      },
      httpsAgent,
      httpAgent: httpsAgent,
      proxy: false,
    });
    console.log('✅ 成功！');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应长度: ${JSON.stringify(response.data).length} 字符`);
    if (response.data.routePlan) {
      console.log(`   找到路由: ${response.data.routePlan.length} 步`);
    }
    console.log();
    return true;
  } catch (error: any) {
    console.log('❌ 失败');
    console.log(`   错误: ${error.message}`);
    if (error.code) console.log(`   错误代码: ${error.code}`);
    console.log();
  }

  console.log('🔴 所有连接方式都失败\n');
  return false;
}

testSingleConnection()
  .then((success) => {
    if (success) {
      console.log('✅ 测试完成：至少有一种方式可以连接');
    } else {
      console.log('❌ 测试失败：无法连接到 Jupiter API');
      console.log('\n💡 建议:');
      console.log('   1. 检查网络连接');
      console.log('   2. 检查代理服务是否运行（127.0.0.1:7890）');
      console.log('   3. 尝试在浏览器访问: https://quote-api.jup.ag/v6');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 致命错误:', error.message);
    process.exit(1);
  });

