# 经济模型核心模块

专业级 Solana DEX 套利经济模型，提供完整的成本计算、利润分析、风险管理和熔断保护功能。

## 🎯 核心功能

### 1. 成本计算器 (CostCalculator)

精确计算 Solana 交易的所有成本：

- **基础交易费**: 每个签名 5,000 lamports
- **优先费**: 基于计算单元和价格
- **Jito 小费**: MEV 保护成本
- **RPC 成本**: 分摊的节点使用成本
- **闪电贷费用**: 0.09% 的借款费用

```typescript
import { CostCalculator, CostConfig } from '@solana-arb-bot/core/economics';

const config: CostConfig = {
  signatureCount: 3,
  computeUnits: 300_000,
  computeUnitPrice: 10_000, // microLamports
  useFlashLoan: false,
};

const jitoTip = 50_000; // lamports
const costs = CostCalculator.calculateTotalCost(config, jitoTip);

console.log(`总成本: ${costs.total} lamports`);
console.log(costs.breakdown); // 详细成本分解
```

### 2. Jito 小费优化器 (JitoTipOptimizer)

智能的动态出价策略：

- 实时获取 Jito 市场数据
- 基于竞争强度动态计算小费
- 历史成功率学习和自适应调整
- 支持不同资金量级的策略

```typescript
import { JitoTipOptimizer } from '@solana-arb-bot/core/economics';

const optimizer = new JitoTipOptimizer();

// 获取特定百分位的小费
const tip = await optimizer.getTipAtPercentile(75);

// 动态计算最优小费
const optimalTip = await optimizer.calculateOptimalTip(
  500_000, // 预期利润
  0.7,     // 竞争强度 (0-1)
  0.5,     // 紧迫性 (0-1)
  'medium' // 资金量级
);

// 记录执行结果
optimizer.recordBundleResult({
  bundleId: 'bundle-123',
  success: true,
  tip: optimalTip,
  profit: 450_000,
  tokenPair: 'SOL/USDC',
  timestamp: Date.now(),
});

// 基于历史推荐小费
const recommendedTip = await optimizer.getRecommendedTip('SOL/USDC', 0.7);
```

### 3. 利润分析器 (ProfitAnalyzer)

精确的利润计算和机会评估：

```typescript
import { ProfitAnalyzer, ArbitrageOpportunity } from '@solana-arb-bot/core/economics';

const analyzer = new ProfitAnalyzer({ conservativeEstimate: true });

const opportunity: ArbitrageOpportunity = {
  tokenPair: 'SOL/USDC',
  // ... 其他字段
  grossProfit: 500_000,
  estimatedSlippage: 0.005,
};

// 完整分析
const analysis = analyzer.analyzeProfitability(opportunity, costConfig, jitoTip);

console.log(`净利润: ${analysis.netProfit} lamports`);
console.log(`ROI: ${analysis.roi.toFixed(2)}%`);
console.log(`是否盈利: ${analysis.isProfitable}`);

// 生成报告
console.log(analyzer.generateReport(analysis));

// 批量评估
const best = analyzer.getBestOpportunity(
  opportunities,
  costConfig,
  jitoTip,
  50_000, // 最小利润门槛
  40      // 最小 ROI
);
```

### 4. 风险管理器 (RiskManager)

多层次风险检查和保护：

```typescript
import { RiskManager, RiskCheckConfig } from '@solana-arb-bot/core/economics';

const riskManager = new RiskManager();

const riskConfig: RiskCheckConfig = {
  minProfitThreshold: 50_000,
  maxGasPrice: 30_000,
  maxJitoTip: 50_000,
  maxSlippage: 0.015,
  minLiquidity: 10_000,
  minROI: 40,
};

// 交易前风险检查
const checkResult = riskManager.preExecutionCheck(
  opportunity,
  analysis,
  riskConfig
);

if (!checkResult.passed) {
  console.log(`风险检查未通过: ${checkResult.reason}`);
}

// 评估风险等级
const riskLevel = riskManager.assessRiskLevel(opportunity, analysis);
console.log(`风险等级: ${riskLevel}`); // 'low' | 'medium' | 'high'

// 计算推荐交易金额
const recommendedAmount = riskManager.calculateRecommendedAmount(
  opportunity,
  availableCapital,
  0.5 // 风险容忍度
);
```

### 5. 熔断机制 (CircuitBreaker)

自动保护系统，防止连续亏损：

```typescript
import { CircuitBreaker, ExtendedCircuitBreakerConfig } from '@solana-arb-bot/core/economics';

const config: ExtendedCircuitBreakerConfig = {
  maxConsecutiveFailures: 3,
  maxHourlyLoss: 500_000,
  minSuccessRate: 0.3,
  cooldownPeriod: 300_000, // 5 分钟
  autoRecovery: true,
};

const breaker = new CircuitBreaker(config);

// 记录交易结果
breaker.recordTransaction({
  success: false,
  cost: 50_000,
  timestamp: Date.now(),
});

// 检查是否可以执行交易
if (!breaker.canAttempt()) {
  console.log('熔断器已打开，暂停交易');
  console.log(`剩余冷却时间: ${breaker.getRemainingCooldown()}ms`);
  return;
}

// 获取状态
console.log(breaker.generateStatusReport());

// 获取健康分数 (0-100)
const health = breaker.getHealthScore();
console.log(`系统健康: ${health}/100`);
```

## 🚀 快速开始

### 安装

```bash
npm install
cd packages/core
npm install
```

### 创建完整系统

```typescript
import { createEconomicsSystem } from '@solana-arb-bot/core/economics';

const economics = createEconomicsSystem({
  jitoApi: 'https://bundles.jito.wtf/api/v1/bundles',
  slippageBuffer: 1.2,
  circuitBreaker: {
    maxConsecutiveFailures: 5,
    maxHourlyLoss: 1_000_000,
    minSuccessRate: 0.4,
  },
});

// 使用各个模块
const { costCalculator, jitoTipOptimizer, profitAnalyzer, riskManager, circuitBreaker } = economics;
```

### 完整决策流程

```typescript
// 1. 验证机会
const validation = riskManager.validateOpportunity(opportunity);
if (!validation.valid) return;

// 2. 计算成本
const jitoTip = await jitoTipOptimizer.calculateOptimalTip(...);
const costs = costCalculator.calculateTotalCost(costConfig, jitoTip);

// 3. 分析利润
const analysis = profitAnalyzer.analyzeProfitability(opportunity, costConfig, jitoTip);

// 4. 风险检查
const riskCheck = riskManager.preExecutionCheck(opportunity, analysis, riskConfig);

// 5. 检查熔断器
if (!circuitBreaker.canAttempt()) return;

// 6. 执行决策
if (riskCheck.passed && analysis.isProfitable) {
  // 执行交易...
  
  // 7. 记录结果
  circuitBreaker.recordTransaction(result);
  jitoTipOptimizer.recordBundleResult(bundleResult);
}
```

## 🛠️ 命令行工具

### 成本模拟器

```bash
# 简单 swap
npm run cost-sim -- -s 2 -cu 200000 -cup 5000

# 带闪电贷
npm run cost-sim -- -s 4 -cu 400000 -fl -fla 50000000000

# 高竞争环境
npm run cost-sim -- -s 3 -cup 20000 -jt 95 -c 0.8
```

### Jito 监控器

```bash
# 实时监控 Jito 小费市场
npm run jito-monitor
```

### 完整演示

```bash
# 运行使用示例
npm run demo
```

## 📊 配置文件

系统支持三种预设策略：

### 小资金策略 (configs/strategy-small.toml)

- 资金量级: < 10 SOL
- 使用闪电贷: 是
- 目标成功率: 50%
- Jito 小费: 50th percentile
- 执行方式: RPC Spam

### 中等资金策略 (configs/strategy-medium.toml)

- 资金量级: 10-100 SOL
- 使用闪电贷: 自动判断
- 目标成功率: 70%
- Jito 小费: 75th percentile
- 执行方式: Jito Bundle

### 大资金策略 (configs/strategy-large.toml)

- 资金量级: > 100 SOL
- 使用闪电贷: 否
- 目标成功率: 90%
- Jito 小费: 95th percentile
- 执行方式: Jito Bundle (激进)

## 🔑 关键数字

### 成本结构

| 成本项 | 金额 | 说明 |
|--------|------|------|
| 基础交易费 | 5,000 lamports/签名 | 固定 |
| 优先费 | 可变 | CU × 价格 / 1,000,000 |
| Jito 小费 (50th) | ~10,000 lamports | 实时变化 |
| Jito 小费 (95th) | ~1,400,000 lamports | 高成功率 |
| 闪电贷费用 | 0.09% | 借款金额的 0.09% |

### 最小盈利门槛

| 策略 | 最小利润 | 说明 |
|------|----------|------|
| 小资金 | 0.0001 SOL | 100,000 lamports |
| 中等资金 | 0.00005 SOL | 50,000 lamports |
| 大资金 | 0.00003 SOL | 30,000 lamports |

## 📖 API 文档

详见各模块的 TypeScript 类型定义和 JSDoc 注释。

## ⚠️ 注意事项

1. **使用专用热钱包**: 切勿使用主钱包进行套利
2. **小额测试**: 先在 Devnet 或小额资金测试
3. **理解风险**: 套利存在失败和亏损风险
4. **监控熔断器**: 密切关注系统健康状态
5. **动态调整**: 根据市场情况调整策略参数

## 📝 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！



