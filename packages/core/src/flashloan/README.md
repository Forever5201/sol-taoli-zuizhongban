# 闪电贷模块

无本金原子套利 - 通过Solend等协议实现闪电贷功能。

## 🎯 核心概念

### 什么是闪电贷？

闪电贷（Flash Loan）是DeFi中的一种**无抵押贷款**，特点：

1. **无需抵押** - 不需要提供任何抵押品
2. **原子性** - 借款和还款必须在同一个交易中完成
3. **即时还款** - 如果还款失败，整个交易回滚
4. **低费用** - 通常只收取0.05-0.1%的手续费

### 套利场景

```
传统套利（需要本金）：
┌─────────────────────────────────┐
│ 自有资金: 1 SOL                 │
│ 最大套利: 1 SOL × 5% = 0.05 SOL│
└─────────────────────────────────┘

闪电贷套利（无需本金）：
┌─────────────────────────────────┐
│ 借款: 100 SOL                   │
│ 套利: 100 SOL × 5% = 5 SOL     │
│ 费用: 100 SOL × 0.09% = 0.09   │
│ 净利润: 5 - 0.09 = 4.91 SOL    │
└─────────────────────────────────┘
```

## 📦 支持的协议

| 协议 | 费率 | TVL | 状态 |
|------|------|-----|------|
| **Solend** | 0.09% | $200M+ | ✅ 已实现 |
| Mango Markets | 0.05% | $100M+ | ⚪ 计划中 |
| MarginFi | 0.10% | $50M+ | ⚪ 计划中 |

## 🚀 快速开始

### 基础用法

```typescript
import { SolendAdapter, FlashLoanTransactionBuilder } from '@solana-arb-bot/core/flashloan';
import { PublicKey } from '@solana/web3.js';

// 1. 构建闪电贷
const flashLoan = SolendAdapter.buildFlashLoan(
  100_000_000_000, // 100 SOL (lamports)
  'SOL',           // 代币符号
  userTokenAccount,
  wallet.publicKey
);

console.log(`借款金额: ${flashLoan.borrowAmount}`);
console.log(`还款金额: ${flashLoan.repayAmount}`);
console.log(`手续费: ${flashLoan.fee}`);

// 2. 构建原子套利交易
const tx = FlashLoanTransactionBuilder.buildAtomicArbitrageTx(
  {
    useFlashLoan: true,
    flashLoanConfig: {
      protocol: FlashLoanProtocol.SOLEND,
      amount: 100_000_000_000,
      tokenMint: new PublicKey('So11111111111111111111111111111111111111112'),
    },
    arbitrageInstructions: [
      // 你的套利交易指令
      swapIx1,
      swapIx2,
    ],
    wallet: wallet.publicKey,
  },
  recentBlockhash,
  userTokenAccount
);
```

### 验证闪电贷可行性

```typescript
// 验证闪电贷是否划算
const validation = SolendAdapter.validateFlashLoan(
  100_000_000_000, // 借款金额
  5_000_000_000    // 预期利润
);

if (validation.valid) {
  console.log(`✅ 可行！净利润: ${validation.netProfit}`);
} else {
  console.log(`❌ 不可行: ${validation.reason}`);
}
```

### 计算最优借款金额

```typescript
const optimal = FlashLoanTransactionBuilder.calculateOptimalBorrowAmount(
  1_000_000_000,   // 自有资金: 1 SOL
  10_000_000_000,  // 机会需要: 10 SOL
  0.05             // 预期利润率: 5%
);

console.log(`策略: ${optimal.strategy}`);
console.log(`借款金额: ${optimal.borrowAmount}`);
console.log(`使用自有资金: ${optimal.useOwnCapital}`);
console.log(`原因: ${optimal.reason}`);
```

## 🏗️ 交易结构

### 原子套利交易

```
┌─────────────────────────────────────────┐
│ Instruction 0: Flash Borrow             │
│   - 从Solend借入100 SOL                 │
│   - 转账到用户代币账户                   │
├─────────────────────────────────────────┤
│ Instruction 1: Swap (DEX A)             │
│   - 100 SOL → 2000 USDC                 │
├─────────────────────────────────────────┤
│ Instruction 2: Swap (DEX B)             │
│   - 2000 USDC → 105 SOL                 │
├─────────────────────────────────────────┤
│ Instruction 3: Flash Repay              │
│   - 还款100.09 SOL (含0.09%费用)        │
│   - 剩余4.91 SOL为利润                  │
└─────────────────────────────────────────┘

⚠️ 如果任何指令失败，整个交易回滚
```

## 📊 成本计算

### 费用构成

```typescript
总成本 = 闪电贷费用 + Gas费用 + 优先费 + (可选)Jito小费

// 示例
借款金额: 100 SOL
闪电贷费用: 100 × 0.09% = 0.09 SOL
Gas费用: ~0.00005 SOL
优先费: ~0.0001 SOL
总成本: ~0.09015 SOL

// 盈亏平衡点
预期利润 > 0.09015 SOL 才有意义
```

### 投资回报率

```typescript
ROI = (净利润 / 闪电贷费用) × 100%

// 示例
净利润: 4.91 SOL
费用: 0.09 SOL
ROI = (4.91 / 0.09) × 100% = 5,455%

// 建议
ROI > 1000% → 极好
ROI > 100% → 好
ROI > 10% → 可接受
ROI < 10% → 不建议
```

## 🛡️ 风险管理

### 常见失败原因

1. **流动性不足**
   ```
   问题: 借款金额超过池子可用流动性
   解决: 检查储备余额，分批执行
   ```

2. **套利路径失败**
   ```
   问题: DEX滑点过大，无法完成交易
   解决: 设置合理的滑点保护，预留利润空间
   ```

3. **还款金额不足**
   ```
   问题: 套利利润不足以支付闪电贷费用
   解决: 提前验证，确保利润 > 费用
   ```

4. **计算单元不足**
   ```
   问题: 交易过于复杂，超出计算单元限制
   解决: 优化指令，或提高计算单元预算
   ```

### 安全检查清单

```typescript
// 执行前验证
const checks = [
  // 1. 验证利润
  expectedProfit > flashLoanFee + gasCost,
  
  // 2. 验证流动性
  reserveLiquidity >= borrowAmount,
  
  // 3. 验证滑点
  maxSlippage <= 1%, // 1%
  
  // 4. 验证计算单元
  computeUnits <= 1_400_000,
  
  // 5. 验证账户余额（用于支付Gas）
  walletBalance >= 0.01 * LAMPORTS_PER_SOL,
];

if (!checks.every(Boolean)) {
  throw new Error('安全检查失败');
}
```

## 🔧 高级用法

### 多跳套利

```typescript
// 三角套利: SOL → USDC → USDT → SOL
const arbitrageInstructions = [
  // Hop 1: SOL → USDC (Raydium)
  await buildRaydiumSwapIx(SOL_MINT, USDC_MINT, amount1),
  
  // Hop 2: USDC → USDT (Orca)
  await buildOrcaSwapIx(USDC_MINT, USDT_MINT, amount2),
  
  // Hop 3: USDT → SOL (Jupiter)
  await buildJupiterSwapIx(USDT_MINT, SOL_MINT, amount3),
];

const tx = FlashLoanTransactionBuilder.buildAtomicArbitrageTx({
  useFlashLoan: true,
  flashLoanConfig: { ... },
  arbitrageInstructions,
  wallet: wallet.publicKey,
}, ...);
```

### 组合策略

```typescript
// 自有资金 + 闪电贷组合
const { borrowAmount, useOwnCapital } = 
  FlashLoanTransactionBuilder.calculateOptimalBorrowAmount(
    myCapital,
    opportunitySize,
    profitRate
  );

if (borrowAmount > 0) {
  // 使用闪电贷
  const flashLoan = SolendAdapter.buildFlashLoan(...);
  // 构建交易
} else {
  // 仅使用自有资金
  // 构建常规交易
}
```

## 📈 最佳实践

### 1. 选择合适的场景

```typescript
// ✅ 适合使用闪电贷
- 大额套利机会（>10 SOL）
- 高利润率（>5%）
- 自有资金不足

// ❌ 不适合使用闪电贷
- 小额套利（<1 SOL）
- 低利润率（<2%）
- 费用占比过高（>30%）
```

### 2. 成本优化

```typescript
// 减少计算单元
- 合并相似指令
- 使用Address Lookup Tables
- 优化账户顺序

// 降低失败率
- 设置合理滑点
- 预留利润空间
- 选择高流动性池子
```

### 3. 监控和告警

```typescript
// 实时监控
logger.info('闪电贷监控', {
  borrowAmount,
  expectedProfit,
  flashLoanFee,
  netProfit,
  roi,
});

// 失败告警
if (txFailed) {
  await sendAlert({
    type: 'FLASHLOAN_FAILED',
    reason: failureReason,
    amount: borrowAmount,
  });
}
```

## 🎓 示例代码

### 完整套利流程

```typescript
import { 
  SolendAdapter, 
  FlashLoanTransactionBuilder,
  FlashLoanProtocol 
} from '@solana-arb-bot/core/flashloan';

async function executeFlashLoanArbitrage(
  opportunity: ArbitrageOpportunity
) {
  // 1. 验证是否应该使用闪电贷
  const validation = SolendAdapter.validateFlashLoan(
    opportunity.requiredCapital,
    opportunity.expectedProfit
  );
  
  if (!validation.valid) {
    logger.warn(`闪电贷不可行: ${validation.reason}`);
    return;
  }
  
  // 2. 构建套利指令
  const arbitrageInstructions = await buildArbitrageInstructions(
    opportunity
  );
  
  // 3. 获取用户代币账户
  const userTokenAccount = await getAssociatedTokenAddress(
    opportunity.tokenMint,
    wallet.publicKey
  );
  
  // 4. 构建原子交易
  const recentBlockhash = await connection.getLatestBlockhash();
  const tx = FlashLoanTransactionBuilder.buildAtomicArbitrageTx(
    {
      useFlashLoan: true,
      flashLoanConfig: {
        protocol: FlashLoanProtocol.SOLEND,
        amount: opportunity.requiredCapital,
        tokenMint: opportunity.tokenMint,
      },
      arbitrageInstructions,
      wallet: wallet.publicKey,
    },
    recentBlockhash.blockhash,
    userTokenAccount
  );
  
  // 5. 签名并发送
  tx.sign([wallet]);
  const signature = await connection.sendTransaction(tx);
  
  // 6. 等待确认
  await connection.confirmTransaction({
    signature,
    ...recentBlockhash,
  });
  
  logger.info(`✅ 闪电贷套利成功！净利润: ${validation.netProfit}`);
}
```

## 📚 参考资料

- [Solend文档](https://docs.solend.fi/protocol/flash-loans)
- [Solana闪电贷教程](https://solanacookbook.com/references/flash-loans.html)
- [DeFi闪电贷原理](https://ethereum.org/en/developers/docs/defi/#flash-loans)

## ⚠️ 免责声明

- 闪电贷套利有风险，可能造成Gas费损失
- 本模块仅供学习和研究用途
- 使用前请充分测试，建议从小金额开始
- 交易失败会损失Gas费，请谨慎评估风险

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
