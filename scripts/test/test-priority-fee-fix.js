/**
 * 测试优先费修复和完整费用计算
 */

const LAMPORTS_PER_SOL = 1_000_000_000;

async function testPriorityFeeFix() {
  console.log('🔬 测试优先费修复和净利润计算\n');
  console.log('═'.repeat(60));

  // 模拟场景：发现一个套利机会
  const opportunity = {
    inputAmount: 10 * LAMPORTS_PER_SOL,  // 查询金额: 10 SOL
    profit: 0.05 * LAMPORTS_PER_SOL,      // 查询利润: 0.05 SOL (0.5% ROI)
  };

  console.log('\n📊 套利机会数据:');
  console.log(`   查询金额: ${opportunity.inputAmount / LAMPORTS_PER_SOL} SOL`);
  console.log(`   查询利润: ${opportunity.profit / LAMPORTS_PER_SOL} SOL`);
  console.log(`   ROI: ${(opportunity.profit / opportunity.inputAmount * 100).toFixed(2)}%`);

  // 计算实际借款金额（放大100倍）
  const borrowAmount = opportunity.inputAmount * 100; // 1000 SOL
  const profitRate = opportunity.profit / opportunity.inputAmount;
  const expectedProfit = Math.floor(profitRate * borrowAmount);

  console.log('\n💰 闪电贷计划:');
  console.log(`   借款金额: ${borrowAmount / LAMPORTS_PER_SOL} SOL`);
  console.log(`   预期利润: ${expectedProfit / LAMPORTS_PER_SOL} SOL`);

  // ===== 旧版计算（错误的） =====
  console.log('\n❌ 旧版计算（仅检查闪电贷费用）:');
  const oldValidation = {
    flashLoanFee: 0, // Jupiter Lend 0%
    netProfit: expectedProfit,
  };
  console.log(`   闪电贷费用: ${oldValidation.flashLoanFee / LAMPORTS_PER_SOL} SOL`);
  console.log(`   净利润: ${oldValidation.netProfit / LAMPORTS_PER_SOL} SOL ⚠️ 虚假盈利！`);

  // ===== 新版计算（正确的） =====
  console.log('\n✅ 新版计算（完整费用扣除）:');
  
  const fees = {
    baseFee: 4 * 5000,           // 基础交易费: 4 signatures × 5000 lamports
    priorityFee: 16_000_000,     // 优先费: 0.016 SOL (假设为固定值)
    jitoTipPercent: 30,          // Jito Tip: 30%
    slippageBufferBps: 15,       // 滑点缓冲: 0.15%
  };

  console.log('\n   📋 费用配置:');
  console.log(`      基础交易费: ${fees.baseFee / LAMPORTS_PER_SOL} SOL (${fees.baseFee} lamports)`);
  console.log(`      优先费: ${fees.priorityFee / LAMPORTS_PER_SOL} SOL`);
  console.log(`      Jito Tip 比例: ${fees.jitoTipPercent}%`);
  console.log(`      滑点缓冲: ${fees.slippageBufferBps / 100}%`);

  // 第一阶段：扣除固定成本
  const fixedCost = fees.baseFee + fees.priorityFee;
  const grossProfit = expectedProfit - fixedCost;

  console.log('\n   🔸 第一阶段：扣除固定成本');
  console.log(`      固定成本合计: ${fixedCost / LAMPORTS_PER_SOL} SOL`);
  console.log(`      毛利润: ${grossProfit / LAMPORTS_PER_SOL} SOL`);

  if (grossProfit <= 0) {
    console.log(`      ❌ 毛利润为负，机会无效！`);
    return;
  }

  // 第二阶段：扣除成功后费用
  const jitoTip = Math.floor(grossProfit * fees.jitoTipPercent / 100);
  const slippageBuffer = Math.floor(borrowAmount * fees.slippageBufferBps / 10000);
  const netProfit = grossProfit - jitoTip - slippageBuffer;

  console.log('\n   🔸 第二阶段：扣除成功后费用');
  console.log(`      Jito Tip (${fees.jitoTipPercent}% × 毛利润): ${jitoTip / LAMPORTS_PER_SOL} SOL`);
  console.log(`      滑点缓冲 (${fees.slippageBufferBps / 100}% × 借款): ${slippageBuffer / LAMPORTS_PER_SOL} SOL`);
  console.log(`      净利润: ${netProfit / LAMPORTS_PER_SOL} SOL`);

  // 结论
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 对比结果:');
  console.log(`   旧版（错误）净利润: ${oldValidation.netProfit / LAMPORTS_PER_SOL} SOL`);
  console.log(`   新版（正确）净利润: ${netProfit / LAMPORTS_PER_SOL} SOL`);
  console.log(`   差异: ${(oldValidation.netProfit - netProfit) / LAMPORTS_PER_SOL} SOL`);
  
  if (netProfit > 0) {
    console.log(`\n   ✅ 新版验证通过 - 这是真正可盈利的机会！`);
  } else {
    console.log(`\n   ❌ 新版验证失败 - 旧版会错误执行这个亏损机会！`);
  }

  // 费用明细总览
  console.log('\n💡 费用明细总览:');
  console.log('   ┌─────────────────────────┬──────────────┐');
  console.log('   │ 项目                    │ 金额 (SOL)   │');
  console.log('   ├─────────────────────────┼──────────────┤');
  console.log(`   │ 预期利润（毛利润）      │ ${(expectedProfit / LAMPORTS_PER_SOL).toFixed(6).padStart(12)} │`);
  console.log(`   │ - 基础交易费            │ ${(fees.baseFee / LAMPORTS_PER_SOL).toFixed(6).padStart(12)} │`);
  console.log(`   │ - 优先费                │ ${(fees.priorityFee / LAMPORTS_PER_SOL).toFixed(6).padStart(12)} │`);
  console.log(`   │ - Jito Tip              │ ${(jitoTip / LAMPORTS_PER_SOL).toFixed(6).padStart(12)} │`);
  console.log(`   │ - 滑点缓冲              │ ${(slippageBuffer / LAMPORTS_PER_SOL).toFixed(6).padStart(12)} │`);
  console.log('   ├─────────────────────────┼──────────────┤');
  console.log(`   │ 净利润                  │ ${(netProfit / LAMPORTS_PER_SOL).toFixed(6).padStart(12)} │`);
  console.log('   └─────────────────────────┴──────────────┘');

  console.log('\n✅ 测试完成！');
}

// 运行测试
testPriorityFeeFix().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

