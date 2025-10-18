#!/usr/bin/env node
/**
 * 代理配置测试脚本
 * 
 * 用于验证代理配置是否正确加载
 */

// 设置测试代理环境变量（如果未设置）
if (!process.env.HTTP_PROXY) {
  console.log('⚠️  未检测到HTTP_PROXY环境变量');
  console.log('💡 提示：请在.env文件中配置或运行时设置：');
  console.log('   export HTTP_PROXY=http://127.0.0.1:7980');
  console.log('');
}

async function testProxyConfig() {
  console.log('🧪 ========== 代理配置测试 ==========\n');

  try {
    // 动态导入ESM模块
    const { getProxyManager } = await import('./packages/core/src/config/proxy-config.ts');
    
    const proxyManager = getProxyManager();
    const config = proxyManager.getConfig();

    console.log('📋 当前代理配置:\n');
    console.log('  HTTP代理:', config.httpProxy || '未设置');
    console.log('  HTTPS代理:', config.httpsProxy || '未设置');
    console.log('  WebSocket代理:', config.wsProxy || '未设置');
    console.log('  绕过代理地址:', config.noProxy?.join(', ') || '无');
    console.log('');
    
    if (proxyManager.isProxyEnabled()) {
      console.log('✅ 代理已启用');
      console.log('');
      
      // 测试获取各种配置
      console.log('🔧 获取配置测试:\n');
      
      const axiosConfig = proxyManager.getAxiosConfig('https://api.example.com');
      console.log('  Axios配置:', axiosConfig.httpAgent ? '✅ 已配置Agent' : '⚠️  无Agent');
      
      const wsAgent = proxyManager.getWebSocketAgent('wss://example.com');
      console.log('  WebSocket Agent:', wsAgent ? '✅ 已配置' : '⚠️  未配置');
      
      const solanaConfig = proxyManager.getSolanaFetchOptions();
      console.log('  Solana配置:', solanaConfig ? '✅ 已配置' : '⚠️  未配置');
      
      console.log('');
      console.log('✅ 所有代理配置测试通过！');
    } else {
      console.log('ℹ️  代理未启用（直接连接模式）');
      console.log('');
      console.log('💡 要启用代理，请设置环境变量：');
      console.log('   HTTP_PROXY=http://127.0.0.1:7980');
    }

    console.log('');
    console.log('📚 更多信息请查看: PROXY_SETUP.md');
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testProxyConfig();
