import { Connection, PublicKey } from '@solana/web3.js';

// Meteora DLMM Program ID
const METEORA_DLMM_PROGRAM = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

// Known Meteora DLMM pools (to be populated)
const KNOWN_POOLS = [
  {
    // These are placeholder addresses - we need to find the actual ones
    // SOL/USDC pool addresses can be found on Meteora's website or via their API
    address: '', 
    name: 'SOL/USDC (Meteora DLMM)',
    tokens: ['SOL', 'USDC']
  },
  {
    address: '',
    name: 'SOL/USDT (Meteora DLMM)',
    tokens: ['SOL', 'USDT']
  },
  {
    address: '',
    name: 'USDC/USDT (Meteora DLMM)',
    tokens: ['USDC', 'USDT']
  },
  {
    address: '',
    name: 'JUP/USDC (Meteora DLMM)',
    tokens: ['JUP', 'USDC']
  },
  {
    address: '',
    name: 'mSOL/SOL (Meteora DLMM)',
    tokens: ['mSOL', 'SOL']
  },
];

// Well-known token addresses
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
};

async function queryMeteoraPoolsViaJupiter() {
  console.log('🔍 查询 Meteora DLMM 池子地址（通过 Jupiter API）...\n');
  
  try {
    // Query Jupiter API for Meteora pools
    const response = await fetch('https://quote-api.jup.ag/v6/program-id-to-label');
    const data = await response.json();
    
    console.log('Meteora Program:', data[METEORA_DLMM_PROGRAM.toBase58()]);
    
    // Now query for specific token pairs
    const pairs = [
      { inputMint: TOKENS.SOL, outputMint: TOKENS.USDC, name: 'SOL/USDC' },
      { inputMint: TOKENS.SOL, outputMint: TOKENS.USDT, name: 'SOL/USDT' },
      { inputMint: TOKENS.USDC, outputMint: TOKENS.USDT, name: 'USDC/USDT' },
      { inputMint: TOKENS.JUP, outputMint: TOKENS.USDC, name: 'JUP/USDC' },
      { inputMint: TOKENS.mSOL, outputMint: TOKENS.SOL, name: 'mSOL/SOL' },
    ];
    
    console.log('\n📊 查询各交易对的路由信息...\n');
    
    for (const pair of pairs) {
      try {
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${pair.inputMint}&outputMint=${pair.outputMint}&amount=1000000&slippageBps=50`;
        const quoteResponse = await fetch(quoteUrl);
        const quoteData = await quoteResponse.json();
        
        if (quoteData.routePlan && quoteData.routePlan.length > 0) {
          console.log(`\n${pair.name}:`);
          
          // Look for Meteora DLMM in the route
          for (const route of quoteData.routePlan) {
            for (const swap of route.swapInfo) {
              if (swap.label && swap.label.toLowerCase().includes('meteora')) {
                console.log(`  ✅ 找到 Meteora 池子:`);
                console.log(`     Label: ${swap.label}`);
                console.log(`     AMM: ${swap.ammKey || 'N/A'}`);
                console.log(`     Input Mint: ${swap.inputMint}`);
                console.log(`     Output Mint: ${swap.outputMint}`);
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ❌ 查询 ${pair.name} 失败:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

async function queryProgramAccounts() {
  console.log('\n🔍 查询 Meteora DLMM 程序账户...\n');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  try {
    // This might be rate-limited on public RPC
    console.log('⚠️  注意：公共 RPC 可能限流，建议使用付费 RPC');
    console.log('尝试查询前 10 个 Meteora DLMM 池子账户...\n');
    
    const accounts = await connection.getProgramAccounts(
      METEORA_DLMM_PROGRAM,
      {
        filters: [
          // Filter for pool accounts (typically > 500 bytes)
          { dataSize: 1000 } // Adjust based on actual pool size
        ],
        dataSlice: { offset: 0, length: 0 }, // Don't fetch data, just addresses
      }
    );
    
    console.log(`找到 ${accounts.length} 个账户\n`);
    
    if (accounts.length > 0) {
      console.log('前 10 个池子地址:');
      accounts.slice(0, 10).forEach((account, i) => {
        console.log(`  ${i + 1}. ${account.pubkey.toBase58()}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    console.log('\n提示：如果遇到限流，可以：');
    console.log('  1. 使用 Helius/Alchemy 等付费 RPC');
    console.log('  2. 直接访问 Meteora 官网获取池子地址');
    console.log('  3. 使用 Solscan/Solana Explorer 搜索');
  }
}

// Manual pool addresses from Meteora website (to be filled in)
function displayKnownPools() {
  console.log('\n\n📋 已知的 Meteora DLMM 池子地址：\n');
  console.log('请访问以下资源获取最新的池子地址：');
  console.log('  1. Meteora 官网: https://app.meteora.ag/pools');
  console.log('  2. Meteora 文档: https://docs.meteora.ag/');
  console.log('  3. Solscan 浏览器: https://solscan.io/account/' + METEORA_DLMM_PROGRAM.toBase58());
  console.log('\n示例配置：');
  console.log('```toml');
  console.log('[[pools]]');
  console.log('address = "YOUR_POOL_ADDRESS_HERE"');
  console.log('name = "SOL/USDC (Meteora DLMM)"');
  console.log('pool_type = "meteora_dlmm"');
  console.log('```\n');
  
  console.log('常见交易对的 Meteora DLMM 池子：');
  console.log('  - SOL/USDC: 需要在 Meteora 官网查询');
  console.log('  - SOL/USDT: 需要在 Meteora 官网查询');
  console.log('  - USDC/USDT: 需要在 Meteora 官网查询');
  console.log('  - JUP/USDC: 需要在 Meteora 官网查询');
  console.log('  - mSOL/SOL: 需要在 Meteora 官网查询');
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   Meteora DLMM 池子地址查询工具                           ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`Meteora DLMM Program ID: ${METEORA_DLMM_PROGRAM.toBase58()}\n`);
  
  // Method 1: Query via Jupiter API
  await queryMeteoraPoolsViaJupiter();
  
  // Method 2: Query program accounts (might be rate-limited)
  await queryProgramAccounts();
  
  // Method 3: Display manual instructions
  displayKnownPools();
}

main().catch(console.error);





