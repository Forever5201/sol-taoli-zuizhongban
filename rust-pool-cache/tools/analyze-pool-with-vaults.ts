/**
 * 池子数据分析工具 - 从 Vault 读取真实储备量
 * 
 * 这个工具帮助我们：
 * 1. 分析池子的账户数据结构
 * 2. 从 token vault 账户读取真实储备量
 * 3. 对比池子数据中的字段，找到正确的储备量位置
 * 
 * 使用方法:
 * npx tsx rust-pool-cache/tools/analyze-pool-with-vaults.ts <POOL_ADDRESS>
 */

import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

interface TokenAccountInfo {
  mint: string;
  owner: string;
  amount: bigint;
}

/**
 * 解析 SPL Token 账户数据
 */
function parseTokenAccount(data: Buffer): TokenAccountInfo {
  // SPL Token 账户布局
  // offset 0-32: mint (PublicKey)
  // offset 32-64: owner (PublicKey)
  // offset 64-72: amount (u64)
  
  const mint = new PublicKey(data.slice(0, 32)).toBase58();
  const owner = new PublicKey(data.slice(32, 64)).toBase58();
  const amount = data.readBigUInt64LE(64);
  
  return { mint, owner, amount };
}

/**
 * 分析池子账户数据，查找所有可能的 Pubkey 和 u64 字段
 */
function analyzePoolData(data: Buffer, poolSize: number) {
  console.log(`\n=== 池子数据分析 (${poolSize} 字节) ===\n`);
  
  const pubkeys: { offset: number; address: string }[] = [];
  const u64Values: { offset: number; value: bigint }[] = [];
  
  // 查找所有可能的 Pubkey (32 字节)
  for (let offset = 0; offset <= data.length - 32; offset++) {
    try {
      const pubkey = new PublicKey(data.slice(offset, offset + 32));
      const address = pubkey.toBase58();
      
      // 检查是否是有效的 Pubkey (不全是 0)
      const isNotZero = data.slice(offset, offset + 32).some(b => b !== 0);
      if (isNotZero) {
        pubkeys.push({ offset, address });
      }
    } catch (e) {
      // 无效的 Pubkey，跳过
    }
  }
  
  // 查找所有 u64 值
  for (let offset = 0; offset <= data.length - 8; offset += 8) {
    const value = data.readBigUInt64LE(offset);
    u64Values.push({ offset, value });
  }
  
  return { pubkeys, u64Values };
}

/**
 * 查找储备量字段位置
 */
async function findReserveFields(
  connection: Connection,
  poolData: Buffer,
  vaultAddresses: string[],
  realReserves: bigint[]
) {
  console.log('\n🔍 查找储备量字段位置...\n');
  
  // 查找所有 u64 值
  const u64Values: { offset: number; value: bigint }[] = [];
  for (let offset = 0; offset <= poolData.length - 8; offset += 8) {
    const value = poolData.readBigUInt64LE(offset);
    u64Values.push({ offset, value });
  }
  
  // 对于每个真实储备量，查找匹配的字段
  const matches: { reserve: bigint; offset: number; exactMatch: boolean }[] = [];
  
  for (let i = 0; i < realReserves.length; i++) {
    const realReserve = realReserves[i];
    
    console.log(`\n储备 ${i + 1}: ${realReserve.toString()}`);
    console.log(`Vault: ${vaultAddresses[i]}`);
    console.log('查找匹配的字段...');
    
    // 查找精确匹配
    const exactMatches = u64Values.filter(v => v.value === realReserve);
    if (exactMatches.length > 0) {
      console.log(`✅ 找到 ${exactMatches.length} 个精确匹配:`);
      exactMatches.forEach(m => {
        console.log(`   offset ${m.offset}: ${m.value.toString()}`);
        matches.push({ reserve: realReserve, offset: m.offset, exactMatch: true });
      });
    } else {
      console.log(`⚠️  未找到精确匹配`);
      
      // 查找接近的值 (±10%)
      const similarMatches = u64Values.filter(v => {
        const diff = Number(v.value) - Number(realReserve);
        const ratio = Math.abs(diff) / Number(realReserve);
        return ratio < 0.1 && v.value > 0;
      });
      
      if (similarMatches.length > 0) {
        console.log(`🔍 找到 ${similarMatches.length} 个接近的值:`);
        similarMatches.forEach(m => {
          const diff = Number(m.value) - Number(realReserve);
          const ratio = (diff / Number(realReserve) * 100).toFixed(2);
          console.log(`   offset ${m.offset}: ${m.value.toString()} (差异 ${ratio}%)`);
        });
      }
    }
  }
  
  return matches;
}

/**
 * 分析单个池子
 */
async function analyzePool(poolAddress: string, poolType?: string) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const pubkey = new PublicKey(poolAddress);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 分析池: ${poolAddress}`);
  if (poolType) {
    console.log(`   类型: ${poolType}`);
  }
  console.log(`${'='.repeat(80)}`);
  
  // 1. 获取池子账户数据
  console.log('\n📥 获取池子账户数据...');
  const accountInfo = await connection.getAccountInfo(pubkey);
  if (!accountInfo) {
    throw new Error('❌ 池账户不存在');
  }
  
  const poolData = accountInfo.data;
  console.log(`✅ 数据大小: ${poolData.length} 字节`);
  console.log(`   所有者: ${accountInfo.owner.toBase58()}`);
  
  // 2. 分析池子数据结构
  const { pubkeys, u64Values } = analyzePoolData(poolData, poolData.length);
  
  console.log(`\n找到 ${pubkeys.length} 个可能的 Pubkey 字段`);
  console.log(`找到 ${u64Values.length} 个 u64 值`);
  
  // 3. 显示前面的 Pubkey 字段
  console.log(`\n📋 前 15 个 Pubkey 字段:`);
  console.log('─'.repeat(80));
  for (let i = 0; i < Math.min(15, pubkeys.length); i++) {
    const pk = pubkeys[i];
    console.log(`[offset ${String(pk.offset).padStart(4)}] ${pk.address}`);
  }
  
  // 4. 检查这些 Pubkey 是否是 token 账户
  console.log(`\n💰 检查 Token Vault 账户...`);
  console.log('─'.repeat(80));
  
  const vaultCandidates: { offset: number; address: string; amount: bigint; mint: string }[] = [];
  
  for (const pk of pubkeys.slice(0, 20)) { // 只检查前 20 个
    try {
      const accountInfo = await connection.getAccountInfo(new PublicKey(pk.address));
      if (accountInfo && accountInfo.data.length === 165) {
        // 这是一个 SPL Token 账户
        const tokenInfo = parseTokenAccount(accountInfo.data);
        
        if (tokenInfo.amount > 0n) {
          console.log(`\n✅ Token Vault 找到！`);
          console.log(`   Offset: ${pk.offset}`);
          console.log(`   地址: ${pk.address}`);
          console.log(`   Mint: ${tokenInfo.mint}`);
          console.log(`   余额: ${tokenInfo.amount.toString()}`);
          
          vaultCandidates.push({
            offset: pk.offset,
            address: pk.address,
            amount: tokenInfo.amount,
            mint: tokenInfo.mint
          });
        }
      }
    } catch (e) {
      // 不是 token 账户，跳过
    }
  }
  
  // 5. 如果找到了 vault，查找对应的储备量字段
  if (vaultCandidates.length >= 2) {
    console.log(`\n\n🎯 找到 ${vaultCandidates.length} 个 Token Vault！`);
    console.log('─'.repeat(80));
    
    const vaultAddresses = vaultCandidates.map(v => v.address);
    const realReserves = vaultCandidates.map(v => v.amount);
    
    await findReserveFields(connection, poolData, vaultAddresses, realReserves);
    
    // 6. 显示可能的储备量字段
    console.log(`\n\n📊 所有大于 100M 的 u64 值:`);
    console.log('─'.repeat(80));
    
    const largeValues = u64Values.filter(v => v.value > 100_000_000n && v.value < 100_000_000_000_000n);
    largeValues.forEach((v, idx) => {
      const isMatch = realReserves.some(r => r === v.value);
      const marker = isMatch ? '✅' : '  ';
      console.log(`${marker} [offset ${String(v.offset).padStart(4)}] ${v.value.toString()}`);
      
      if (idx < 30) {
        // 显示格式化的值 (假设 6 decimals)
        const formatted = (Number(v.value) / 1e6).toFixed(2);
        console.log(`      → ${formatted} (假设 6 decimals)`);
      }
    });
    
    // 7. 总结
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📝 总结');
    console.log(`${'='.repeat(80)}`);
    console.log(`\nToken Vault 地址:`);
    vaultCandidates.forEach((v, i) => {
      console.log(`  Vault ${i + 1} (offset ${v.offset}): ${v.address}`);
      console.log(`    Mint:   ${v.mint}`);
      console.log(`    余额:   ${v.amount.toString()}`);
    });
    
  } else {
    console.log(`\n⚠️  未找到足够的 Token Vault (需要至少 2 个，找到 ${vaultCandidates.length} 个)`);
  }
  
  // 8. 保存原始数据用于进一步分析
  console.log(`\n\n💾 前 512 字节 (十六进制):`);
  console.log('─'.repeat(80));
  for (let i = 0; i < Math.min(512, poolData.length); i += 32) {
    const chunk = poolData.slice(i, Math.min(i + 32, poolData.length));
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`[${String(i).padStart(4)}] ${hex}`);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: npx tsx rust-pool-cache/tools/analyze-pool-with-vaults.ts <POOL_ADDRESS> [POOL_TYPE]');
    console.log('\n示例:');
    console.log('  npx tsx rust-pool-cache/tools/analyze-pool-with-vaults.ts 65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc solfi_v2');
    console.log('\n预设池子:');
    console.log('  SolFi V2 USDC/USDT:  65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc');
    console.log('  AlphaQ USDT/USDC:    Pi9nzTjPxD8DsRfRBGfKYzmefJoJM8TcXu2jyaQjSHm');
    console.log('  GoonFi USDC/SOL:     4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K');
    console.log('  HumidiFi JUP/USDC:   hKgG7iEDRFNsJSwLYqz8ETHuZwzh6qMMLow8VXa8pLm');
    process.exit(1);
  }
  
  const poolAddress = args[0];
  const poolType = args[1];
  
  try {
    await analyzePool(poolAddress, poolType);
  } catch (error) {
    console.error(`\n❌ 错误: ${error}`);
    process.exit(1);
  }
}

main();




