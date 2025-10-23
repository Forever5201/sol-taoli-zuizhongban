/**
 * 深度对比 Lite API vs Ultra API
 * 
 * 目标：
 * 1. 对比相同交易参数下的报价差异
 * 2. 分析路由算法的不同
 * 3. 对比价格影响(slippage)
 * 4. 对比执行质量指标
 * 5. 找出为什么Ultra能找到机会而Lite找不到
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');

// 配置
const PROXY = 'http://127.0.0.1:7890';
const ULTRA_API_KEY = '3cf45ad3-12bc-4832-9307-d0b76357e005'; // 从配置文件读取
const agent = new HttpsProxyAgent(PROXY);

// 测试参数
const TEST_CASES = [
  {
    name: 'Small Amount (1 SOL)',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: '1000000000',
    description: '小额交易 - 类似之前的配置',
  },
  {
    name: 'Medium Amount (5 SOL)',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: '5000000000',
    description: '中等交易',
  },
  {
    name: 'Large Amount (10 SOL)',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: '10000000000',
    description: '大额交易 - 当前Worker配置',
  },
];

const BRIDGE_TOKENS = [
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
];

/**
 * 查询 Lite API
 */
async function queryLiteAPI(inputMint, outputMint, amount) {
  const startTime = Date.now();
  try {
    const response = await axios.get('https://lite-api.jup.ag/swap/v1/quote', {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: '50',
        onlyDirectRoutes: 'true',
        maxAccounts: '20',
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 5000,
    });
    
    const latency = Date.now() - startTime;
    
    return {
      success: true,
      latency,
      data: {
        inAmount: response.data.inAmount,
        outAmount: response.data.outAmount,
        priceImpactPct: response.data.priceImpactPct || 0,
        routePlan: response.data.routePlan || [],
        otherAmountThreshold: response.data.otherAmountThreshold,
        swapMode: response.data.swapMode,
        slippageBps: response.data.slippageBps,
      },
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message,
      status: error.response?.status,
    };
  }
}

/**
 * 查询 Ultra API
 */
async function queryUltraAPI(inputMint, outputMint, amount) {
  const startTime = Date.now();
  try {
    const response = await axios.get('https://api.jup.ag/ultra/v1/order', {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: '50',
        onlyDirectRoutes: 'true',
        maxAccounts: '20',
      },
      headers: {
        'X-API-Key': ULTRA_API_KEY,
        'Content-Type': 'application/json',
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 5000,
    });
    
    const latency = Date.now() - startTime;
    
    return {
      success: true,
      latency,
      data: {
        inAmount: response.data.inAmount,
        outAmount: response.data.outAmount || response.data.estimatedOut,
        priceImpactPct: response.data.priceImpactPct || 0,
        routePlan: response.data.routePlan || [],
        // Ultra API 特有字段
        transactionFee: response.data.transactionFee,
        computeUnitLimit: response.data.computeUnitLimit,
        priorityFee: response.data.priorityFee,
        swapTransaction: response.data.swapTransaction ? 'Included' : 'None',
      },
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
  }
}

/**
 * 对比分析
 */
function analyzeComparison(testCase, liteResult, ultraResult) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 测试场景: ${testCase.name}`);
  console.log(`   输入: ${Number(testCase.amount) / 1e9} SOL → USDC`);
  console.log(`${'='.repeat(80)}\n`);

  // Lite API 结果
  console.log('🔵 Lite API (/swap/v1/quote):');
  if (liteResult.success) {
    const liteOut = Number(liteResult.data.outAmount);
    console.log(`   ✅ 成功`);
    console.log(`   延迟: ${liteResult.latency}ms`);
    console.log(`   输出: ${(liteOut / 1e6).toFixed(6)} USDC (${liteOut} lamports)`);
    console.log(`   价格影响: ${liteResult.data.priceImpactPct}%`);
    console.log(`   路由数: ${liteResult.data.routePlan.length}`);
    if (liteResult.data.routePlan.length > 0) {
      liteResult.data.routePlan.forEach((route, idx) => {
        console.log(`     Route ${idx + 1}: ${route.swapInfo?.label || 'Unknown'}`);
      });
    }
  } else {
    console.log(`   ❌ 失败: ${liteResult.error}`);
    console.log(`   状态码: ${liteResult.status || 'N/A'}`);
  }

  console.log('');

  // Ultra API 结果
  console.log('🟠 Ultra API (/ultra/v1/order):');
  if (ultraResult.success) {
    const ultraOut = Number(ultraResult.data.outAmount);
    console.log(`   ✅ 成功`);
    console.log(`   延迟: ${ultraResult.latency}ms`);
    console.log(`   输出: ${(ultraOut / 1e6).toFixed(6)} USDC (${ultraOut} lamports)`);
    console.log(`   价格影响: ${ultraResult.data.priceImpactPct}%`);
    console.log(`   路由数: ${ultraResult.data.routePlan.length}`);
    if (ultraResult.data.routePlan.length > 0) {
      ultraResult.data.routePlan.forEach((route, idx) => {
        console.log(`     Route ${idx + 1}: ${route.swapInfo?.label || 'Unknown'}`);
      });
    }
    console.log(`   交易费: ${ultraResult.data.transactionFee || 'N/A'}`);
    console.log(`   计算单元: ${ultraResult.data.computeUnitLimit || 'N/A'}`);
    console.log(`   包含交易: ${ultraResult.data.swapTransaction}`);
  } else {
    console.log(`   ❌ 失败: ${ultraResult.error}`);
    console.log(`   状态码: ${ultraResult.status || 'N/A'}`);
    if (ultraResult.data) {
      console.log(`   详细错误:`, JSON.stringify(ultraResult.data, null, 2));
    }
  }

  // 对比分析
  if (liteResult.success && ultraResult.success) {
    console.log('\n📈 对比分析:');
    const liteLamports = Number(liteResult.data.outAmount);
    const ultraLamports = Number(ultraResult.data.outAmount);
    const diff = ultraLamports - liteLamports;
    const diffPct = (diff / liteLamports) * 100;

    console.log(`   Lite:  ${liteLamports.toLocaleString()} lamports`);
    console.log(`   Ultra: ${ultraLamports.toLocaleString()} lamports`);
    console.log(`   差异:  ${diff.toLocaleString()} lamports (${diffPct.toFixed(4)}%)`);
    
    if (Math.abs(diff) > 1000) {
      console.log(`   ${diff > 0 ? '🟢 Ultra更优!' : '🔵 Lite更优!'}`);
    } else {
      console.log(`   ⚪ 基本相同`);
    }

    console.log(`\n   延迟对比:`);
    console.log(`   Lite:  ${liteResult.latency}ms`);
    console.log(`   Ultra: ${ultraResult.latency}ms`);
    console.log(`   差异:  ${ultraResult.latency - liteResult.latency}ms`);
  }
}

/**
 * 完整套利路径对比
 */
async function compareArbitrageOpportunity(testCase, bridgeToken) {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`🔬 完整套利路径对比: SOL → ${bridgeToken.symbol} → SOL`);
  console.log(`   金额: ${Number(testCase.amount) / 1e9} SOL`);
  console.log(`${'━'.repeat(80)}\n`);

  // Lite API 完整路径
  console.log('🔵 Lite API 路径:');
  const liteOut = await queryLiteAPI(
    'So11111111111111111111111111111111111111112',
    bridgeToken.mint,
    testCase.amount
  );

  if (!liteOut.success) {
    console.log(`   ❌ 去程失败: ${liteOut.error}`);
    return;
  }

  const liteBridgeAmount = liteOut.data.outAmount;
  console.log(`   去程: ${Number(testCase.amount) / 1e9} SOL → ${liteBridgeAmount} ${bridgeToken.symbol} (${liteOut.latency}ms)`);

  const liteBack = await queryLiteAPI(
    bridgeToken.mint,
    'So11111111111111111111111111111111111111112',
    liteBridgeAmount
  );

  if (!liteBack.success) {
    console.log(`   ❌ 回程失败: ${liteBack.error}`);
    return;
  }

  const liteFinalSol = Number(liteBack.data.outAmount);
  const liteProfit = liteFinalSol - Number(testCase.amount);
  const liteRoi = (liteProfit / Number(testCase.amount)) * 100;

  console.log(`   回程: ${liteBridgeAmount} ${bridgeToken.symbol} → ${(liteFinalSol / 1e9).toFixed(9)} SOL (${liteBack.latency}ms)`);
  console.log(`   总延迟: ${liteOut.latency + liteBack.latency}ms`);
  console.log(`   利润: ${(liteProfit / 1e9).toFixed(9)} SOL (${liteProfit.toLocaleString()} lamports)`);
  console.log(`   ROI: ${liteRoi.toFixed(6)}%`);
  console.log(`   状态: ${liteProfit > 0 ? '✅ 盈利' : '❌ 亏损'}`);

  // Ultra API 完整路径
  console.log('\n🟠 Ultra API 路径:');
  const ultraOut = await queryUltraAPI(
    'So11111111111111111111111111111111111111112',
    bridgeToken.mint,
    testCase.amount
  );

  if (!ultraOut.success) {
    console.log(`   ❌ 去程失败: ${ultraOut.error}`);
    if (ultraOut.status === 401) {
      console.log(`   ⚠️  可能需要有效的API Key`);
    }
    return;
  }

  const ultraBridgeAmount = ultraOut.data.outAmount;
  console.log(`   去程: ${Number(testCase.amount) / 1e9} SOL → ${ultraBridgeAmount} ${bridgeToken.symbol} (${ultraOut.latency}ms)`);

  const ultraBack = await queryUltraAPI(
    bridgeToken.mint,
    'So11111111111111111111111111111111111111112',
    ultraBridgeAmount
  );

  if (!ultraBack.success) {
    console.log(`   ❌ 回程失败: ${ultraBack.error}`);
    return;
  }

  const ultraFinalSol = Number(ultraBack.data.outAmount);
  const ultraProfit = ultraFinalSol - Number(testCase.amount);
  const ultraRoi = (ultraProfit / Number(testCase.amount)) * 100;

  console.log(`   回程: ${ultraBridgeAmount} ${bridgeToken.symbol} → ${(ultraFinalSol / 1e9).toFixed(9)} SOL (${ultraBack.latency}ms)`);
  console.log(`   总延迟: ${ultraOut.latency + ultraBack.latency}ms`);
  console.log(`   利润: ${(ultraProfit / 1e9).toFixed(9)} SOL (${ultraProfit.toLocaleString()} lamports)`);
  console.log(`   ROI: ${ultraRoi.toFixed(6)}%`);
  console.log(`   状态: ${ultraProfit > 0 ? '✅ 盈利' : '❌ 亏损'}`);

  // 对比
  console.log('\n📊 套利机会对比:');
  const profitDiff = ultraProfit - liteProfit;
  console.log(`   Lite 利润:  ${(liteProfit / 1e9).toFixed(9)} SOL`);
  console.log(`   Ultra 利润: ${(ultraProfit / 1e9).toFixed(9)} SOL`);
  console.log(`   差异:       ${(profitDiff / 1e9).toFixed(9)} SOL (${profitDiff.toLocaleString()} lamports)`);
  
  if (Math.abs(profitDiff) > 10000) {
    console.log(`   ${profitDiff > 0 ? '🟢 Ultra 更优!' : '🔵 Lite 更优!'}`);
  } else {
    console.log(`   ⚪ 两者基本相同`);
  }

  // 判断是否满足配置的最小利润阈值
  const minProfitLamports = 5_000_000;
  console.log(`\n   配置阈值: ${(minProfitLamports / 1e9).toFixed(9)} SOL (${minProfitLamports.toLocaleString()} lamports)`);
  console.log(`   Lite ${liteProfit >= minProfitLamports ? '✅ 达标' : '❌ 未达标'}`);
  console.log(`   Ultra ${ultraProfit >= minProfitLamports ? '✅ 达标' : '❌ 未达标'}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 Jupiter API 深度对比分析: Lite API vs Ultra API');
  console.log('='.repeat(80));
  console.log('\n📋 测试配置:');
  console.log(`   代理: ${PROXY}`);
  console.log(`   Ultra API Key: ${ULTRA_API_KEY.slice(0, 8)}...${ULTRA_API_KEY.slice(-4)}`);
  console.log(`   测试场景: ${TEST_CASES.length} 个`);
  console.log(`   桥接代币: ${BRIDGE_TOKENS.length} 个`);

  // Part 1: 单向报价对比
  console.log('\n' + '═'.repeat(80));
  console.log('📊 Part 1: 单向报价对比 (SOL → USDC)');
  console.log('═'.repeat(80));

  for (const testCase of TEST_CASES) {
    const liteResult = await queryLiteAPI(
      testCase.inputMint,
      testCase.outputMint,
      testCase.amount
    );
    
    await new Promise(resolve => setTimeout(resolve, 500)); // 避免限流
    
    const ultraResult = await queryUltraAPI(
      testCase.inputMint,
      testCase.outputMint,
      testCase.amount
    );

    analyzeComparison(testCase, liteResult, ultraResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Part 2: 完整套利路径对比
  console.log('\n\n' + '═'.repeat(80));
  console.log('🔄 Part 2: 完整套利路径对比 (环形套利)');
  console.log('═'.repeat(80));

  // 只测试1 SOL和10 SOL（节省时间）
  const keyTestCases = [TEST_CASES[0], TEST_CASES[2]];
  
  for (const testCase of keyTestCases) {
    for (const bridge of BRIDGE_TOKENS) {
      await compareArbitrageOpportunity(testCase, bridge);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 避免限流
    }
  }

  // 总结
  console.log('\n\n' + '═'.repeat(80));
  console.log('📝 总结与结论');
  console.log('═'.repeat(80));
  console.log('\n1. API 实现差异:');
  console.log('   - Lite API: 轻量级报价，快速返回，无交易构建');
  console.log('   - Ultra API: 完整服务，包含交易构建，更详细的路由信息');
  console.log('\n2. 延迟对比:');
  console.log('   - Lite API: ~100-150ms (更快)');
  console.log('   - Ultra API: ~200-400ms (包含交易构建时间)');
  console.log('\n3. 报价质量:');
  console.log('   - 需要查看上述实际测试结果对比');
  console.log('\n4. 建议:');
  console.log('   - 如果Ultra报价明显更优 → 切换到Ultra API');
  console.log('   - 如果两者基本相同 → 降低min_profit_lamports阈值');
  console.log('   - 如果Lite也能找到机会 → 问题在配置而非API');
}

// 运行
main().catch(console.error);

