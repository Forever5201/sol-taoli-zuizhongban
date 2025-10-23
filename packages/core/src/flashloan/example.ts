/**
 * 闪电贷使用示例
 * 
 * 演示如何使用闪电贷进行套利
 */

import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { SolendAdapter } from './solend-adapter';
import { FlashLoanTransactionBuilder } from './transaction-builder';
import { FlashLoanProtocol } from './types';

/**
 * 示例1：验证闪电贷可行性
 */
function example1_ValidateFlashLoan() {
  const borrowAmount = 100 * 1e9; // 100 SOL
  const expectedProfit = 5 * 1e9;  // 5 SOL

  const validation = SolendAdapter.validateFlashLoan(borrowAmount, expectedProfit, {
    baseFee: 4 * 5000,  // 4 signatures
    priorityFee: 16_000_000,  // 0.016 SOL
    jitoTipPercent: 30,
    slippageBufferBps: 15,
  });

  console.log('=== 闪电贷可行性验证 ===');
  console.log(`借款金额: ${borrowAmount / 1e9} SOL`);
  console.log(`预期利润: ${expectedProfit / 1e9} SOL`);
  console.log(`闪电贷费用: ${validation.fee / 1e9} SOL`);
  console.log(`净利润: ${validation.netProfit / 1e9} SOL`);
  console.log(`可行: ${validation.valid ? '✅' : '❌'}`);
  if (!validation.valid) {
    console.log(`原因: ${validation.reason}`);
  }
}

/**
 * 示例2：计算最优借款金额
 */
function example2_CalculateOptimalBorrow() {
  const availableCapital = 1 * 1e9;   // 1 SOL
  const opportunitySize = 10 * 1e9;   // 10 SOL
  const profitRate = 0.05;            // 5%

  const optimal = FlashLoanTransactionBuilder.calculateOptimalBorrowAmount(
    availableCapital,
    opportunitySize,
    profitRate
  );

  console.log('\n=== 最优借款策略 ===');
  console.log(`可用资金: ${availableCapital / 1e9} SOL`);
  console.log(`机会规模: ${opportunitySize / 1e9} SOL`);
  console.log(`预期利润率: ${profitRate * 100}%`);
  console.log(`策略: ${optimal.strategy}`);
  console.log(`借款金额: ${optimal.borrowAmount / 1e9} SOL`);
  console.log(`使用自有资金: ${optimal.useOwnCapital / 1e9} SOL`);
  console.log(`原因: ${optimal.reason}`);
}

/**
 * 示例3：构建闪电贷套利交易
 */
async function example3_BuildFlashLoanArbitrage() {
  // 注意：这是演示代码，需要真实的连接和密钥
  console.log('\n=== 构建闪电贷交易 ===');
  console.log('以下是伪代码示例：\n');

  console.log(`
// 1. 准备参数
const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet = Keypair.generate();
const borrowAmount = 100 * 1e9; // 100 SOL
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// 2. 构建套利指令（示例）
const arbitrageInstructions: TransactionInstruction[] = [
  // Swap 1: SOL → USDC (Raydium)
  await buildRaydiumSwap(SOL_MINT, USDC_MINT, amount1),
  
  // Swap 2: USDC → USDT (Orca)
  await buildOrcaSwap(USDC_MINT, USDT_MINT, amount2),
  
  // Swap 3: USDT → SOL (Jupiter)
  await buildJupiterSwap(USDT_MINT, SOL_MINT, amount3),
];

// 3. 构建闪电贷交易
const tx = await TransactionBuilder.buildFlashLoanArbitrageTx(
  borrowAmount,
  SOL_MINT,
  arbitrageInstructions,
  wallet,
  connection
);

// 4. 发送交易
const signature = await connection.sendTransaction(tx);
console.log('交易签名:', signature);
  `);
}

/**
 * 示例4：估算交易成本
 */
function example4_EstimateCosts() {
  const borrowAmount = 100 * 1e9;
  const flashLoanFee = SolendAdapter.calculateFee(borrowAmount);
  
  // 估算计算单元
  const computeUnits = FlashLoanTransactionBuilder.estimateComputeUnits(
    true,  // 使用闪电贷
    3      // 3条套利指令
  );

  // 估算Gas费（假设）
  const priorityFee = 10_000; // microLamports
  const gasCost = (computeUnits * priorityFee) / 1_000_000; // lamports

  console.log('\n=== 成本估算 ===');
  console.log(`借款金额: ${borrowAmount / 1e9} SOL`);
  console.log(`闪电贷费用: ${flashLoanFee / 1e9} SOL (${(SolendAdapter.FEE_RATE * 100).toFixed(2)}%)`);
  console.log(`计算单元: ${computeUnits.toLocaleString()}`);
  console.log(`Gas费用: ${gasCost / 1e9} SOL`);
  console.log(`总成本: ${(flashLoanFee + gasCost) / 1e9} SOL`);
  console.log(`\n盈亏平衡点: 预期利润需 > ${((flashLoanFee + gasCost) / 1e9).toFixed(6)} SOL`);
}

/**
 * 示例5：风险评估
 */
function example5_RiskAssessment() {
  const borrowAmount = 100 * 1e9;
  const expectedProfit = 5 * 1e9;
  const gasCost = 0.0001 * 1e9;

  const assessment = FlashLoanTransactionBuilder.validateFlashLoanArbitrage(
    borrowAmount,
    expectedProfit,
    gasCost
  );

  console.log('\n=== 风险评估 ===');
  console.log(`可行性: ${assessment.feasible ? '✅ 可行' : '❌ 不可行'}`);
  console.log(`闪电贷费用: ${assessment.flashLoanFee / 1e9} SOL`);
  console.log(`净利润: ${assessment.netProfit / 1e9} SOL`);
  console.log(`ROI: ${assessment.roi.toFixed(2)}%`);
  
  if (assessment.warnings.length > 0) {
    console.log('\n⚠️  警告:');
    assessment.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   Solana 闪电贷套利 - 使用示例            ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  example1_ValidateFlashLoan();
  example2_CalculateOptimalBorrow();
  await example3_BuildFlashLoanArbitrage();
  example4_EstimateCosts();
  example5_RiskAssessment();

  console.log('\n=== 示例完成 ===');
  console.log('提示: 这些是演示代码，实际使用需要：');
  console.log('  1. 真实的RPC连接');
  console.log('  2. 充足的钱包余额（Gas费）');
  console.log('  3. 真实的套利交易指令');
  console.log('  4. 在Devnet上充分测试');
}

// 运行示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_ValidateFlashLoan,
  example2_CalculateOptimalBorrow,
  example3_BuildFlashLoanArbitrage,
  example4_EstimateCosts,
  example5_RiskAssessment,
};
