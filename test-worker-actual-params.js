const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

(async () => {
  const proxy = 'http://127.0.0.1:7890';
  const agent = new HttpsProxyAgent(proxy);
  
  // 从配置文件看Worker使用的参数
  const amount = '10000000000'; // 10 SOL (Line 289 in flashloan-bot.ts)
  const slippageBps = '50'; // Line 134 in config
  const minProfitLamports = 5000000; // 0.005 SOL from config

  console.log('\n🔬 Testing Worker Actual Parameters\n');
  console.log('Query Config:');
  console.log('  Amount:', Number(amount) / 1e9, 'SOL');
  console.log('  Slippage:', slippageBps, 'bps (0.5%)');
  console.log('  Min Profit:', minProfitLamports / 1e9, 'SOL');
  console.log('');

  try {
    // Test with bridge tokens from bridge-tokens.json
    const bridges = [
      { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
      { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
    ];

    for (const bridge of bridges) {
      console.log(`\n📊 Testing SOL → ${bridge.symbol} → SOL\n`);

      // Outbound: SOL -> Bridge
      const out = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: bridge.mint,
          amount,
          slippageBps,
          onlyDirectRoutes: 'true',
          maxAccounts: '20',
        },
        httpsAgent: agent,
        proxy: false,
        timeout: 3000,
      });

      const bridgeOut = Number(out.data.outAmount);
      console.log(`  ${bridge.symbol} out:`, bridgeOut);

      // Return: Bridge -> SOL
      const back = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
        params: {
          inputMint: bridge.mint,
          outputMint: 'So11111111111111111111111111111111111111112',
          amount: bridgeOut.toString(),
          slippageBps,
          onlyDirectRoutes: 'true',
          maxAccounts: '20',
        },
        httpsAgent: agent,
        proxy: false,
        timeout: 3000,
      });

      const finalSol = Number(back.data.outAmount);
      const profit = finalSol - Number(amount);
      const roi = (profit / Number(amount)) * 100;

      console.log(`  Final SOL:`, (finalSol / 1e9).toFixed(9));
      console.log(`  Profit:   `, (profit / 1e9).toFixed(9), 'SOL (', profit, 'lamports)');
      console.log(`  ROI:      `, roi.toFixed(6), '%');
      console.log(`  Status:   `, profit >= minProfitLamports ? '✅ PASSED' : '❌ FILTERED');
      
      if (profit < minProfitLamports) {
        console.log(`  Reason:   `, profit, '<', minProfitLamports, '(min profit threshold)');
      }
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
})();

