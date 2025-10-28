/**
 * 测试本地 Jupiter API
 * 
 * 验证：
 * 1. 服务是否在运行
 * 2. 延迟是否 <5ms
 * 3. 报价是否正常
 */

import axios from 'axios';

const LOCAL_API = 'http://localhost:8080';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function testLocalJupiterAPI() {
  console.log('🧪 Testing Local Jupiter API...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 测试 1: Health Check
  console.log('📍 Test 1: Health Check');
  try {
    const start = Date.now();
    const response = await axios.get(`${LOCAL_API}/health`, { timeout: 5000 });
    const latency = Date.now() - start;
    console.log(`✅ Health check passed (${latency}ms)`);
    console.log(`   Response:`, response.data);
  } catch (error: any) {
    console.log(`❌ Health check failed: ${error.message}`);
    console.log(`   ⚠️  Service may not be running. Start it with: wsl bash start-jupiter-local-api.sh`);
    return;
  }

  console.log('');

  // 测试 2: Quote API
  console.log('📍 Test 2: Get Quote (SOL -> USDC)');
  try {
    const amount = 1_000_000_000; // 1 SOL
    const start = Date.now();
    const response = await axios.get(`${LOCAL_API}/quote`, {
      params: {
        inputMint: SOL_MINT,
        outputMint: USDC_MINT,
        amount: amount.toString(),
        slippageBps: 50,
      },
      timeout: 5000,
    });
    const latency = Date.now() - start;
    
    console.log(`✅ Quote received (${latency}ms) ${latency < 10 ? '🔥 EXCELLENT' : latency < 50 ? '✅ GOOD' : '⚠️  SLOW'}`);
    console.log(`   Input: ${amount / 1e9} SOL`);
    console.log(`   Output: ${parseInt(response.data.outAmount) / 1e6} USDC`);
    console.log(`   Price Impact: ${response.data.priceImpactPct}%`);
    console.log(`   Route: ${response.data.routePlan?.map((r: any) => r.swapInfo?.label).join(' → ')}`);
    console.log(`   Market Count: ${response.data.routePlan?.length || 0}`);
    
    if (latency < 5) {
      console.log('   🎉 LATENCY <5MS - PERFECT FOR HIGH-FREQUENCY ARBITRAGE!');
    }
  } catch (error: any) {
    console.log(`❌ Quote failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log(`   ⚠️  Connection refused. Make sure Jupiter API is running on port 8080`);
    }
  }

  console.log('');

  // 测试 3: 延迟压力测试
  console.log('📍 Test 3: Latency Stress Test (10 consecutive requests)');
  const latencies: number[] = [];
  
  for (let i = 0; i < 10; i++) {
    try {
      const start = Date.now();
      await axios.get(`${LOCAL_API}/quote`, {
        params: {
          inputMint: SOL_MINT,
          outputMint: USDC_MINT,
          amount: '1000000000',
          slippageBps: 50,
        },
        timeout: 5000,
      });
      const latency = Date.now() - start;
      latencies.push(latency);
      process.stdout.write(`${i + 1}. ${latency}ms  `);
    } catch (error) {
      process.stdout.write(`${i + 1}. ❌  `);
    }
  }
  
  console.log('\n');
  
  if (latencies.length > 0) {
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    
    console.log('📊 Latency Statistics:');
    console.log(`   Average: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min: ${minLatency}ms`);
    console.log(`   Max: ${maxLatency}ms`);
    console.log(`   Success Rate: ${latencies.length}/10 (${latencies.length * 10}%)`);
    
    if (avgLatency < 5) {
      console.log('   🏆 AVERAGE LATENCY <5MS - READY FOR PRODUCTION!');
    } else if (avgLatency < 10) {
      console.log('   ✅ AVERAGE LATENCY <10MS - GOOD PERFORMANCE');
    } else if (avgLatency < 50) {
      console.log('   ⚠️  AVERAGE LATENCY <50MS - ACCEPTABLE');
    } else {
      console.log('   ❌ AVERAGE LATENCY >50MS - NEEDS OPTIMIZATION');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test Complete!\n');
}

testLocalJupiterAPI().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});


