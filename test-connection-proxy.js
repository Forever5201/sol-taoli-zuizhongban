/**
 * 测试 ConnectionPool 的代理配置是否正确工作
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_URL = 'http://127.0.0.1:7890';
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const POOL_ADDRESS = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

console.log('======================================');
console.log('  测试 Solana Connection 代理配置');
console.log('======================================\n');

// 测试 1: 使用正确的代理配置方式
async function test1_CorrectProxySetup() {
  console.log('【测试 1】正确的代理配置方式');
  console.log(`代理: ${PROXY_URL}\n`);
  
  try {
    const agent = new HttpsProxyAgent(PROXY_URL);
    
    // ⚠️ 关键：Node.js 18+ 的原生 fetch 需要使用 dispatcher，而不是 agent
    // 但 @solana/web3.js 的 Connection 可以接受自定义 fetch 函数
    
    const customFetch = (url, options) => {
      // 使用 node-fetch 2.x 来支持代理
      const nodeFetch = require('node-fetch');
      const fetchFn = nodeFetch.default || nodeFetch;
      return fetchFn(url, {
        ...options,
        agent: agent,
      });
    };
    
    const connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      fetch: customFetch,
    });
    
    console.log('尝试获取版本...');
    const version = await connection.getVersion();
    console.log(`✅ 成功！Solana 版本: ${version['solana-core']}`);
    
    console.log('\n尝试获取池子账户...');
    const pubkey = new PublicKey(POOL_ADDRESS);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (!accountInfo) {
      console.log(`❌ 池子账户不存在`);
      return false;
    }
    
    if (!accountInfo.data) {
      console.log(`❌ 池子账户存在但没有 data`);
      return false;
    }
    
    console.log(`✅ 池子账户获取成功！`);
    console.log(`   数据大小: ${accountInfo.data.length} bytes`);
    console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
    
    // 尝试解析 token 账户地址
    if (accountInfo.data.length >= 280) {
      const coinTokenAccount = new PublicKey(accountInfo.data.slice(216, 248));
      const pcTokenAccount = new PublicKey(accountInfo.data.slice(248, 280));
      
      console.log(`   Coin Token Account: ${coinTokenAccount.toBase58()}`);
      console.log(`   PC Token Account: ${pcTokenAccount.toBase58()}`);
      
      // 批量获取 token 账户
      console.log('\n尝试获取 token 账户...');
      const tokenAccounts = await connection.getMultipleAccountsInfo([
        coinTokenAccount,
        pcTokenAccount,
      ]);
      
      console.log(`   Token 账户数量: ${tokenAccounts.length}`);
      console.log(`   Coin Account: ${tokenAccounts[0] ? '✅ 存在' : '❌ null'}`);
      console.log(`   PC Account: ${tokenAccounts[1] ? '✅ 存在' : '❌ null'}`);
      
      if (tokenAccounts[0]) {
        console.log(`   Coin Account data: ${tokenAccounts[0].data ? `✅ ${tokenAccounts[0].data.length} bytes` : '❌ undefined'}`);
      }
      if (tokenAccounts[1]) {
        console.log(`   PC Account data: ${tokenAccounts[1].data ? `✅ ${tokenAccounts[1].data.length} bytes` : '❌ undefined'}`);
      }
      
      // 如果 data 是 undefined，这就是导致 _bn 错误的原因！
      if (tokenAccounts[0] && !tokenAccounts[0].data) {
        console.log('\n🔴 发现问题：tokenAccounts[0].data 是 undefined！');
        console.log('   这会导致后续 parseTokenAccount 时出现 _bn 错误！');
      }
      if (tokenAccounts[1] && !tokenAccounts[1].data) {
        console.log('\n🔴 发现问题：tokenAccounts[1].data 是 undefined！');
        console.log('   这会导致后续 parseTokenAccount 时出现 _bn 错误！');
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
    console.log(`   Stack: ${error.stack?.split('\n')[1]}`);
    return false;
  }
}

// 测试 2: 使用错误的代理配置（模拟当前 ConnectionPool 的问题）
async function test2_IncorrectProxySetup() {
  console.log('\n\n【测试 2】错误的代理配置（模拟可能的问题）');
  
  try {
    const agent = new HttpsProxyAgent(PROXY_URL);
    
    // ❌ 错误方式：尝试直接在 Connection 配置中传入 agent
    // （这不会生效，因为 @solana/web3.js 使用原生 fetch）
    const connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      // agent: agent,  // 这个参数不存在
    });
    
    console.log('尝试获取版本（没有代理配置）...');
    const version = await connection.getVersion();
    console.log(`✅ 成功（可能不通过代理）: ${version['solana-core']}`);
    
    return true;
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
    return false;
  }
}

async function main() {
  const result1 = await test1_CorrectProxySetup();
  // const result2 = await test2_IncorrectProxySetup();
  
  console.log('\n======================================');
  console.log('  诊断结论');
  console.log('======================================\n');
  
  if (result1) {
    console.log('✅ 代理配置正确，可以获取池子数据');
    console.log('\n如果你的 bot 仍然报 _bn 错误，问题可能在：');
    console.log('1. ConnectionPool 的代理配置实现不正确');
    console.log('2. node-fetch 的 require 方式有问题（ES Module vs CommonJS）');
    console.log('3. ConnectionPool 没有正确传递 data 字段');
  } else {
    console.log('❌ 代理配置有问题，需要修复');
  }
}

main().catch(console.error);

