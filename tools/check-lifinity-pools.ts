import { Connection, PublicKey } from '@solana/web3.js';

// Lifinity V2 Program ID
const LIFINITY_V2_PROGRAM = new PublicKey('2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c');

// Known Lifinity V2 pools (from Jupiter routing data)
const KNOWN_POOLS = [
  {
    address: 'DrRd8gYMJu9XGxLhwTCPdHNLXCKHsxJtMpbn62YqmwQe',
    name: 'SOL/USDC (Lifinity V2)'
  },
  {
    address: '5zvhFRN45j9oePohUQ739Z4UaSrgPoJ8NLaS2izFuX1j', 
    name: 'SOL/USDT (Lifinity V2)'
  },
];

async function checkLifinityPools() {
  console.log('🔍 检查 Lifinity V2 池子结构...\n');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  for (const pool of KNOWN_POOLS) {
    try {
      console.log(`📊 池子: ${pool.name}`);
      console.log(`   地址: ${pool.address}`);
      
      const pubkey = new PublicKey(pool.address);
      const accountInfo = await connection.getAccountInfo(pubkey);
      
      if (!accountInfo) {
        console.log(`   ❌ 账户不存在\n`);
        continue;
      }
      
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      console.log(`   数据长度: ${accountInfo.data.length} bytes`);
      console.log(`   可执行: ${accountInfo.executable}`);
      
      // 验证是否是 Lifinity V2 程序
      if (accountInfo.owner.equals(LIFINITY_V2_PROGRAM)) {
        console.log(`   ✅ 确认是 Lifinity V2 池子`);
      } else {
        console.log(`   ⚠️  Owner 不匹配 Lifinity V2 程序`);
        console.log(`   实际 Owner: ${accountInfo.owner.toBase58()}`);
      }
      
      // 显示数据分析
      const data = accountInfo.data;
      console.log(`\n   === 数据布局分析 ===`);
      
      let offset = 0;
      
      // 读取前 8 bytes（通常是 discriminator）
      if (data.length >= 8) {
        const discriminator = data.readBigUInt64LE(0);
        console.log(`   [0-7] Discriminator: ${discriminator}`);
        offset = 8;
      }
      
      // 尝试读取 Pubkeys (32 bytes each)
      const readPubkey = (name: string) => {
        if (offset + 32 <= data.length) {
          const pubkey = new PublicKey(data.slice(offset, offset + 32));
          console.log(`   [${offset}-${offset+31}] ${name}: ${pubkey.toBase58()}`);
          offset += 32;
        }
      };
      
      readPubkey('可能的 Token A Mint');
      readPubkey('可能的 Token B Mint');
      readPubkey('可能的 Token A Vault');
      readPubkey('可能的 Token B Vault');
      readPubkey('可能的 Authority');
      
      // u64 values
      if (offset + 8 <= data.length) {
        const val1 = data.readBigUInt64LE(offset);
        console.log(`   [${offset}] 可能的 Amount A: ${val1}`);
        offset += 8;
      }
      
      if (offset + 8 <= data.length) {
        const val2 = data.readBigUInt64LE(offset);
        console.log(`   [${offset}] 可能的 Amount B: ${val2}`);
        offset += 8;
      }
      
      // u8 values (decimals)
      if (offset + 1 <= data.length) {
        console.log(`   [${offset}] 可能的 Decimals A: ${data[offset]}`);
        offset += 1;
      }
      
      if (offset + 1 <= data.length) {
        console.log(`   [${offset}] 可能的 Decimals B: ${data[offset]}`);
        offset += 1;
      }
      
      console.log(`\n   总数据长度: ${data.length} bytes`);
      console.log(`   已分析: ${offset} bytes`);
      console.log(`   剩余: ${data.length - offset} bytes\n`);
      console.log('─'.repeat(80) + '\n');
      
    } catch (error) {
      console.error(`   ❌ 错误: ${error}`);
      console.log();
    }
  }
  
  // 查询更多池子
  console.log('\n🔍 查询 Lifinity V2 的更多池子...\n');
  console.log('使用 Jupiter API 查询常见交易对的路由\n');
  
  // 可以手动查询或使用 Jupiter API
  console.log('提示：可以在 https://jup.ag 交易界面查看 Lifinity V2 的池子');
  console.log('或使用 Jupiter API 查询特定交易对的路由');
}

checkLifinityPools().catch(console.error);
