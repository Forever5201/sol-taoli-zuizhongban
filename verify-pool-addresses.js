/**
 * 验证 markets.toml 中的池子地址是否有效
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function verifyPoolAddresses() {
  console.log('=== 验证池子地址 ===\n');
  
  // 创建连接（先尝试不使用代理）
  console.log('尝试连接 RPC...\n');
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // 从 markets.toml 读取池子地址
  const pools = [
    {
      name: 'SOL/USDC',
      address: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    },
    {
      name: 'SOL/USDT',  
      address: '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
    },
  ];
  
  console.log('检查池子账户...\n');
  
  for (const pool of pools) {
    try {
      const pubkey = new PublicKey(pool.address);
      const accountInfo = await connection.getAccountInfo(pubkey);
      
      if (!accountInfo) {
        console.log(`❌ ${pool.name}: 账户不存在`);
        console.log(`   地址: ${pool.address}\n`);
        continue;
      }
      
      if (!accountInfo.data) {
        console.log(`❌ ${pool.name}: 账户存在但没有数据`);
        console.log(`   地址: ${pool.address}\n`);
        continue;
      }
      
      console.log(`✅ ${pool.name}: 账户存在`);
      console.log(`   地址: ${pool.address}`);
      console.log(`   数据大小: ${accountInfo.data.length} bytes`);
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      
      // 检查是否是 Raydium V4 程序
      const RAYDIUM_V4_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
      if (accountInfo.owner.toBase58() === RAYDIUM_V4_PROGRAM) {
        console.log(`   ✅ 正确的 Raydium V4 程序`);
      } else {
        console.log(`   ⚠️  警告: 不是 Raydium V4 程序`);
      }
      
      // 尝试解析 token 账户地址
      if (accountInfo.data.length >= 280) {
        const coinTokenAccount = new PublicKey(accountInfo.data.slice(216, 248));
        const pcTokenAccount = new PublicKey(accountInfo.data.slice(248, 280));
        
        console.log(`   Coin Token Account: ${coinTokenAccount.toBase58()}`);
        console.log(`   PC Token Account: ${pcTokenAccount.toBase58()}`);
        
        // 检查 token 账户是否存在
        const [coinAccount, pcAccount] = await connection.getMultipleAccountsInfo([
          coinTokenAccount,
          pcTokenAccount,
        ]);
        
        if (!coinAccount) {
          console.log(`   ❌ Coin Token Account 不存在！`);
        } else if (!coinAccount.data) {
          console.log(`   ❌ Coin Token Account 存在但没有 data！`);
        } else {
          console.log(`   ✅ Coin Token Account 有效 (${coinAccount.data.length} bytes)`);
        }
        
        if (!pcAccount) {
          console.log(`   ❌ PC Token Account 不存在！`);
        } else if (!pcAccount.data) {
          console.log(`   ❌ PC Token Account 存在但没有 data！`);
        } else {
          console.log(`   ✅ PC Token Account 有效 (${pcAccount.data.length} bytes)`);
        }
      }
      
      console.log();
    } catch (error) {
      console.log(`❌ ${pool.name}: 检查失败`);
      console.log(`   错误: ${error.message}\n`);
    }
  }
}

verifyPoolAddresses().catch(console.error);

