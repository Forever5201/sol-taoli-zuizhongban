const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// 测试通过websocat连接WebSocket
function testWebsocatWithProxy(proxyUrl, wsUrl) {
  return new Promise((resolve, reject) => {
    log(`🔌 使用websocat通过代理测试连接: ${wsUrl}`, 'blue');
    log(`🔧 代理地址: ${proxyUrl}`, 'cyan');
    
    // 在Windows上使用websocat通过代理连接WebSocket
    // 由于websocat可能不直接支持HTTP代理，我们尝试使用环境变量方式
    const env = { ...process.env };
    env.HTTP_PROXY = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
    
    const websocat = spawn('websocat', [wsUrl], { 
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true 
    });
    
    let isConnected = false;
    let output = '';
    
    // 连接超时
    const timeout = setTimeout(() => {
      if (!isConnected) {
        websocat.kill();
        reject(new Error('连接超时'));
      }
    }, 15000);
    
    websocat.stdout.on('data', (data) => {
      output += data.toString();
      log(`📥 收到数据: ${data.toString().trim()}`, 'green');
      isConnected = true;
    });
    
    websocat.stderr.on('data', (data) => {
      const error = data.toString().trim();
      log(`❌ 错误: ${error}`, 'red');
    });
    
    websocat.on('close', (code) => {
      clearTimeout(timeout);
      if (isConnected) {
        resolve({ success: true, output });
      } else {
        reject(new Error(`websocat退出，代码: ${code}`));
      }
    });
    
    websocat.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    // 发送订阅请求
    setTimeout(() => {
      if (websocat.stdin) {
        const subscribeRequest = JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "slotSubscribe"
        });
        websocat.stdin.write(subscribeRequest);
        log('📤 已发送 slotSubscribe 请求', 'blue');
      }
    }, 2000);
  });
}

// 测试直接WebSocket连接（不使用代理）
function testDirectWebSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    log(`🔌 测试直接连接: ${wsUrl}`, 'blue');
    
    const ws = new WebSocket(wsUrl);
    
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
        if (messagesReceived >= 3) {
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
  log('🚀 Solana WebSocket 代理测试工具 (简化版)', 'bright');
  log('=====================================', 'bright');
  
  // 代理配置
  const proxyUrl = 'http://127.0.0.1:7890';
  
  // 测试多个 Solana WebSocket 端点
  const endpoints = [
    'wss://api.mainnet-beta.solana.com'
  ];
  
  for (const endpoint of endpoints) {
    log(`\n🔄 测试端点: ${endpoint}`, 'bright');
    log('-------------------------------------', 'bright');
    
    // 测试直接连接
    log('\n📡 测试直接连接 (不使用代理):', 'yellow');
    try {
      const result = await testDirectWebSocket(endpoint);
      log(`✅ 直接连接成功! 共收到 ${result.messagesReceived} 条消息`, 'green');
    } catch (error) {
      log(`❌ 直接连接失败: ${error.message}`, 'red');
    }
    
    // 等待一段时间再测试代理连接
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试代理连接
    log('\n📡 测试通过代理连接:', 'yellow');
    try {
      const result = await testWebsocatWithProxy(proxyUrl, endpoint);
      log(`✅ 代理连接成功!`, 'green');
    } catch (error) {
      log(`❌ 代理连接失败: ${error.message}`, 'red');
    }
    
    // 等待一段时间再测试下一个端点
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  log('\n🎉 测试完成!', 'bright');
  
  // 显示使用建议
  log('\n📝 使用建议:', 'bright');
  log('-------------------------------------', 'bright');
  
  log('✅ 如果直接连接失败但代理连接成功，说明需要使用代理', 'green');
  log('✅ 如果两者都失败，请检查网络连接和防火墙设置', 'green');
  log('✅ 如果直接连接成功，可能不需要使用代理', 'green');
  
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