/**
 * 实际测试优先费估算器 - 真实 RPC 调用
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function testPriorityFeeEstimatorLive() {
  console.log('🔬 实际测试优先费估算器（真实 RPC 调用）\n');
  console.log('═'.repeat(70));

  // 连接到 Solana 主网
  const rpcUrl = 'https://api.mainnet-beta.solana.com';
  console.log(`\n📡 连接到 Solana RPC: ${rpcUrl}`);
  
  const connection = new Connection(rpcUrl, 'confirmed');

  // DEX 程序账户列表
  const DEX_PROGRAMS = [
    new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'), // Raydium AMM
    new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),   // Jupiter V6
    new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),   // Orca Whirlpool
    new PublicKey('Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'),   // Meteora
  ];

  console.log(`\n📋 DEX 程序账户（用于优先费查询）:`);
  DEX_PROGRAMS.forEach((addr, i) => {
    console.log(`   ${i + 1}. ${addr.toBase58()}`);
  });

  // ===== 测试 1: 调用 getRecentPrioritizationFees RPC =====
  console.log('\n' + '─'.repeat(70));
  console.log('\n✅ 测试 1: 调用 getRecentPrioritizationFees RPC');
  console.log('─'.repeat(70));

  try {
    console.log('\n⏳ 正在查询最近的优先费...');
    const startTime = Date.now();
    
    const fees = await connection.getRecentPrioritizationFees({
      lockedWritableAccounts: DEX_PROGRAMS,
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`✅ 查询成功！耗时: ${queryTime}ms`);
    console.log(`\n📊 获取到 ${fees.length} 个优先费样本`);

    if (fees.length === 0) {
      console.log('⚠️ 未获取到任何优先费数据（可能网络暂时无拥堵）');
      return;
    }

    // 统计分析
    const feeValues = fees.map(f => f.prioritizationFee).filter(f => f > 0);
    
    if (feeValues.length === 0) {
      console.log('⚠️ 所有样本的优先费均为 0（网络无拥堵）');
    } else {
      const sortedFees = [...feeValues].sort((a, b) => a - b);
      const min = sortedFees[0];
      const max = sortedFees[sortedFees.length - 1];
      const median = sortedFees[Math.floor(sortedFees.length / 2)];
      const p50 = sortedFees[Math.floor(sortedFees.length * 0.50)];
      const p75 = sortedFees[Math.floor(sortedFees.length * 0.75)];
      const p90 = sortedFees[Math.floor(sortedFees.length * 0.90)];
      const avg = feeValues.reduce((a, b) => a + b, 0) / feeValues.length;

      console.log('\n📈 优先费统计（micro-lamports per CU）:');
      console.log('   ┌─────────────────┬─────────────────┐');
      console.log('   │ 指标            │ 值              │');
      console.log('   ├─────────────────┼─────────────────┤');
      console.log(`   │ 样本数          │ ${feeValues.length.toString().padStart(15)} │`);
      console.log(`   │ 最小值          │ ${min.toString().padStart(15)} │`);
      console.log(`   │ 50th 百分位     │ ${p50.toString().padStart(15)} │`);
      console.log(`   │ 中位数          │ ${median.toString().padStart(15)} │`);
      console.log(`   │ 75th 百分位     │ ${p75.toString().padStart(15)} │`);
      console.log(`   │ 90th 百分位     │ ${p90.toString().padStart(15)} │`);
      console.log(`   │ 最大值          │ ${max.toString().padStart(15)} │`);
      console.log(`   │ 平均值          │ ${Math.floor(avg).toString().padStart(15)} │`);
      console.log('   └─────────────────┴─────────────────┘');

      // 显示前 10 个样本详情
      console.log('\n📋 前 10 个样本详情:');
      fees.slice(0, 10).forEach((fee, i) => {
        console.log(`   ${i + 1}. Slot ${fee.slot}: ${fee.prioritizationFee} micro-lamports/CU`);
      });
    }

  } catch (error) {
    console.error('❌ RPC 调用失败:', error.message);
    console.error('   错误类型:', error.constructor.name);
    return;
  }

  // ===== 测试 2: 模拟完整的优先费估算逻辑 =====
  console.log('\n' + '─'.repeat(70));
  console.log('\n✅ 测试 2: 模拟完整的优先费估算逻辑');
  console.log('─'.repeat(70));

  const testScenarios = [
    { profit: 0.01 * LAMPORTS_PER_SOL, urgency: 'low', desc: '低利润 (0.01 SOL), 低优先级' },
    { profit: 0.1 * LAMPORTS_PER_SOL, urgency: 'medium', desc: '中等利润 (0.1 SOL), 中优先级' },
    { profit: 1 * LAMPORTS_PER_SOL, urgency: 'high', desc: '高利润 (1 SOL), 高优先级' },
    { profit: 5 * LAMPORTS_PER_SOL, urgency: 'veryHigh', desc: '极高利润 (5 SOL), 极高优先级' },
  ];

  for (const scenario of testScenarios) {
    console.log(`\n🔸 场景: ${scenario.desc}`);
    
    try {
      const result = await estimateOptimalFee(
        connection,
        scenario.profit,
        scenario.urgency,
        800_000, // compute units
        DEX_PROGRAMS
      );

      console.log(`   ✅ 估算成功!`);
      console.log(`      策略: ${result.strategy}`);
      console.log(`      每 CU 费用: ${result.feePerCU} micro-lamports`);
      console.log(`      总费用: ${(result.totalFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      console.log(`      计算单元: ${result.computeUnits.toLocaleString()}`);
      console.log(`      费用占利润比: ${((result.totalFee / scenario.profit) * 100).toFixed(2)}%`);

    } catch (error) {
      console.error(`   ❌ 估算失败: ${error.message}`);
    }
  }

  // ===== 测试 3: 完整的费用验证流程 =====
  console.log('\n' + '─'.repeat(70));
  console.log('\n✅ 测试 3: 完整的费用验证流程（模拟真实套利）');
  console.log('─'.repeat(70));

  const arbitrageOpportunity = {
    inputAmount: 10 * LAMPORTS_PER_SOL,
    profit: 0.05 * LAMPORTS_PER_SOL,
    borrowAmount: 1000 * LAMPORTS_PER_SOL,
  };

  console.log(`\n📊 套利机会:`);
  console.log(`   查询金额: ${arbitrageOpportunity.inputAmount / LAMPORTS_PER_SOL} SOL`);
  console.log(`   查询利润: ${arbitrageOpportunity.profit / LAMPORTS_PER_SOL} SOL`);
  console.log(`   ROI: ${(arbitrageOpportunity.profit / arbitrageOpportunity.inputAmount * 100).toFixed(2)}%`);
  console.log(`   计划借款: ${arbitrageOpportunity.borrowAmount / LAMPORTS_PER_SOL} SOL`);

  const profitRate = arbitrageOpportunity.profit / arbitrageOpportunity.inputAmount;
  const expectedProfit = Math.floor(profitRate * arbitrageOpportunity.borrowAmount);

  console.log(`\n💰 预期利润: ${expectedProfit / LAMPORTS_PER_SOL} SOL`);

  try {
    // 估算优先费
    console.log(`\n⏳ 正在动态估算优先费...`);
    const feeEstimate = await estimateOptimalFee(
      connection,
      expectedProfit,
      'high',
      800_000,
      DEX_PROGRAMS
    );

    console.log(`✅ 优先费估算完成: ${(feeEstimate.totalFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

    // 计算完整费用
    const fees = {
      baseFee: 4 * 5000,
      priorityFee: feeEstimate.totalFee,
      jitoTipPercent: 30,
      slippageBufferBps: 15,
    };

    console.log(`\n📋 费用配置:`);
    console.log(`   基础交易费: ${fees.baseFee / LAMPORTS_PER_SOL} SOL`);
    console.log(`   优先费（动态）: ${fees.priorityFee / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Jito Tip: ${fees.jitoTipPercent}%`);
    console.log(`   滑点缓冲: ${fees.slippageBufferBps / 100}%`);

    // 三阶段验证
    const fixedCost = fees.baseFee + fees.priorityFee;
    const grossProfit = expectedProfit - fixedCost;

    console.log(`\n🔸 第一阶段: 扣除固定成本`);
    console.log(`   固定成本: ${fixedCost / LAMPORTS_PER_SOL} SOL`);
    console.log(`   毛利润: ${grossProfit / LAMPORTS_PER_SOL} SOL`);

    if (grossProfit <= 0) {
      console.log(`   ❌ 毛利润为负，机会无效！`);
    } else {
      const jitoTip = Math.floor(grossProfit * fees.jitoTipPercent / 100);
      const slippageBuffer = Math.floor(arbitrageOpportunity.borrowAmount * fees.slippageBufferBps / 10000);
      const netProfit = grossProfit - jitoTip - slippageBuffer;

      console.log(`\n🔸 第二阶段: 扣除成功后费用`);
      console.log(`   Jito Tip: ${jitoTip / LAMPORTS_PER_SOL} SOL`);
      console.log(`   滑点缓冲: ${slippageBuffer / LAMPORTS_PER_SOL} SOL`);
      console.log(`   净利润: ${netProfit / LAMPORTS_PER_SOL} SOL`);

      if (netProfit > 0) {
        console.log(`\n   ✅ 验证通过 - 这是可执行的机会！`);
        console.log(`   💰 最终净利润: ${netProfit / LAMPORTS_PER_SOL} SOL`);
        console.log(`   📈 实际 ROI: ${(netProfit / fixedCost * 100).toFixed(2)}%`);
      } else {
        console.log(`\n   ❌ 验证失败 - 净利润为负`);
      }
    }

  } catch (error) {
    console.error(`❌ 费用验证失败: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ 所有测试完成！');
  console.log('\n💡 提示: 如果所有测试都成功，说明优先费估算器工作正常！');
}

/**
 * 模拟 PriorityFeeEstimator 的核心逻辑
 */
async function estimateOptimalFee(
  connection,
  profit,
  urgency,
  computeUnits,
  dexPrograms
) {
  const MIN_FEE_PER_CU = 20_000;
  const MAX_FEE_PER_CU = 100_000;
  const MAX_FEE_PROFIT_RATIO = 0.10;

  // 1. 查询网络费用
  let networkFeePerCU = MIN_FEE_PER_CU;
  
  try {
    const fees = await connection.getRecentPrioritizationFees({
      lockedWritableAccounts: dexPrograms,
    });

    if (fees && fees.length > 0) {
      const sortedFees = fees
        .map(f => f.prioritizationFee)
        .filter(f => f > 0)
        .sort((a, b) => a - b);

      if (sortedFees.length > 0) {
        const percentileMap = {
          low: 0.50,
          medium: 0.60,
          high: 0.75,
          veryHigh: 0.90,
        };
        const percentile = percentileMap[urgency];
        const index = Math.floor(sortedFees.length * percentile);
        networkFeePerCU = sortedFees[Math.min(index, sortedFees.length - 1)];
      }
    }
  } catch (error) {
    console.log(`   ⚠️ 网络查询失败，使用降级策略: ${error.message}`);
  }

  // 2. 基于利润计算
  const feesBudget = profit * 0.05;
  const profitBasedFeePerCU = Math.floor(feesBudget / computeUnits);

  // 3. 取较大值
  let baseFeePerCU = Math.max(networkFeePerCU, profitBasedFeePerCU);

  // 4. 应用安全限制
  baseFeePerCU = Math.max(baseFeePerCU, MIN_FEE_PER_CU);
  baseFeePerCU = Math.min(baseFeePerCU, MAX_FEE_PER_CU);

  const maxAllowedFee = Math.floor((profit * MAX_FEE_PROFIT_RATIO) / computeUnits);
  if (maxAllowedFee > 0) {
    baseFeePerCU = Math.min(baseFeePerCU, maxAllowedFee);
  }

  const totalFee = baseFeePerCU * computeUnits;

  const source = networkFeePerCU >= profitBasedFeePerCU
    ? `网络争用(${urgency}, ${networkFeePerCU} μL/CU)`
    : `利润基准(5%, ${profitBasedFeePerCU} μL/CU)`;

  return {
    feePerCU: baseFeePerCU,
    totalFee,
    computeUnits,
    strategy: `动态估算: ${source}`,
  };
}

// 运行测试
testPriorityFeeEstimatorLive().catch(error => {
  console.error('\n❌ 测试失败:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
});


