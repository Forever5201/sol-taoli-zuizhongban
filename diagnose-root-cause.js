/**
 * Bug 根本原因诊断脚本
 * 
 * 测试：
 * 1. 代理是否可用
 * 2. RPC 是否可达（通过代理）
 * 3. RPC 是否可达（不通过代理）
 * 4. 池子地址是否有效
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

const PROXY_URL = 'http://127.0.0.1:7890';
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const POOL_ADDRESS = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

console.log('======================================');
console.log('  Bug 根本原因诊断');
console.log('======================================\n');

// 测试 1: 代理连通性
async function test1_ProxyConnectivity() {
  console.log('【测试 1】代理连通性');
  console.log(`代理地址: ${PROXY_URL}\n`);
  
  return new Promise((resolve) => {
    const agent = new HttpsProxyAgent(PROXY_URL);
    
    const req = https.get('https://www.google.com', { agent, timeout: 5000 }, (res) => {
      console.log(`✅ 代理可用`);
      console.log(`   状态码: ${res.statusCode}`);
      resolve(true);
      req.destroy();
    });
    
    req.on('error', (error) => {
      console.log(`❌ 代理不可用或无法访问外网`);
      console.log(`   错误: ${error.message}\n`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`❌ 代理超时\n`);
      req.destroy();
      resolve(false);
    });
  });
}

// 测试 2: 通过代理访问 Solana RPC
async function test2_RPCWithProxy() {
  console.log('\n【测试 2】通过代理访问 Solana RPC');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`代理: ${PROXY_URL}\n`);
  
  return new Promise((resolve) => {
    const agent = new HttpsProxyAgent(PROXY_URL);
    
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getVersion',
      params: []
    });
    
    const req = https.request(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      agent,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ Solana RPC 可达（通过代理）`);
          console.log(`   版本: ${JSON.stringify(result.result)}\n`);
          resolve(true);
        } catch (e) {
          console.log(`❌ 响应解析失败: ${e.message}\n`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Solana RPC 不可达（通过代理）`);
      console.log(`   错误: ${error.message}`);
      console.log(`   这是 bug 的根本原因！\n`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`❌ Solana RPC 超时（通过代理）\n`);
      req.destroy();
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 测试 3: 不通过代理访问 Solana RPC
async function test3_RPCWithoutProxy() {
  console.log('【测试 3】不通过代理访问 Solana RPC');
  console.log(`RPC: ${RPC_URL}\n`);
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getVersion',
      params: []
    });
    
    const req = https.request(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ Solana RPC 可达（直连）`);
          console.log(`   版本: ${JSON.stringify(result.result)}\n`);
          resolve(true);
        } catch (e) {
          console.log(`❌ 响应解析失败: ${e.message}\n`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Solana RPC 不可达（直连）`);
      console.log(`   错误: ${error.message}\n`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`❌ Solana RPC 超时（直连）\n`);
      req.destroy();
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 测试 4: 使用 Solana Web3.js 获取池子账户（如果 RPC 可达）
async function test4_GetPoolAccount(useProxy) {
  console.log(`【测试 4】获取池子账户数据${useProxy ? '（通过代理）' : '（直连）'}`);
  console.log(`池子地址: ${POOL_ADDRESS}\n`);
  
  try {
    let connection;
    
    if (useProxy) {
      const agent = new HttpsProxyAgent(PROXY_URL);
      const customFetch = (input, init) => {
        return fetch(input, {
          ...init,
          agent: agent,
        });
      };
      
      connection = new Connection(RPC_URL, {
        fetch: customFetch,
      });
    } else {
      connection = new Connection(RPC_URL);
    }
    
    const pubkey = new PublicKey(POOL_ADDRESS);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (!accountInfo) {
      console.log(`❌ 池子账户不存在或无法获取`);
      console.log(`   这可能导致后续解析失败！\n`);
      return false;
    }
    
    if (!accountInfo.data) {
      console.log(`❌ 池子账户存在但没有 data 字段`);
      console.log(`   这会导致 '_bn' 错误！\n`);
      return false;
    }
    
    console.log(`✅ 池子账户获取成功`);
    console.log(`   数据大小: ${accountInfo.data.length} bytes`);
    console.log(`   Owner: ${accountInfo.owner.toBase58()}\n`);
    
    return true;
  } catch (error) {
    console.log(`❌ 获取池子账户失败`);
    console.log(`   错误: ${error.message}`);
    console.log(`   这就是导致 '_bn' 错误的直接原因！\n`);
    return false;
  }
}

// 主函数
async function diagnose() {
  const proxyOK = await test1_ProxyConnectivity();
  const rpcWithProxyOK = await test2_RPCWithProxy();
  const rpcWithoutProxyOK = await test3_RPCWithoutProxy();
  
  let poolWithProxyOK = false;
  let poolWithoutProxyOK = false;
  
  if (rpcWithProxyOK) {
    poolWithProxyOK = await test4_GetPoolAccount(true);
  }
  
  if (rpcWithoutProxyOK) {
    poolWithoutProxyOK = await test4_GetPoolAccount(false);
  }
  
  // 总结
  console.log('======================================');
  console.log('  诊断总结');
  console.log('======================================\n');
  
  console.log(`代理连通性: ${proxyOK ? '✅' : '❌'}`);
  console.log(`RPC（通过代理）: ${rpcWithProxyOK ? '✅' : '❌'}`);
  console.log(`RPC（直连）: ${rpcWithoutProxyOK ? '✅' : '❌'}`);
  console.log(`池子账户（通过代理）: ${poolWithProxyOK ? '✅' : '❌'}`);
  console.log(`池子账户（直连）: ${poolWithoutProxyOK ? '✅' : '❌'}`);
  
  console.log('\n======================================');
  console.log('  根本原因分析');
  console.log('======================================\n');
  
  if (!proxyOK) {
    console.log('🔴 根本原因：代理服务不可用或无法连接外网');
    console.log('   解决方案：');
    console.log('   1. 检查代理服务是否正常运行');
    console.log('   2. 或者在 .env 中注释掉代理配置：');
    console.log('      # HTTP_PROXY=http://127.0.0.1:7890');
    console.log('      # HTTPS_PROXY=http://127.0.0.1:7890');
  } else if (!rpcWithProxyOK && rpcWithoutProxyOK) {
    console.log('🔴 根本原因：代理可用但无法访问 Solana RPC');
    console.log('   可能原因：');
    console.log('   1. 代理规则阻止了 Solana RPC 的域名');
    console.log('   2. 代理本身无法解析或连接到 api.mainnet-beta.solana.com');
    console.log('   解决方案：');
    console.log('   1. 在代理软件中添加规则允许 api.mainnet-beta.solana.com');
    console.log('   2. 或使用直连（注释掉 .env 中的代理配置）');
  } else if (!rpcWithProxyOK && !rpcWithoutProxyOK) {
    console.log('🔴 根本原因：无法访问 Solana RPC（代理和直连都失败）');
    console.log('   可能原因：');
    console.log('   1. 网络被防火墙阻止');
    console.log('   2. Solana RPC 端点宕机或限流');
    console.log('   解决方案：');
    console.log('   1. 使用其他 RPC 端点（如 Alchemy, QuickNode）');
    console.log('   2. 检查防火墙设置');
  } else if (!poolWithProxyOK && !poolWithoutProxyOK) {
    console.log('🟡 次要问题：RPC 可达但无法获取池子账户');
    console.log('   可能原因：');
    console.log('   1. 池子地址无效或已被关闭');
    console.log('   2. RPC 限流或账户数据损坏');
    console.log('   解决方案：');
    console.log('   1. 更新 markets.toml 中的池子地址');
    console.log('   2. 使用其他流动性池');
  } else {
    console.log('✅ 所有测试通过！问题可能在代码逻辑中。');
  }
  
  console.log('\n======================================\n');
}

diagnose().catch(console.error);

