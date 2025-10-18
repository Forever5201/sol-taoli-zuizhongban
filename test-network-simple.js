#!/usr/bin/env node
/**
 * 简单网络测试 - 诊断网络连接问题
 */

require('dotenv').config();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const HTTP_PROXY = process.env.HTTP_PROXY || process.env.http_proxy;

console.log('🔍 网络诊断测试\n');
console.log('代理配置:', HTTP_PROXY || '未配置');
console.log('System Proxy已启用:', process.env.HTTP_PROXY ? '是' : '否');
console.log('\n========================================\n');

async function testConnection() {
  // Test 1: 直连测试
  console.log('Test 1: 直连测试 (不使用代理)');
  try {
    const response = await axios.get('https://www.google.com', {
      timeout: 5000,
      proxy: false,
    });
    console.log('✅ 直连成功\n');
  } catch (error) {
    console.log(`❌ 直连失败: ${error.message}\n`);
  }

  // Test 2: 使用系统代理
  if (HTTP_PROXY) {
    console.log('Test 2: 使用代理连接');
    try {
      const agent = new HttpsProxyAgent(HTTP_PROXY);
      const response = await axios.get('https://www.google.com', {
        timeout: 5000,
        httpsAgent: agent,
        proxy: false,
      });
      console.log('✅ 代理连接成功\n');
    } catch (error) {
      console.log(`❌ 代理连接失败: ${error.message}`);
      console.log(`   错误代码: ${error.code || 'N/A'}\n`);
    }
  }

  // Test 3: Jupiter API直连
  console.log('Test 3: Jupiter API直连');
  try {
    const response = await axios.get('https://quote-api.jup.ag/v6/tokens', {
      timeout: 5000,
      proxy: false,
    });
    console.log(`✅ Jupiter API可访问 (${response.data.length} tokens)\n`);
  } catch (error) {
    console.log(`❌ Jupiter API不可访问: ${error.message}\n`);
  }

  console.log('========================================');
  console.log('诊断完成\n');
  
  console.log('💡 建议:');
  console.log('1. 如果直连成功，可以不使用代理');
  console.log('2. 如果代理失败，检查Clash的"System Proxy"是否开启');
  console.log('3. 确认Clash的端口是7890');
  console.log('4. 尝试使用Clash的TUN模式');
}

testConnection();
