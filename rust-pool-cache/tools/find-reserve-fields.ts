/**
 * 精确定位储备量字段工具
 * 
 * 通过对比 Token Vault 的真实余额和池子账户数据中的所有 u64 字段，
 * 精确找到储备量字段的位置。
 * 
 * 使用方法:
 * npx tsx rust-pool-cache/tools/find-reserve-fields.ts <POOL_ADDRESS> <POOL_TYPE>
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
  const mint = new PublicKey(data.slice(0, 32)).toBase58();
  const owner = new PublicKey(data.slice(32, 64)).toBase58();
  const amount = data.readBigUInt64LE(64);
  
  return { mint, owner, amount };
}

/**
 * 查找池子数据中的所有 Pubkey
 */
function findPubkeys(data: Buffer): Array<{ offset: number; address: string }> {
  const pubkeys: Array<{ offset: number; address: string }> = [];
  
  // 按 8 字节对齐扫描
  for (let offset = 0; offset <= data.length - 32; offset += 8) {
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
  
  return pubkeys;
}

/**
 * 查找池子数据中的所有 u64 值
 */
function findU64Values(data: Buffer): Array<{ offset: number; value: bigint }> {
  const values: Array<{ offset: number; value: bigint }> = [];
  
  // 按 8 字节对齐扫描
  for (let offset = 0; offset <= data.length - 8; offset += 8) {
    const value = data.readBigUInt64LE(offset);
    values.push({ offset, value });
  }
  
  return values;
}

/**
 * 主分析函数
 */
async function analyzePool(poolAddress: string, poolType: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 精确定位储备量字段`);
  console.log(`${'='.repeat(80)}`);
  console.log(`池子地址: ${poolAddress}`);
  console.log(`池子类型: ${poolType}`);
  console.log();
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const poolPubkey = new PublicKey(poolAddress);
  
  // 1. 获取池子账户数据
  console.log('📥 步骤 1: 获取池子账户数据...');
  const poolAccount = await connection.getAccountInfo(poolPubkey);
  
  if (!poolAccount) {
    throw new Error('池子账户不存在');
  }
  
  const poolData = poolAccount.data;
  console.log(`✅ 数据大小: ${poolData.length} 字节`);
  console.log(`   所有者: ${poolAccount.owner.toBase58()}`);
  console.log();
  
  // 2. 查找所有 Pubkey（寻找 vault 地址）
  console.log('🔍 步骤 2: 查找 Token Vault 地址...');
  const pubkeys = findPubkeys(poolData);
  console.log(`   找到 ${pubkeys.length} 个可能的 Pubkey`);
  
  // 3. 检查哪些是 Token Vault
  const vaults: Array<{
    offset: number;
    address: string;
    mint: string;
    amount: bigint;
  }> = [];
  
  for (const pk of pubkeys) {
    try {
      const accountInfo = await connection.getAccountInfo(new PublicKey(pk.address));
      
      // SPL Token 账户大小是 165 字节
      if (accountInfo && accountInfo.data.length === 165) {
        const tokenInfo = parseTokenAccount(accountInfo.data);
        
        if (tokenInfo.amount > 0n) {
          vaults.push({
            offset: pk.offset,
            address: pk.address,
            mint: tokenInfo.mint,
            amount: tokenInfo.amount,
          });
          
          console.log(`\n✅ Token Vault 找到！`);
          console.log(`   Offset:  ${pk.offset}`);
          console.log(`   地址:    ${pk.address}`);
          console.log(`   Mint:    ${tokenInfo.mint}`);
          console.log(`   余额:    ${tokenInfo.amount.toString()}`);
          console.log(`   格式化:  ${(Number(tokenInfo.amount) / 1e6).toFixed(2)} (6 decimals)`);
          console.log(`            ${(Number(tokenInfo.amount) / 1e9).toFixed(4)} (9 decimals)`);
        }
      }
    } catch (e) {
      // 不是 token 账户，跳过
    }
  }
  
  if (vaults.length < 2) {
    console.log(`\n⚠️  警告: 只找到 ${vaults.length} 个 vault（预期至少 2 个）`);
  }
  
  console.log();
  
  // 4. 在池子数据中查找匹配的储备量值
  console.log('🎯 步骤 3: 在池子数据中查找匹配的储备量...');
  console.log();
  
  const u64Values = findU64Values(poolData);
  
  for (let i = 0; i < vaults.length; i++) {
    const vault = vaults[i];
    
    console.log(`\n🔍 查找 Vault ${i + 1} 的储备量 (${vault.amount.toString()}):`);
    console.log('-'.repeat(80));
    
    // 查找精确匹配
    const exactMatches = u64Values.filter(v => v.value === vault.amount);
    
    if (exactMatches.length > 0) {
      console.log(`✅ 找到 ${exactMatches.length} 个精确匹配:`);
      exactMatches.forEach(m => {
        console.log(`   Offset ${m.offset}: ${m.value.toString()}`);
      });
    } else {
      console.log(`⚠️  未找到精确匹配`);
      
      // 查找接近的值 (±5%)
      const similarMatches = u64Values.filter(v => {
        const diff = Number(v.value) - Number(vault.amount);
        const ratio = Math.abs(diff) / Number(vault.amount);
        return ratio < 0.05 && v.value > 0n;
      });
      
      if (similarMatches.length > 0) {
        console.log(`🔍 找到 ${similarMatches.length} 个接近的值 (±5%):`);
        similarMatches.forEach(m => {
          const diff = Number(m.value) - Number(vault.amount);
          const ratio = (diff / Number(vault.amount) * 100).toFixed(2);
          console.log(`   Offset ${m.offset}: ${m.value.toString()} (差异 ${ratio}%)`);
        });
      } else {
        console.log(`   未找到接近的值`);
      }
    }
  }
  
  // 5. 生成 Rust 代码建议
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📝 Rust 代码建议');
  console.log('='.repeat(80));
  
  if (vaults.length >= 2) {
    // 查找储备量的偏移量
    const reserve1Matches = u64Values.filter(v => v.value === vaults[0].amount);
    const reserve2Matches = u64Values.filter(v => v.value === vaults[1].amount);
    
    if (reserve1Matches.length > 0 && reserve2Matches.length > 0) {
      const offset1 = reserve1Matches[0].offset;
      const offset2 = reserve2Matches[0].offset;
      
      console.log(`\n找到储备量字段位置:`);
      console.log(`  Reserve A: offset ${offset1}`);
      console.log(`  Reserve B: offset ${offset2}`);
      console.log();
      
      // 计算结构布局
      if (offset1 % 8 === 0 && offset2 % 8 === 0) {
        const u64Index1 = offset1 / 8;
        const u64Index2 = offset2 / 8;
        
        console.log(`结构布局建议:`);
        console.log(`  - Reserve A 在第 ${u64Index1} 个 u64 字段`);
        console.log(`  - Reserve B 在第 ${u64Index2} 个 u64 字段`);
        
        if (offset2 - offset1 === 8) {
          console.log(`  ✅ 储备量字段相邻（推荐直接使用）`);
        }
        
        console.log(`\nRust 代码示例:`);
        console.log('```rust');
        console.log(`pub fn get_reserve_a(&self) -> u64 {`);
        console.log(`    self.config_fields[${u64Index1}]`);
        console.log(`}`);
        console.log();
        console.log(`pub fn get_reserve_b(&self) -> u64 {`);
        console.log(`    self.config_fields[${u64Index2}]`);
        console.log(`}`);
        console.log('```');
      }
    } else {
      console.log('\n⚠️  未找到精确匹配的储备量字段');
      console.log('建议: 使用 Token Vault 读取方式');
    }
  }
  
  // 6. 显示所有大于 100M 的 u64 值（可能的储备量候选）
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 所有可能的储备量候选值 (> 100M)');
  console.log('='.repeat(80));
  
  const largeu64Values = u64Values.filter(v => 
    v.value > 100_000_000n && v.value < 100_000_000_000_000n
  );
  
  console.log(`\n找到 ${largeu64Values.length} 个大值:`);
  largeu64Values.forEach((v, idx) => {
    const formatted6 = (Number(v.value) / 1e6).toFixed(2);
    const formatted9 = (Number(v.value) / 1e9).toFixed(4);
    
    // 检查是否匹配 vault
    const matchesVault = vaults.some(vault => vault.amount === v.value);
    const marker = matchesVault ? '✅' : '  ';
    
    console.log(`${marker} [${String(v.offset).padStart(4)}] ${v.value.toString().padStart(20)} | ${formatted6.padStart(15)} (6d) | ${formatted9.padStart(12)} (9d)`);
  });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ 分析完成');
  console.log('='.repeat(80));
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('用法: npx tsx rust-pool-cache/tools/find-reserve-fields.ts <POOL_ADDRESS> <POOL_TYPE>');
    console.log('\n示例:');
    console.log('  # SolFi V2');
    console.log('  npx tsx rust-pool-cache/tools/find-reserve-fields.ts 65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc solfi_v2');
    console.log('\n  # GoonFi');
    console.log('  npx tsx rust-pool-cache/tools/find-reserve-fields.ts 4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K goonfi');
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




