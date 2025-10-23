const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

(async () => {
  const proxy = 'http://127.0.0.1:7890';
  const agent = new HttpsProxyAgent(proxy);
  const testAmount = '10000000000'; // 10 SOL

  console.log('\n🔬 Testing Lite API Price Quality (10 SOL Arbitrage)\n');

  try {
    // Step 1: SOL -> USDC
    console.log('📊 Step 1: SOL -> USDC');
    const lite1 = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: testAmount,
        slippageBps: '50',
        onlyDirectRoutes: 'true',
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 5000,
    });

    const usdcOut = Number(lite1.data.outAmount);
    console.log('  Input:  10.000000 SOL');
    console.log('  Output:', (usdcOut / 1e6).toFixed(6), 'USDC');
    console.log('  Route: ', lite1.data.routePlan[0]?.swapInfo?.label || 'Unknown');
    console.log('  Price Impact:', lite1.data.priceImpactPct || 0, '%');

    // Step 2: USDC -> SOL
    console.log('\n🔄 Step 2: USDC -> SOL');
    const lite2 = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
      params: {
        inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        outputMint: 'So11111111111111111111111111111111111111112',
        amount: usdcOut.toString(),
        slippageBps: '50',
        onlyDirectRoutes: 'true',
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 5000,
    });

    const finalSol = Number(lite2.data.outAmount);
    const profit = finalSol - Number(testAmount);
    const profitSol = profit / 1e9;
    const roi = (profit / Number(testAmount)) * 100;

    console.log('  Input: ', (usdcOut / 1e6).toFixed(6), 'USDC');
    console.log('  Output:', (finalSol / 1e9).toFixed(9), 'SOL');
    console.log('  Route: ', lite2.data.routePlan[0]?.swapInfo?.label || 'Unknown');
    console.log('  Price Impact:', lite2.data.priceImpactPct || 0, '%');

    console.log('\n💰 Arbitrage Result:');
    console.log('  Initial:', (Number(testAmount) / 1e9).toFixed(9), 'SOL');
    console.log('  Final:  ', (finalSol / 1e9).toFixed(9), 'SOL');
    console.log('  Profit: ', profitSol.toFixed(9), 'SOL');
    console.log('  ROI:    ', roi.toFixed(6), '%');
    console.log('  Status: ', profit > 0 ? '✅ PROFITABLE' : '❌ LOSS');

    // 分析为什么没有机会
    console.log('\n📊 Analysis:');
    const tradingFee = Number(testAmount) * 0.003; // 0.3% trading fee
    const minProfit = 100000; // 0.0001 SOL minimum
    console.log('  Trading Fee (0.3%):', (tradingFee / 1e9).toFixed(9), 'SOL');
    console.log('  Min Profit Needed:', (minProfit / 1e9).toFixed(9), 'SOL');
    console.log('  Actual Profit:     ', profitSol.toFixed(9), 'SOL');
    
    if (profit < minProfit) {
      console.log('  ⚠️  Profit too small! Need', ((minProfit - profit) / 1e9).toFixed(9), 'SOL more');
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.response) {
      console.error('Response:', e.response.data);
    }
  }
})();

