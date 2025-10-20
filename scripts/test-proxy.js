/**
 * 代理测试脚本
 * 测试代理配置是否正确工作
 */

const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 从环境变量或参数获取代理地址
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

console.log('='.repeat(50));
console.log('代理测试工具');
console.log('='.repeat(50));
console.log();

console.log(`测试代理: ${proxyUrl}`);
console.log();

// 测试 1: 测试代理连接
console.log('[测试 1/3] 测试代理连接...');
testProxyConnection(proxyUrl)
  .then(() => {
    console.log('✅ 代理连接成功\n');
    
    // 测试 2: 测试 Solana RPC
    console.log('[测试 2/3] 测试 Solana RPC...');
    return testSolanaRPC(proxyUrl);
  })
  .then(() => {
    console.log('✅ Solana RPC 连接成功\n');
    
    // 测试 3: 测试 Jupiter API
    console.log('[测试 3/3] 测试 Jupiter API...');
    return testJupiterAPI(proxyUrl);
  })
  .then(() => {
    console.log('✅ Jupiter API 连接成功\n');
    
    console.log('='.repeat(50));
    console.log('✅ 所有测试通过！代理配置正确');
    console.log('='.repeat(50));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n请检查:');
    console.log('1. Clash 是否正在运行');
    console.log('2. 代理端口是否为 7890');
    console.log('3. System Proxy 是否已启用');
    console.log('4. .env 文件中的代理配置');
    process.exit(1);
  });

/**
 * 测试代理连接
 */
function testProxyConnection(proxyUrl) {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/',
      method: 'HEAD',
      agent: agent,
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('连接超时'));
    });
    req.end();
  });
}

/**
 * 测试 Solana RPC
 */
function testSolanaRPC(proxyUrl) {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getHealth',
    });

    const options = {
      hostname: 'api.mainnet-beta.solana.com',
      port: 443,
      path: '/',
      method: 'POST',
      agent: agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.result === 'ok' || response.result) {
            console.log(`   RPC 响应: ${JSON.stringify(response).substring(0, 100)}...`);
            resolve();
          } else {
            reject(new Error('RPC 响应异常'));
          }
        } catch (e) {
          reject(new Error('解析 RPC 响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('RPC 连接超时'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 测试 Jupiter API
 */
function testJupiterAPI(proxyUrl) {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const options = {
      hostname: 'quote-api.jup.ag',
      port: 443,
      path: '/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50',
      method: 'GET',
      agent: agent,
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.inputMint || response.outputMint) {
              console.log(`   Jupiter 响应: ${JSON.stringify(response).substring(0, 100)}...`);
              resolve();
            } else {
              reject(new Error('Jupiter API 响应异常'));
            }
          } catch (e) {
            reject(new Error('解析 Jupiter 响应失败'));
          }
        } else {
          reject(new Error(`Jupiter API HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Jupiter API 连接超时'));
    });
    req.end();
  });
}
