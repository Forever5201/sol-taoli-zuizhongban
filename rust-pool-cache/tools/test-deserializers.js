// 测试反序列化器 - 验证字段位置修复
const { Connection, PublicKey } = require('@solana/web3.js');

// 测试池子
const TEST_POOLS = {
  alphaq: {
    address: 'Pi9nzTjPxD8DsRfRBGfKYzmefJoJM8TcXu2jyaQjSHm',
    name: 'USDT/USDC (AlphaQ)',
    expectedSize: 672,
    // 从之前的分析知道真实储备在 offset 432 和 440
    expectedReserveOffsets: [432, 440],
  },
  solfi_v2: {
    address: '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc',
    name: 'USDC/USDT (SolFi V2)',
    expectedSize: 1728,
  },
  goonfi: {
    address: '4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K',
    name: 'USDC/SOL (GoonFi)',
    expectedSize: 856,
  },
};

async function analyzeReserveFields(data, poolType) {
  console.log(`\n=== 查找 ${poolType} 的储备量字段 ===\n`);
  
  // 查找所有大于 100M 的 u64 值
  const candidates = [];
  
  for (let offset = 0; offset <= data.length - 8; offset += 8) {
    const value = data.readBigUInt64LE(offset);
    
    // 储备量通常在 100M - 100T 之间
    if (value > 100_000_000n && value < 100_000_000_000_000n) {
      candidates.push({ offset, value });
    }
  }
  
  console.log(`找到 ${candidates.length} 个可能的储备量字段:\n`);
  
  candidates.slice(0, 20).forEach((c, i) => {
    const formatted6 = (Number(c.value) / 1e6).toFixed(2);
    const formatted9 = (Number(c.value) / 1e9).toFixed(4);
    console.log(`[${String(c.offset).padStart(4)}] ${c.value.toString().padStart(18)} | ${formatted6.padStart(15)} (6d) | ${formatted9.padStart(12)} (9d)`);
  });
  
  // 查找成对的值（储备量应该成对出现）
  console.log(`\n查找成对的储备量（相邻的 u64）:\n`);
  
  for (let i = 0; i < candidates.length - 1; i++) {
    const curr = candidates[i];
    const next = candidates[i + 1];
    
    // 检查是否相邻（offset 差 8）
    if (next.offset - curr.offset === 8) {
      const ratio = Number(next.value) / Number(curr.value);
      console.log(`✅ 成对: offset ${curr.offset} 和 ${next.offset}`);
      console.log(`   值 A: ${curr.value.toString()} (${(Number(curr.value) / 1e6).toFixed(2)})`);
      console.log(`   值 B: ${next.value.toString()} (${(Number(next.value) / 1e6).toFixed(2)})`);
      console.log(`   比率: ${ratio.toFixed(6)}`);
      console.log('');
    }
  }
  
  return candidates;
}

async function testPool(poolInfo) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`测试: ${poolInfo.name}`);
  console.log(`地址: ${poolInfo.address}`);
  console.log(`${'='.repeat(80)}`);
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const pubkey = new PublicKey(poolInfo.address);
  
  try {
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (!accountInfo) {
      console.log('❌ 账户不存在');
      return;
    }
    
    const data = accountInfo.data;
    console.log(`✅ 数据大小: ${data.length} 字节`);
    
    if (data.length !== poolInfo.expectedSize) {
      console.log(`⚠️  预期大小: ${poolInfo.expectedSize} 字节`);
    }
    
    await analyzeReserveFields(data, poolInfo.name);
    
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function main() {
  console.log('📊 反序列化器测试工具\n');
  console.log('这个工具帮助我们找到正确的储备量字段位置\n');
  
  // 测试所有池子
  for (const [key, poolInfo] of Object.entries(TEST_POOLS)) {
    await testPool(poolInfo);
    
    // 等待一下避免速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ 所有测试完成');
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);




