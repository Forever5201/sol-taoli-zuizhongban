/**
 * 深入分析 Raydium 池子数据结构
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_URL = 'http://127.0.0.1:7890';
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const POOL_ADDRESS = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

async function analyzePoolStructure() {
  console.log('======================================');
  console.log('  Raydium 池子结构分析');
  console.log('======================================\n');
  
  const agent = new HttpsProxyAgent(PROXY_URL);
  
  const customFetch = (url, options) => {
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
  
  const pubkey = new PublicKey(POOL_ADDRESS);
  const accountInfo = await connection.getAccountInfo(pubkey);
  
  if (!accountInfo || !accountInfo.data) {
    console.log('❌ 无法获取池子数据');
    return;
  }
  
  const data = accountInfo.data;
  console.log(`池子数据大小: ${data.length} bytes`);
  console.log(`Owner: ${accountInfo.owner.toBase58()}\n`);
  
  // Raydium AMM V4 结构参考：
  // https://github.com/raydium-io/raydium-sdk/blob/master/src/raydium/liquidity/layout.ts
  
  console.log('=== 关键字段解析 ===\n');
  
  let offset = 0;
  
  // 读取 u64
  const readU64 = () => {
    const value = data.readBigUInt64LE(offset);
    offset += 8;
    return value;
  };
  
  // 读取 PublicKey
  const readPubkey = () => {
    const key = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    return key;
  };
  
  // 跳过字节
  const skip = (n) => {
    offset += n;
  };
  
  // 解析
  const status = readU64();
  const nonce = readU64();
  const orderNum = readU64();
  const depth = readU64();
  const coinDecimals = readU64();
  const pcDecimals = readU64();
  const state = readU64();
  const resetFlag = readU64();
  const minSize = readU64();
  const volMaxCutRatio = readU64();
  const amountWaveRatio = readU64();
  const coinLotSize = readU64();
  const pcLotSize = readU64();
  const minPriceMultiplier = readU64();
  const maxPriceMultiplier = readU64();
  const systemDecimalsValue = readU64();
  // offset 现在应该在 128
  
  console.log(`Status: ${status}`);
  console.log(`Nonce: ${nonce}`);
  console.log(`Coin Decimals: ${coinDecimals}`);
  console.log(`PC Decimals: ${pcDecimals}`);
  console.log(`当前 offset: ${offset}\n`);
  
  // 继续读取重要的公钥
  const ammId = readPubkey();
  const ammAuthority = readPubkey();
  const ammOpenOrders = readPubkey();
  const ammTargetOrders = readPubkey();
  const poolCoinTokenAccount = readPubkey();
  const poolPcTokenAccount = readPubkey();
  
  console.log(`=== Token 账户地址 ===`);
  console.log(`AMM ID: ${ammId.toBase58()}`);
  console.log(`AMM Authority: ${ammAuthority.toBase58()}`);
  console.log(`AMM Open Orders: ${ammOpenOrders.toBase58()}`);
  console.log(`AMM Target Orders: ${ammTargetOrders.toBase58()}`);
  console.log(`Pool Coin Token Account: ${poolCoinTokenAccount.toBase58()}`);
  console.log(`Pool PC Token Account: ${poolPcTokenAccount.toBase58()}`);
  console.log(`当前 offset: ${offset}\n`);
  
  // 验证这些地址
  console.log('=== 验证 Token 账户 ===\n');
  
  const [coinAccount, pcAccount] = await connection.getMultipleAccountsInfo([
    poolCoinTokenAccount,
    poolPcTokenAccount,
  ]);
  
  console.log(`Coin Token Account (${poolCoinTokenAccount.toBase58()}):`);
  if (!coinAccount) {
    console.log('  ❌ 账户不存在');
  } else {
    console.log(`  ✅ 账户存在`);
    console.log(`  数据大小: ${coinAccount.data?.length || 0} bytes`);
    console.log(`  Owner: ${coinAccount.owner.toBase58()}`);
    
    if (coinAccount.data && coinAccount.data.length === 165) {
      const amount = coinAccount.data.readBigUInt64LE(64);
      console.log(`  余额: ${amount} (原始值)`);
      console.log(`  余额: ${Number(amount) / Math.pow(10, Number(coinDecimals))} (格式化)`);
    }
  }
  
  console.log();
  console.log(`PC Token Account (${poolPcTokenAccount.toBase58()}):`);
  if (!pcAccount) {
    console.log('  ❌ 账户不存在');
  } else {
    console.log(`  ✅ 账户存在`);
    console.log(`  数据大小: ${pcAccount.data?.length || 0} bytes`);
    console.log(`  Owner: ${pcAccount.owner.toBase58()}`);
    
    if (pcAccount.data && pcAccount.data.length === 165) {
      const amount = pcAccount.data.readBigUInt64LE(64);
      console.log(`  余额: ${amount} (原始值)`);
      console.log(`  余额: ${Number(amount) / Math.pow(10, Number(pcDecimals))} (格式化)`);
    }
  }
  
  console.log('\n======================================');
  console.log('  结论');
  console.log('======================================\n');
  
  if (!coinAccount || !pcAccount) {
    console.log('🔴 根本原因：Token 账户不存在');
    console.log('\n可能原因：');
    console.log('1. 池子已被关闭或迁移');
    console.log('2. 解析的 offset 不正确');
    console.log('3. 这不是一个标准的 Raydium V4 池子');
    console.log('\n解决方案：');
    console.log('1. 使用其他流动性池（更新 markets.toml）');
    console.log('2. 检查 Raydium SDK 最新的池子结构定义');
  } else if (!coinAccount.data || !pcAccount.data) {
    console.log('🔴 根本原因：Token 账户存在但没有数据');
    console.log('\n这会导致 parseTokenAccount 时出现 _bn 错误！');
  } else {
    console.log('✅ Token 账户正常，可以读取储备量');
    console.log('\n如果 bot 仍然报错，问题在代码的防御性检查不足。');
  }
}

analyzePoolStructure().catch(console.error);

