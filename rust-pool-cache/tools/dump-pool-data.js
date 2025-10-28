// 导出池子原始数据用于离线分析
const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

const POOLS = {
  solfi_v2_1: {
    address: '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc',
    name: 'USDC/USDT (SolFi V2)',
    size: 1728,
  },
  solfi_v2_2: {
    address: 'FkEB6uvyzuoaGpgs4yRtFtxC4WJxhejNFbUkj5R6wR32',
    name: 'USDC/USDT (SolFi V2) #2',
    size: 1728,
  },
  goonfi: {
    address: '4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K',
    name: 'USDC/SOL (GoonFi)',
    size: 856,
  },
};

async function dumpPoolData(connection, poolInfo, key) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 导出: ${poolInfo.name}`);
  console.log(`地址: ${poolInfo.address}`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    const pubkey = new PublicKey(poolInfo.address);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (!accountInfo) {
      console.log('❌ 账户不存在');
      return;
    }
    
    const data = accountInfo.data;
    console.log(`✅ 数据大小: ${data.length} 字节`);
    
    // 保存为 base64
    const base64 = data.toString('base64');
    fs.writeFileSync(
      `rust-pool-cache/tools/${key}-data.txt`,
      base64
    );
    console.log(`✅ Base64 数据已保存到: ${key}-data.txt`);
    
    // 保存为十六进制（便于分析）
    const hex = data.toString('hex');
    fs.writeFileSync(
      `rust-pool-cache/tools/${key}-data-hex.txt`,
      hex.match(/.{1,64}/g).join('\n')
    );
    console.log(`✅ 十六进制数据已保存到: ${key}-data-hex.txt`);
    
    // 保存分析报告
    let report = `# ${poolInfo.name} 数据分析\n\n`;
    report += `地址: ${poolInfo.address}\n`;
    report += `大小: ${data.length} 字节\n\n`;
    
    // 查找所有大于 1M 的 u64 值
    report += `## 所有大于 1M 的 u64 值\n\n`;
    report += `| Offset | 值 | 格式化 (6d) | 格式化 (9d) |\n`;
    report += `|--------|---|-------------|-------------|\n`;
    
    for (let offset = 0; offset <= data.length - 8; offset += 8) {
      const val = data.readBigUInt64LE(offset);
      if (val > 1_000_000n && val < 100_000_000_000_000n) {
        const val6 = (Number(val) / 1e6).toFixed(2);
        const val9 = (Number(val) / 1e9).toFixed(4);
        report += `| ${offset} | ${val.toString()} | ${val6} | ${val9} |\n`;
      }
    }
    
    fs.writeFileSync(
      `rust-pool-cache/tools/${key}-analysis.md`,
      report
    );
    console.log(`✅ 分析报告已保存到: ${key}-analysis.md`);
    
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function main() {
  console.log('📊 池子数据导出工具\n');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  for (const [key, poolInfo] of Object.entries(POOLS)) {
    await dumpPoolData(connection, poolInfo, key);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ 所有数据导出完成');
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);




