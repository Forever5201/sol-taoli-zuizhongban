// 测试从 Token Vault 读取储备量
const { Connection, PublicKey } = require('@solana/web3.js');

const POOLS_TO_TEST = {
  solfi_v2: {
    address: '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc',
    name: 'USDC/USDT (SolFi V2)',
    vaultOffsets: {
      // 猜测: header(40) + pubkey_1(32) + pubkey_2(32) + pubkey_3(32) = 136
      // vault_a 应该在 pubkey_4 位置
      vaultA: 40 + 32 * 3,  // offset 136
      vaultB: 40 + 32 * 4,  // offset 168
    },
  },
  goonfi: {
    address: '4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K',
    name: 'USDC/SOL (GoonFi)',
    vaultOffsets: {
      // GoonFi 结构: 15 Pubkeys (480 bytes) + 47 u64 (376 bytes) = 856 bytes
      // 假设 vault 在前几个 pubkey
      vaultA: 32 * 3,  // offset 96
      vaultB: 32 * 4,  // offset 128
    },
  },
};

async function testPoolVaults(poolInfo) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 测试: ${poolInfo.name}`);
  console.log(`地址: ${poolInfo.address}`);
  console.log(`${'='.repeat(80)}`);
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  try {
    // 1. 获取池子数据
    console.log('\n📥 获取池子数据...');
    const poolPubkey = new PublicKey(poolInfo.address);
    const poolAccount = await connection.getAccountInfo(poolPubkey);
    
    if (!poolAccount) {
      console.log('❌ 池子账户不存在');
      return;
    }
    
    console.log(`✅ 数据大小: ${poolAccount.data.length} 字节`);
    
    // 2. 提取 vault 地址
    console.log('\n🔑 提取 Vault 地址...');
    const poolData = poolAccount.data;
    
    const vaultAPubkey = new PublicKey(
      poolData.slice(
        poolInfo.vaultOffsets.vaultA,
        poolInfo.vaultOffsets.vaultA + 32
      )
    );
    
    const vaultBPubkey = new PublicKey(
      poolData.slice(
        poolInfo.vaultOffsets.vaultB,
        poolInfo.vaultOffsets.vaultB + 32
      )
    );
    
    console.log(`Vault A (offset ${poolInfo.vaultOffsets.vaultA}): ${vaultAPubkey.toBase58()}`);
    console.log(`Vault B (offset ${poolInfo.vaultOffsets.vaultB}): ${vaultBPubkey.toBase58()}`);
    
    // 3. 查询 vault 账户
    console.log('\n💰 查询 Vault 余额...');
    
    const vaultAAccount = await connection.getAccountInfo(vaultAPubkey);
    const vaultBAccount = await connection.getAccountInfo(vaultBPubkey);
    
    if (!vaultAAccount || vaultAAccount.data.length !== 165) {
      console.log(`⚠️  Vault A 不是有效的 SPL Token 账户`);
      console.log(`   数据大小: ${vaultAAccount?.data.length || 0} (预期 165)`);
    } else {
      const amountA = vaultAAccount.data.readBigUInt64LE(64);
      const mintA = new PublicKey(vaultAAccount.data.slice(0, 32));
      
      console.log(`\n✅ Vault A 信息:`);
      console.log(`   余额: ${amountA.toString()}`);
      console.log(`   格式化 (6d): ${(Number(amountA) / 1e6).toFixed(2)}`);
      console.log(`   格式化 (9d): ${(Number(amountA) / 1e9).toFixed(4)}`);
      console.log(`   Mint: ${mintA.toBase58()}`);
    }
    
    if (!vaultBAccount || vaultBAccount.data.length !== 165) {
      console.log(`\n⚠️  Vault B 不是有效的 SPL Token 账户`);
      console.log(`   数据大小: ${vaultBAccount?.data.length || 0} (预期 165)`);
    } else {
      const amountB = vaultBAccount.data.readBigUInt64LE(64);
      const mintB = new PublicKey(vaultBAccount.data.slice(0, 32));
      
      console.log(`\n✅ Vault B 信息:`);
      console.log(`   余额: ${amountB.toString()}`);
      console.log(`   格式化 (6d): ${(Number(amountB) / 1e6).toFixed(2)}`);
      console.log(`   格式化 (9d): ${(Number(amountB) / 1e9).toFixed(4)}`);
      console.log(`   Mint: ${mintB.toBase58()}`);
      
      // 计算价格
      if (vaultAAccount) {
        const amountA = vaultAAccount.data.readBigUInt64LE(64);
        const price = Number(amountB) / Number(amountA);
        console.log(`\n📊 计算价格 (B/A): ${price.toFixed(6)}`);
      }
    }
    
  } catch (error) {
    console.log(`\n❌ 错误: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 Token Vault 读取测试\n');
  console.log('目标: 验证从 vault 读取储备量的可行性\n');
  
  for (const [key, poolInfo] of Object.entries(POOLS_TO_TEST)) {
    await testPoolVaults(poolInfo);
    console.log('\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ 测试完成');
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);




