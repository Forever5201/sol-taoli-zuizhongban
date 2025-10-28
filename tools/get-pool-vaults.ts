/**
 * 获取 Raydium 池的 Vault 地址
 * 
 * 使用方法:
 * npx tsx tools/get-pool-vaults.ts
 */

import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Raydium SOL/USDC 池地址
const RAYDIUM_SOL_USDC = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

async function getPoolVaults(poolAddress: string) {
  const connection = new Connection(RPC_URL);
  const pubkey = new PublicKey(poolAddress);
  
  console.log(`\n🔍 查询池: ${poolAddress}\n`);
  
  const accountInfo = await connection.getAccountInfo(pubkey);
  if (!accountInfo) {
    throw new Error('池账户不存在');
  }
  
  console.log(`✅ 账户数据大小: ${accountInfo.data.length} 字节\n`);
  
  // Raydium AMM V4 结构偏移量
  // 前面是 19 个 u64 (152 bytes)
  // 然后是 12 个 Pubkey (384 bytes)
  // coin_vault 和 pc_vault 在这 12 个 Pubkey 中
  
  const BASE_OFFSET = 19 * 8; // 152 bytes
  
  // 读取关键的 Pubkey
  const coinMint = new PublicKey(accountInfo.data.slice(BASE_OFFSET + 0, BASE_OFFSET + 32));
  const pcMint = new PublicKey(accountInfo.data.slice(BASE_OFFSET + 32, BASE_OFFSET + 64));
  const lpMint = new PublicKey(accountInfo.data.slice(BASE_OFFSET + 64, BASE_OFFSET + 96));
  
  // coin_vault 和 pc_vault 的位置
  const coinVault = new PublicKey(accountInfo.data.slice(BASE_OFFSET + 224, BASE_OFFSET + 256));
  const pcVault = new PublicKey(accountInfo.data.slice(BASE_OFFSET + 256, BASE_OFFSET + 288));
  
  console.log('📋 池信息:');
  console.log('─'.repeat(80));
  console.log(`Base Token Mint:  ${coinMint.toBase58()}`);
  console.log(`Quote Token Mint: ${pcMint.toBase58()}`);
  console.log(`LP Token Mint:    ${lpMint.toBase58()}`);
  console.log('\n💰 Vault 地址:');
  console.log('─'.repeat(80));
  console.log(`Base Vault:       ${coinVault.toBase58()}`);
  console.log(`Quote Vault:      ${pcVault.toBase58()}`);
  
  // 读取储备量
  const BASE_VAULT_AMOUNT_OFFSET = BASE_OFFSET + 384; // 12 Pubkeys
  const coinVaultAmount = accountInfo.data.readBigUInt64LE(BASE_VAULT_AMOUNT_OFFSET);
  const pcVaultAmount = accountInfo.data.readBigUInt64LE(BASE_VAULT_AMOUNT_OFFSET + 8);
  
  console.log('\n📊 当前储备:');
  console.log('─'.repeat(80));
  console.log(`Base Reserve:  ${(Number(coinVaultAmount) / 1e9).toFixed(2)} SOL`);
  console.log(`Quote Reserve: ${(Number(pcVaultAmount) / 1e6).toFixed(2)} USDC`);
  console.log(`Price:         ${((Number(pcVaultAmount) / 1e6) / (Number(coinVaultAmount) / 1e9)).toFixed(4)} USDC/SOL`);
  
  console.log('\n\n📝 复制到 config.toml:');
  console.log('─'.repeat(80));
  console.log(`[[pools]]
pair = "SOL/USDC"
dex = "Raydium"
pool_address = "${poolAddress}"
base_vault = "${coinVault.toBase58()}"
quote_vault = "${pcVault.toBase58()}"
base_decimals = 9  # SOL
quote_decimals = 6 # USDC`);
  console.log('');
  
  return {
    coinMint: coinMint.toBase58(),
    pcMint: pcMint.toBase58(),
    coinVault: coinVault.toBase58(),
    pcVault: pcVault.toBase58(),
    coinVaultAmount,
    pcVaultAmount,
  };
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║        获取 Raydium 池的 Vault 地址                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    
    await getPoolVaults(RAYDIUM_SOL_USDC);
    
    console.log('\n✅ 完成！现在可以更新 rust-pool-cache/config.toml 文件。\n');
    
  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();



