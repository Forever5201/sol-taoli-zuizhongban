/**
 * 查询 SolFi V2 和 GoonFi 池子的 vault 地址
 * 
 * 这个脚本会：
 * 1. 查询池子账户数据
 * 2. 解析 Pubkey 字段
 * 3. 验证哪些是 vault（SPL Token 账户）
 * 4. 输出 vault 地址用于配置
 * 
 * 🌐 使用统一的网络适配器
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { NetworkAdapter } = require('../../packages/core');

// 🌐 使用系统的统一网络适配器
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// 池子配置
const POOLS = [
  {
    name: 'SolFi V2 - USDC/USDT #1',
    address: '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc',
    type: 'solfi_v2',
    vaultOffsets: [72, 104], // pubkey_4, pubkey_5 (猜测)
  },
  {
    name: 'SolFi V2 - USDC/USDT #2',
    address: 'FkEB6uvyzuoaGpgs4yRtFtxC4WJxhejNFbUkj5R6wR32',
    type: 'solfi_v2',
    vaultOffsets: [72, 104],
  },
  {
    name: 'GoonFi - USDC/SOL',
    address: '4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K',
    type: 'goonfi',
    vaultOffsets: [96, 128], // 推测位置
  },
];

/**
 * 解析 SPL Token 账户
 */
function parseTokenAccount(data) {
  if (data.length !== 165) {
    return null;
  }
  
  try {
    const mint = new PublicKey(data.slice(0, 32)).toBase58();
    const owner = new PublicKey(data.slice(32, 64)).toBase58();
    const amount = data.readBigUInt64LE(64);
    
    return { mint, owner, amount };
  } catch (e) {
    return null;
  }
}

/**
 * 查找池子中的所有 Pubkey
 */
function findAllPubkeys(data) {
  const pubkeys = [];
  
  for (let offset = 0; offset <= data.length - 32; offset += 32) {
    try {
      const pk = new PublicKey(data.slice(offset, offset + 32));
      const address = pk.toBase58();
      
      // 跳过全零和无效地址
      if (address !== '11111111111111111111111111111111' && 
          !address.includes('11111111')) {
        pubkeys.push({ offset, address });
      }
    } catch (e) {
      // 不是有效的 Pubkey
    }
  }
  
  return pubkeys;
}

/**
 * 查询并验证 vault 地址
 */
async function queryPoolVaults(connection, poolInfo) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📦 ${poolInfo.name}`);
  console.log(`   Address: ${poolInfo.address}`);
  console.log(`   Type: ${poolInfo.type}`);
  console.log(`${'='.repeat(80)}`);
  
  // 获取池子账户数据
  const pubkey = new PublicKey(poolInfo.address);
  const accountInfo = await connection.getAccountInfo(pubkey);
  
  if (!accountInfo) {
    console.log('❌ Pool account not found');
    return null;
  }
  
  console.log(`✅ Pool account found (${accountInfo.data.length} bytes)`);
  
  // 查找所有 Pubkey
  const allPubkeys = findAllPubkeys(accountInfo.data);
  console.log(`   Found ${allPubkeys.length} potential pubkeys`);
  
  // 验证 vault（检查是否是 SPL Token 账户）
  const vaults = [];
  
  console.log(`\n🔍 Checking for vault accounts...`);
  
  for (const pk of allPubkeys.slice(0, 15)) { // 只检查前 15 个
    try {
      const vaultAccount = await connection.getAccountInfo(new PublicKey(pk.address));
      
      if (vaultAccount && vaultAccount.data.length === 165) {
        const tokenInfo = parseTokenAccount(vaultAccount.data);
        
        if (tokenInfo && tokenInfo.amount > 0n) {
          console.log(`\n   ✅ VAULT FOUND!`);
          console.log(`      Offset: ${pk.offset}`);
          console.log(`      Address: ${pk.address}`);
          console.log(`      Mint: ${tokenInfo.mint}`);
          console.log(`      Owner: ${tokenInfo.owner}`);
          console.log(`      Balance: ${tokenInfo.amount.toString()}`);
          
          // 格式化余额（假设 6 decimals）
          const balanceUI = Number(tokenInfo.amount) / 1e6;
          console.log(`      Balance (UI): ${balanceUI.toLocaleString()} tokens`);
          
          vaults.push({
            offset: pk.offset,
            address: pk.address,
            mint: tokenInfo.mint,
            amount: tokenInfo.amount.toString(),
          });
        }
      }
    } catch (e) {
      // 不是 token 账户或查询失败
    }
  }
  
  if (vaults.length === 0) {
    console.log(`   ⚠️  No vault accounts found with balance > 0`);
    console.log(`   💡 Tip: Pool may be empty or using different structure`);
  }
  
  return {
    pool: poolInfo.address,
    name: poolInfo.name,
    type: poolInfo.type,
    vaults,
  };
}

/**
 * 生成配置输出
 */
function generateConfig(results) {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📝 CONFIGURATION OUTPUT`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log('Add these to your config.toml:\n');
  
  for (const result of results) {
    if (result && result.vaults.length >= 2) {
      console.log(`# ${result.name}`);
      console.log(`[[pools]]`);
      console.log(`address = "${result.pool}"`);
      console.log(`name = "${result.name}"`);
      console.log(`pool_type = "${result.type}"`);
      console.log(`requires_vault_reading = true`);
      console.log(`vault_a = "${result.vaults[0].address}"`);
      console.log(`vault_b = "${result.vaults[1].address}"`);
      console.log(``);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  
  let totalVaults = 0;
  let readyPools = 0;
  
  for (const result of results) {
    if (result) {
      console.log(`${result.name}:`);
      console.log(`   Vaults found: ${result.vaults.length}`);
      if (result.vaults.length >= 2) {
        console.log(`   Status: ✅ Ready to activate`);
        readyPools++;
      } else {
        console.log(`   Status: ⚠️  Incomplete (need 2 vaults)`);
      }
      totalVaults += result.vaults.length;
    }
  }
  
  console.log(`\nTotal vaults discovered: ${totalVaults}`);
  console.log(`Pools ready to activate: ${readyPools}/${results.length}`);
  
  if (readyPools === results.length) {
    console.log(`\n🎉 All pools ready! You can now activate them.`);
  } else {
    console.log(`\n⚠️  Some pools need manual investigation.`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Vault Address Query Tool');
  console.log(`   RPC: ${RPC_URL}`);
  
  // 🌐 显示网络配置状态
  if (NetworkAdapter.isProxyEnabled()) {
    console.log(`   Proxy: ✅ Enabled (${NetworkAdapter.getProxyUrl()})`);
  } else {
    console.log(`   Proxy: ❌ Disabled (Direct connection)`);
  }
  
  console.log(`   Pools to check: ${POOLS.length}\n`);
  
  // 🌐 使用统一的网络适配器创建 Connection
  // 注意：@solana/web3.js Connection 目前不直接支持 proxy
  // 但通过 NetworkAdapter 设置的全局代理会自动应用
  const connection = new Connection(RPC_URL, 'confirmed');
  
  const results = [];
  
  for (const pool of POOLS) {
    try {
      const result = await queryPoolVaults(connection, pool);
      results.push(result);
      
      // 添加延迟避免速率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error querying ${pool.name}:`, error.message);
      results.push(null);
    }
  }
  
  // 生成配置
  generateConfig(results.filter(r => r !== null));
}

// 运行
main().catch(console.error);

