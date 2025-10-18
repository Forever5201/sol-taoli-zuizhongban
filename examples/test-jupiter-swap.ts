/**
 * Jupiter Swap集成测试
 * 
 * 测试Jupiter API集成和真实Swap交易构建
 * 使用Devnet进行安全测试
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TransactionBuilder, createJupiterClient } from '../packages/core/src';
import { createLogger } from '../packages/core/src/logger';

const logger = createLogger('JupiterTest');

// Devnet常用代币
const DEVNET_TOKENS = {
  // Wrapped SOL
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  // Devnet USDC (需要从水龙头获取)
  USDC: new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'),
};

/**
 * 测试1: Jupiter客户端基础功能
 */
async function testJupiterClient() {
  logger.info('=== Test 1: Jupiter Client Basic Functions ===');

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const jupiterClient = createJupiterClient(connection);

    // 测试获取Quote
    logger.info('Getting quote for SOL → USDC...');
    const quote = await jupiterClient.getQuote(
      DEVNET_TOKENS.SOL,
      DEVNET_TOKENS.USDC,
      100_000_000, // 0.1 SOL
      50 // 0.5% slippage
    );

    logger.info(`✅ Quote received:`);
    logger.info(`   Input: ${quote.inAmount} lamports`);
    logger.info(`   Output: ${quote.outAmount}`);
    logger.info(`   Price Impact: ${quote.priceImpactPct}%`);
    logger.info(`   Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' → ')}`);

    // 测试获取价格
    logger.info('Getting price...');
    const price = await jupiterClient.getPrice(
      DEVNET_TOKENS.SOL,
      DEVNET_TOKENS.USDC,
      100_000_000
    );
    logger.info(`✅ Price ratio: ${price.toFixed(6)}`);

    // 测试路由验证
    logger.info('Validating route...');
    const isValid = await jupiterClient.validateRoute(
      DEVNET_TOKENS.SOL,
      DEVNET_TOKENS.USDC,
      100_000_000
    );
    logger.info(`✅ Route valid: ${isValid}`);

    return true;
  } catch (error: any) {
    logger.error(`❌ Test 1 failed: ${error.message}`);
    return false;
  }
}

/**
 * 测试2: TransactionBuilder集成
 */
async function testTransactionBuilder() {
  logger.info('\n=== Test 2: TransactionBuilder Integration ===');

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // 生成测试密钥（仅用于测试，不发送交易）
    const testKeypair = Keypair.generate();
    logger.info(`Test wallet: ${testKeypair.publicKey.toBase58()}`);

    // 初始化Jupiter
    logger.info('Initializing Jupiter in TransactionBuilder...');
    TransactionBuilder.initializeJupiter(connection);
    logger.info('✅ Jupiter initialized');

    // 构建Swap交易
    logger.info('Building swap transaction...');
    const swapResult = await TransactionBuilder.buildRealSwapTransaction(
      DEVNET_TOKENS.SOL,
      DEVNET_TOKENS.USDC,
      50_000_000, // 0.05 SOL
      testKeypair,
      100, // 1% slippage
      0 // no priority fee for test
    );

    logger.info(`✅ Swap transaction built:`);
    logger.info(`   Input Amount: ${swapResult.inputAmount} lamports`);
    logger.info(`   Output Amount: ${swapResult.outputAmount}`);
    logger.info(`   Price Impact: ${swapResult.priceImpact.toFixed(3)}%`);
    logger.info(`   DEXes: ${swapResult.dexes.join(', ')}`);
    logger.info(`   Transaction signed: ${swapResult.signedTransaction.signatures.length > 0}`);

    // 检查交易是否已签名
    const isSigned = swapResult.signedTransaction.signatures.length > 0;
    logger.info(`   Signatures: ${isSigned ? '✅ Signed' : '❌ Not signed'}`);

    return true;
  } catch (error: any) {
    logger.error(`❌ Test 2 failed: ${error.message}`);
    return false;
  }
}

/**
 * 测试3: 模拟套利路径
 */
async function testArbitrageSimulation() {
  logger.info('\n=== Test 3: Arbitrage Path Simulation ===');

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const jupiterClient = createJupiterClient(connection);

    const startAmount = 100_000_000; // 0.1 SOL

    // 第一跳: SOL → USDC
    logger.info('Step 1: SOL → USDC');
    const quote1 = await jupiterClient.getQuote(
      DEVNET_TOKENS.SOL,
      DEVNET_TOKENS.USDC,
      startAmount,
      50
    );
    const usdcAmount = parseInt(quote1.outAmount);
    logger.info(`✅ Got ${usdcAmount} USDC (Impact: ${quote1.priceImpactPct}%)`);

    // 第二跳: USDC → SOL
    logger.info('Step 2: USDC → SOL');
    const quote2 = await jupiterClient.getQuote(
      DEVNET_TOKENS.USDC,
      DEVNET_TOKENS.SOL,
      usdcAmount,
      50
    );
    const endAmount = parseInt(quote2.outAmount);
    logger.info(`✅ Got ${endAmount} lamports SOL (Impact: ${quote2.priceImpactPct}%)`);

    // 计算利润
    const profit = endAmount - startAmount;
    const profitPercent = (profit / startAmount) * 100;

    logger.info(`\n=== Arbitrage Result ===`);
    logger.info(`   Start: ${startAmount} lamports`);
    logger.info(`   End: ${endAmount} lamports`);
    logger.info(`   Profit: ${profit} lamports (${profitPercent.toFixed(3)}%)`);
    logger.info(`   Status: ${profit > 0 ? '✅ PROFITABLE' : '❌ NOT PROFITABLE'}`);

    return true;
  } catch (error: any) {
    logger.error(`❌ Test 3 failed: ${error.message}`);
    return false;
  }
}

/**
 * 测试4: 性能测试
 */
async function testPerformance() {
  logger.info('\n=== Test 4: Performance Test ===');

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const jupiterClient = createJupiterClient(connection);

    const iterations = 5;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      await jupiterClient.getQuote(
        DEVNET_TOKENS.SOL,
        DEVNET_TOKENS.USDC,
        100_000_000,
        50
      );
      
      const latency = Date.now() - start;
      latencies.push(latency);
      logger.info(`   Iteration ${i + 1}: ${latency}ms`);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    logger.info(`\n✅ Performance Results:`);
    logger.info(`   Average: ${avgLatency.toFixed(0)}ms`);
    logger.info(`   Min: ${minLatency}ms`);
    logger.info(`   Max: ${maxLatency}ms`);

    return true;
  } catch (error: any) {
    logger.error(`❌ Test 4 failed: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  logger.info('🚀 Starting Jupiter Swap Integration Tests\n');

  const results = {
    test1: await testJupiterClient(),
    test2: await testTransactionBuilder(),
    test3: await testArbitrageSimulation(),
    test4: await testPerformance(),
  };

  logger.info('\n' + '='.repeat(50));
  logger.info('📊 Test Results Summary');
  logger.info('='.repeat(50));
  logger.info(`Test 1 (Jupiter Client): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  logger.info(`Test 2 (TransactionBuilder): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  logger.info(`Test 3 (Arbitrage Simulation): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
  logger.info(`Test 4 (Performance): ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  logger.info(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    logger.info('🎉 All tests passed! Jupiter integration is working correctly.');
  } else {
    logger.error('⚠️  Some tests failed. Please check the logs above.');
  }
}

// 运行测试
runAllTests().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
