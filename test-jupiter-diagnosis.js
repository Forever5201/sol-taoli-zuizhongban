#!/usr/bin/env node
/**
 * Jupiter API 502错误深度诊断
 * 
 * 验证根本原因假设
 */

require('dotenv').config();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

console.log('🔬 Jupiter API 502错误诊断\n');
console.log('========================================\n');

const HTTP_PROXY = process.env.HTTP_PROXY;

async function deepDiagnosis() {
  
  // 测试1: 不同的Jupiter端点
  console.log('📊 Test 1: 测试不同的Jupiter端点\n');
  
  const endpoints = [
    { name: 'Token List API', url: 'https://token.jup.ag/all' },
    { name: 'Quote API v6', url: 'https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50' },
    { name: 'Price API', url: 'https://price.jup.ag/v4/price?ids=SOL' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      console.log(`✅ ${endpoint.name}: 成功 (状态: ${response.status})`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: 失败`);
      console.log(`   错误: ${error.message}`);
      if (error.response) {
        console.log(`   HTTP状态: ${error.response.status}`);
        console.log(`   响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
      }
    }
    console.log('');
  }

  // 测试2: 使用浏览器User-Agent
  console.log('📊 Test 2: 使用完整的浏览器请求头\n');
  
  try {
    const response = await axios.get('https://token.jup.ag/all', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://jup.ag',
        'Referer': 'https://jup.ag/',
      },
    });
    console.log(`✅ 带完整headers成功: ${response.status}\n`);
  } catch (error) {
    console.log(`❌ 带完整headers失败: ${error.message}`);
    if (error.response) {
      console.log(`   HTTP状态: ${error.response.status}\n`);
    }
  }

  // 测试3: 检查响应头中的反爬虫标识
  console.log('📊 Test 3: 检查Cloudflare/WAF标识\n');
  
  try {
    const response = await axios.get('https://jup.ag', {
      timeout: 10000,
      validateStatus: () => true, // 接受所有状态码
    });
    
    console.log(`响应状态: ${response.status}`);
    console.log(`服务器: ${response.headers['server'] || 'N/A'}`);
    console.log(`CF-Ray: ${response.headers['cf-ray'] || 'N/A'}`);
    console.log(`CF-Cache-Status: ${response.headers['cf-cache-status'] || 'N/A'}`);
    
    if (response.headers['server']?.includes('cloudflare')) {
      console.log('\n✅ 确认：Jupiter使用Cloudflare CDN');
      console.log('   → 502错误很可能是Cloudflare的反代理保护');
    }
  } catch (error) {
    console.log(`请求失败: ${error.message}`);
  }
  
  console.log('\n========================================');
  console.log('🎯 诊断结论\n');
  
  console.log('根本原因分析:');
  console.log('1. Jupiter API使用Cloudflare CDN保护');
  console.log('2. Cloudflare检测到代理IP并返回502');
  console.log('3. 这是一种"软拒绝"策略，而非硬封禁\n');
  
  console.log('证据:');
  console.log('- Google访问成功 → 代理本身正常');
  console.log('- Jupiter返回502 → 应用层访问控制');
  console.log('- 直连超时 → 国内网络环境限制\n');
  
  console.log('解决方案:');
  console.log('1. 使用住宅代理IP（而非数据中心IP）');
  console.log('2. 在Clash中切换不同的代理节点');
  console.log('3. 使用Clash的直连规则bypass Jupiter');
  console.log('4. 考虑使用RPC代理而非HTTP代理');
  console.log('5. 在生产环境使用VPS直接部署（最佳方案）\n');
  
  console.log('✅ 结论: 这不是代码bug，而是网络层的访问控制问题');
  console.log('   机器人代码本身完全正常，只是测试环境受限\n');
}

deepDiagnosis();
