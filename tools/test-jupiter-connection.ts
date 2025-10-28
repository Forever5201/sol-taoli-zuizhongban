#!/usr/bin/env tsx
/**
 * 测试 Jupiter API 连接
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = '7890';

async function testWithoutProxy() {
  console.log('🧪 测试 1: 不使用代理直接连接\n');
  try {
    const response = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000000',
        slippageBps: '50'
      },
      timeout: 10000,
    });
    console.log('✅ 成功（不使用代理）');
    console.log(`   状态码: ${response.status}`);
    console.log(`   返回数据: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    return true;
  } catch (error: any) {
    console.log('❌ 失败（不使用代理）');
    console.log(`   错误: ${error.message}\n`);
    return false;
  }
}

async function testWithProxy() {
  console.log('🧪 测试 2: 使用代理连接\n');
  
  const proxyAgent = new HttpsProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);
  
  try {
    const response = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000000',
        slippageBps: '50'
      },
      timeout: 10000,
      httpsAgent: proxyAgent,
      proxy: false,
    });
    console.log('✅ 成功（使用代理）');
    console.log(`   状态码: ${response.status}`);
    console.log(`   返回数据: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    return true;
  } catch (error: any) {
    console.log('❌ 失败（使用代理）');
    console.log(`   错误: ${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据: ${JSON.stringify(error.response.data)}`);
    }
    console.log();
    return false;
  }
}

async function testWithProxyV2() {
  console.log('🧪 测试 3: 使用代理连接（替代配置）\n');
  
  try {
    const response = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000000',
        slippageBps: '50'
      },
      timeout: 10000,
      proxy: {
        host: PROXY_HOST,
        port: parseInt(PROXY_PORT),
        protocol: 'http'
      }
    });
    console.log('✅ 成功（使用 axios 原生代理配置）');
    console.log(`   状态码: ${response.status}`);
    console.log(`   返回数据: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    return true;
  } catch (error: any) {
    console.log('❌ 失败（使用 axios 原生代理配置）');
    console.log(`   错误: ${error.message}\n`);
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('🧪 测试 4: 测试 Jupiter Health 端点\n');
  
  const proxyAgent = new HttpsProxyAgent(`http://${PROXY_HOST}:${PROXY_PORT}`);
  
  try {
    const response = await axios.get('https://quote-api.jup.ag/v6', {
      timeout: 5000,
      httpsAgent: proxyAgent,
      proxy: false,
    });
    console.log('✅ 成功（Health 端点）');
    console.log(`   状态码: ${response.status}`);
    console.log(`   返回数据: ${JSON.stringify(response.data).substring(0, 200)}...\n`);
    return true;
  } catch (error: any) {
    console.log('❌ 失败（Health 端点）');
    console.log(`   错误: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Jupiter API 连接测试\n');
  console.log(`代理配置: ${PROXY_HOST}:${PROXY_PORT}`);
  console.log('='.repeat(60));
  console.log();

  const results = {
    withoutProxy: await testWithoutProxy(),
    withProxy: await testWithProxy(),
    withProxyV2: await testWithProxyV2(),
    healthEndpoint: await testHealthEndpoint(),
  };

  console.log('='.repeat(60));
  console.log('\n📊 测试结果总结:\n');
  console.log(`   不使用代理: ${results.withoutProxy ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   使用代理 (httpsAgent): ${results.withProxy ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   使用代理 (axios proxy): ${results.withProxyV2 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   Health 端点: ${results.healthEndpoint ? '✅ 通过' : '❌ 失败'}`);
  
  console.log('\n💡 建议:');
  if (results.withoutProxy) {
    console.log('   - 直连成功，无需代理！');
  } else if (results.withProxy) {
    console.log('   - 使用 httpsAgent 方式的代理配置');
  } else if (results.withProxyV2) {
    console.log('   - 使用 axios 原生 proxy 配置');
  } else {
    console.log('   - 所有方式都失败，请检查：');
    console.log('     1. 代理服务是否正常运行');
    console.log('     2. 网络连接是否正常');
    console.log('     3. Jupiter API 是否可访问');
  }
  
  console.log();
}

if (require.main === module) {
  main().catch(console.error);
}

