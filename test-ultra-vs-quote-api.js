/**
 * Ultra API vs Quote API 对比测试
 * 测试两个API在实际查询中的成功率和性能差异
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 配置
const PROXY_URL = 'http://127.0.0.1:7890';
const AMOUNT = '10000000000'; // 10 SOL
const BRIDGE_TOKENS = [
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'RAY', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
];

const SOL_MINT = 'So11111111111111111111111111111111111111112';

const axiosConfig = {
  timeout: 5000,
  httpsAgent: new HttpsProxyAgent(PROXY_URL),
  proxy: false,
};

// 测试Ultra API
async function testUltraAPI(inputMint, outputMint, symbol) {
  const start = Date.now();
  try {
    const response = await axios.get(
      `https://lite-api.jup.ag/ultra/v1/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${AMOUNT}`,
      axiosConfig
    );
    
    const latency = Date.now() - start;
    const data = response.data;
    
    if (data.outAmount && data.outAmount !== '0') {
      return {
        success: true,
        outAmount: data.outAmount,
        router: data.router,
        swapType: data.swapType,
        priceImpact: data.priceImpactPct,
        latency,
      };
    }
    
    return { success: false, error: 'No outAmount', latency };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      latency: Date.now() - start,
    };
  }
}

// 测试Quote API
async function testQuoteAPI(inputMint, outputMint, symbol) {
  const start = Date.now();
  try {
    const response = await axios.get(
      `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${AMOUNT}&onlyDirectRoutes=false&maxAccounts=40`,
      axiosConfig
    );
    
    const latency = Date.now() - start;
    const data = response.data;
    
    if (data.outAmount && data.outAmount !== '0') {
      return {
        success: true,
        outAmount: data.outAmount,
        latency,
      };
    }
    
    return { success: false, error: 'No outAmount', latency };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      latency: Date.now() - start,
    };
  }
}

// 主测试函数
async function runComparison() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔬 Ultra API vs Quote API 对比测试');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const results = {
    ultra: { success: 0, failed: 0, totalLatency: 0, results: [] },
    quote: { success: 0, failed: 0, totalLatency: 0, results: [] },
  };
  
  // 测试每个桥接代币
  for (const token of BRIDGE_TOKENS) {
    console.log(`\n🔄 测试桥接代币: ${token.symbol}`);
    console.log('─────────────────────────────────────────────────────────');
    
    // 去程测试: SOL → Token
    console.log(`\n  去程: SOL → ${token.symbol}`);
    
    const ultraOut = await testUltraAPI(SOL_MINT, token.mint, token.symbol);
    const quoteOut = await testQuoteAPI(SOL_MINT, token.mint, token.symbol);
    
    if (ultraOut.success) {
      console.log(`  ✅ Ultra API: ${ultraOut.outAmount} (${ultraOut.latency}ms, ${ultraOut.router})`);
      results.ultra.success++;
      results.ultra.totalLatency += ultraOut.latency;
    } else {
      console.log(`  ❌ Ultra API: ${ultraOut.error} (${ultraOut.latency}ms)`);
      results.ultra.failed++;
    }
    
    if (quoteOut.success) {
      console.log(`  ✅ Quote API: ${quoteOut.outAmount} (${quoteOut.latency}ms)`);
      results.quote.success++;
      results.quote.totalLatency += quoteOut.latency;
    } else {
      console.log(`  ❌ Quote API: ${quoteOut.error} (${quoteOut.latency}ms)`);
      results.quote.failed++;
    }
    
    // 如果都成功，计算价格差异
    if (ultraOut.success && quoteOut.success) {
      const diff = Number(ultraOut.outAmount) - Number(quoteOut.outAmount);
      const diffPct = (diff / Number(quoteOut.outAmount) * 100).toFixed(4);
      if (diff > 0) {
        console.log(`  💰 Ultra更优: +${diff} (+${diffPct}%)`);
      } else if (diff < 0) {
        console.log(`  💰 Quote更优: ${diff} (${diffPct}%)`);
      } else {
        console.log(`  ⚖️  价格相同`);
      }
    }
    
    // 回程测试: Token → SOL
    if (ultraOut.success && quoteOut.success) {
      console.log(`\n  回程: ${token.symbol} → SOL`);
      
      const ultraBack = await testUltraAPI(token.mint, SOL_MINT, token.symbol);
      const quoteBack = await testQuoteAPI(token.mint, SOL_MINT, token.symbol);
      
      if (ultraBack.success) {
        console.log(`  ✅ Ultra API: ${ultraBack.outAmount} (${ultraBack.latency}ms, ${ultraBack.router})`);
        results.ultra.success++;
        results.ultra.totalLatency += ultraBack.latency;
      } else {
        console.log(`  ❌ Ultra API: ${ultraBack.error} (${ultraBack.latency}ms)`);
        results.ultra.failed++;
      }
      
      if (quoteBack.success) {
        console.log(`  ✅ Quote API: ${quoteBack.outAmount} (${quoteBack.latency}ms)`);
        results.quote.success++;
        results.quote.totalLatency += quoteBack.latency;
      } else {
        console.log(`  ❌ Quote API: ${quoteBack.error} (${quoteBack.latency}ms)`);
        results.quote.failed++;
      }
      
      // 计算循环套利利润
      if (ultraBack.success && quoteBack.success) {
        const ultraProfit = Number(ultraBack.outAmount) - Number(AMOUNT);
        const quoteProfit = Number(quoteBack.outAmount) - Number(AMOUNT);
        
        console.log(`\n  🔁 循环套利利润:`);
        console.log(`     Ultra: ${ultraProfit} lamports (${(ultraProfit/1e9).toFixed(6)} SOL)`);
        console.log(`     Quote: ${quoteProfit} lamports (${(quoteProfit/1e9).toFixed(6)} SOL)`);
        
        if (Math.abs(ultraProfit) > 2000000 || Math.abs(quoteProfit) > 2000000) {
          console.log(`     💎 发现套利机会!`);
        }
      }
    }
    
    // 延迟避免速率限制
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 输出统计结果
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 测试结果统计');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const totalUltra = results.ultra.success + results.ultra.failed;
  const totalQuote = results.quote.success + results.quote.failed;
  
  console.log('Ultra API:');
  console.log(`  ✅ 成功: ${results.ultra.success}/${totalUltra} (${(results.ultra.success/totalUltra*100).toFixed(1)}%)`);
  console.log(`  ❌ 失败: ${results.ultra.failed}/${totalUltra} (${(results.ultra.failed/totalUltra*100).toFixed(1)}%)`);
  console.log(`  ⏱️  平均延迟: ${results.ultra.success > 0 ? (results.ultra.totalLatency/results.ultra.success).toFixed(0) : 'N/A'}ms`);
  
  console.log('\nQuote API:');
  console.log(`  ✅ 成功: ${results.quote.success}/${totalQuote} (${(results.quote.success/totalQuote*100).toFixed(1)}%)`);
  console.log(`  ❌ 失败: ${results.quote.failed}/${totalQuote} (${(results.quote.failed/totalQuote*100).toFixed(1)}%)`);
  console.log(`  ⏱️  平均延迟: ${results.quote.success > 0 ? (results.quote.totalLatency/results.quote.success).toFixed(0) : 'N/A'}ms`);
  
  console.log('\n🎯 结论:');
  if (results.ultra.success > results.quote.success) {
    console.log(`  Ultra API成功率更高! (+${results.ultra.success - results.quote.success}个成功查询)`);
  } else if (results.quote.success > results.ultra.success) {
    console.log(`  Quote API成功率更高! (+${results.quote.success - results.ultra.success}个成功查询)`);
  } else {
    console.log(`  两个API成功率相同`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// 运行测试
runComparison().catch(console.error);

