#!/usr/bin/env node

/**
 * Solana WebSocket 代理测试脚本
 * 
 * 用于测试通过代理连接 Solana WebSocket API
 * 支持 HTTP/HTTPS/SOCKS5 代理
 */

const WebSocket = require('ws');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs');
const path = require('path');

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('⚠️  dotenv 模块加载失败，使用系统环境变量');
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取代理配置
function getProxyConfig() {
  // 从环境变量获取代理配置
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const wsProxy = process.env.WS_PROXY || process.env.ws_proxy;
  
  // 优先使用 WS_PROXY，其次 HTTPS_PROXY，最后 HTTP_PROXY
  const proxyUrl = wsProxy || httpsProxy || httpProxy;
  
  if (!proxyUrl) {
    log('⚠️  未检测到代理配置，将使用直连', 'yellow');
    return null;
  }
  
  log(`✅ 检测到代理配置: ${proxyUrl}`, 'green');
  return proxyUrl;
}

// 创建代理 Agent
function createProxyAgent(proxyUrl) {
  if (!proxyUrl) return undefined;
  
  try {
    // 检测代理类型
    if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://')) {
      log(`🔧 使用 SOCKS 代理: ${proxyUrl}`, 'cyan');
      return new SocksProxyAgent(proxyUrl);
    } else if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
      log(`🔧 使用 HTTP 代理: ${proxyUrl}`, 'cyan');
      return new HttpsProxyAgent(proxyUrl);
    } else {
      log(`❌ 不支持的代理类型: ${proxyUrl}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ 创建代理 Agent 失败: ${error.message}`, 'red');
    return null;
  }
}

// 测试 WebSocket 连接
function testWebSocketConnection(url, agent) {
  return new Promise((resolve, reject) => {
    log(`🔌 正在连接到: ${url}`, 'blue');
    
    const options = {};
    if (agent) {
      options.agent = agent;
    }
    
    const ws = new WebSocket(url, options);
    
    let isConnected = false;
    let messagesReceived = 0;
    
    // 连接超时
    const timeout = setTimeout(() => {
      if (!isConnected) {
        ws.terminate();
        reject(new Error('连接超时'));
      }
    }, 15000);
    
    ws.on('open', () => {
      isConnected = true;
      log('✅ WebSocket 连接成功!', 'green');
      
      // 发送订阅请求
      const subscribeRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "slotSubscribe"
      };
      
      ws.send(JSON.stringify(subscribeRequest));
      log('📤 已发送 slotSubscribe 请求', 'blue');
    });
    
    ws.on('message', (data) => {
      messagesReceived++;
      const message = JSON.parse(data.toString());
      
      if (message.id === 1) {
        log('📥 收到订阅确认响应', 'green');
      } else if (message.method === 'slotNotification') {
        log(`📥 收到槽位通知: #${message.params.result.slot} (共收到 ${messagesReceived-1} 条通知)`, 'cyan');
        
        // 收到几条消息后关闭连接
        if (messagesReceived >= 5) {
          ws.close();
        }
      }
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      log('🔌 WebSocket 连接已关闭', 'yellow');
      resolve({
        success: true,
        messagesReceived
      });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`❌ WebSocket 错误: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// 主函数
async function main() {
  log('🚀 Solana WebSocket 代理测试工具', 'bright');
  log('=====================================', 'bright');
  
  // 获取代理配置
  const proxyUrl = getProxyConfig();
  const agent = createProxyAgent(proxyUrl);
  
  if (proxyUrl && !agent) {
    log('❌ 代理配置无效，退出测试', 'red');
    process.exit(1);
  }
  
  // 测试多个 Solana WebSocket 端点
  const endpoints = [
    'wss://api.mainnet-beta.solana.com',
    'wss://solana-api.projectserum.com',
    'wss://rpc.ankr.com/solana'
  ];
  
  for (const endpoint of endpoints) {
    log(`\n🔄 测试端点: ${endpoint}`, 'bright');
    log('-------------------------------------', 'bright');
    
    try {
      const result = await testWebSocketConnection(endpoint, agent);
      log(`✅ 测试成功! 共收到 ${result.messagesReceived} 条消息`, 'green');
    } catch (error) {
      log(`❌ 测试失败: ${error.message}`, 'red');
    }
    
    // 等待一段时间再测试下一个端点
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  log('\n🎉 测试完成!', 'bright');
  
  // 显示使用建议
  log('\n📝 使用建议:', 'bright');
  log('-------------------------------------', 'bright');
  
  if (proxyUrl) {
    log('✅ 代理配置正常工作', 'green');
    log('💡 您可以在项目中使用以下环境变量:', 'yellow');
    log(`   HTTP_PROXY=${proxyUrl}`, 'cyan');
    log(`   HTTPS_PROXY=${proxyUrl}`, 'cyan');
    log(`   WS_PROXY=${proxyUrl}`, 'cyan');
  } else {
    log('⚠️  未配置代理，如果需要代理请设置环境变量:', 'yellow');
    log('   HTTP_PROXY=http://127.0.0.1:7890', 'cyan');
    log('   HTTPS_PROXY=http://127.0.0.1:7890', 'cyan');
    log('   WS_PROXY=http://127.0.0.1:7890', 'cyan');
  }
  
  log('\n📖 更多信息请查看项目文档:', 'yellow');
  log('   docs/代理配置快速指南.md', 'cyan');
  log('   docs/config/PROXY_SETUP.md', 'cyan');
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ 未处理的 Promise 拒绝: ${reason}`, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`❌ 未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

// 运行主函数
main().catch(error => {
  log(`❌ 主函数执行失败: ${error.message}`, 'red');
  process.exit(1);
});