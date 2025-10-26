# 深度模拟模式（Simulate To Bundle）使用指南

## 📋 概述

**深度模拟模式（Simulate To Bundle）**是一个强大的测试功能，它会执行套利交易的**所有真实步骤**，但在最后一步（发送Bundle到链上）之前停止。

## 🎯 功能特点

### ✅ 执行的真实操作

1. ✅ **真实监控机会** - 使用Worker持续扫描Jupiter市场
2. ✅ **真实构建swap指令** - 调用Jupiter Ultra API `/swap-instructions`
3. ✅ **真实签名交易** - 使用钱包私钥签名
4. ✅ **真实计算Tip** - 使用JitoTipOptimizer计算最优小费
5. ✅ **真实构建Bundle** - 创建完整的Jito Bundle（套利交易 + Tip交易）

### ❌ 不执行的操作

6. ❌ **不发送Bundle到Jito** - 不会提交到Block Engine
7. ❌ **不消耗gas费用** - 没有任何链上费用

## 🚀 使用方法

### 1. 配置文件设置

在 `configs/flashloan-dryrun.toml` 中启用：

```toml
[bot]
name = "flashloan-arbitrage-bot-dryrun"
network = "mainnet-beta"
dry_run = true  # 🔴 干运行模式
simulate_to_bundle = true  # 🔥 深度模拟：构建Bundle但不上链
```

### 2. 运行Bot

```bash
npm run start:flashloan:dryrun
```

### 3. 观察输出

当发现套利机会并构建完成时，你会看到：

```
🎭 [SIMULATE_TO_BUNDLE] Bundle built successfully but NOT sending to chain
📦 Bundle Details:
   - Tip: 5000000 lamports (0.005000 SOL)
   - Expected Profit: 8000000 lamports (0.008000 SOL)
   - Net Profit: 3000000 lamports (0.003000 SOL)
   - Latency (build only): 650ms
   - Bundle: Successfully constructed with arbitrage + tip transactions
```

## 📊 对比三种模式

| 特性 | 简单模拟 (dry_run=true) | 深度模拟 (simulate_to_bundle=true) | 真实交易 |
|------|----------------------|----------------------------------|---------|
| 监控机会 | ✅ | ✅ | ✅ |
| 构建指令 | ❌ | ✅ | ✅ |
| 签名交易 | ❌ | ✅ | ✅ |
| 计算Tip | ❌ | ✅ | ✅ |
| 构建Bundle | ❌ | ✅ | ✅ |
| 发送到链上 | ❌ | ❌ | ✅ |
| 消耗gas | ❌ | ❌ | ✅ |
| **适用场景** | 快速观察 | **完整测试** | 实际盈利 |

## 🎓 使用场景

### 场景1：验证整个流程

测试从机会发现到Bundle构建的完整流程，确保：
- Jupiter API连接正常
- Swap指令构建成功
- 钱包签名功能正常
- Jito Bundle构建正确

### 场景2：性能测试

测量完整流程的延迟：
- Quote age（报价年龄）
- Build time（构建时间）
- 总延迟（从发现到准备好发送）

### 场景3：策略优化

观察Tip优化器的行为：
- 不同机会的Tip计算
- 利润分配策略
- 竞争强度评估

### 场景4：部署前最终测试

在真实环境部署前，执行完整的端到端测试，但不承担任何资金风险。

## 📝 日志分析

### 关键日志

```bash
# 1. 模式确认
🚀 闪电贷机器人已启动
模式: 🎭 深度模拟（构建+签名Bundle但不上链）

# 2. 机会发现
🎯 Opportunity found: So11... → USDC → So11... | Profit: 0.003500 SOL

# 3. 并行处理
🚀 Starting parallel validation (stats) + build (execution)...

# 4. 使用缓存quote
🔥 Fetching swap instructions from cached quotes...
📦 Built instructions (quote_age=4ms)

# 5. Bundle构建成功
🎭 [SIMULATE_TO_BUNDLE] Bundle built successfully but NOT sending to chain
📦 Bundle Details:
   - Tip: 5000000 lamports (0.005000 SOL)
   - Expected Profit: 8000000 lamports (0.008000 SOL)
   - Net Profit: 3000000 lamports (0.003000 SOL)
```

## ⚠️ 注意事项

### 1. Quote新鲜度

虽然不上链，但quote的新鲜度(3-4ms)表明系统延迟极低。

### 2. Tip计算

Tip是真实计算的，反映了实际执行时会使用的值。

### 3. 钱包余额

- 深度模拟模式下，**不会检查钱包余额**
- 因为不会实际消耗资金
- 真实交易前必须确保钱包有足够余额

### 4. Leader Schedule

如果启用了`checkJitoLeader`：
- 仍会检查Jito Leader Schedule
- 非Jito slot时会跳过构建
- 可以临时关闭以增加测试机会

## 🔧 配置建议

### 测试配置（最大化机会）

```toml
[bot]
dry_run = true
simulate_to_bundle = true

# 降低阈值以获得更多测试机会
[economics.profitability]
min_profit_lamports = 100_000  # 0.0001 SOL

[economics.risk]
max_loss_lamports = 1_000_000  # 0.001 SOL

# 临时关闭Leader检查
[jito]
check_jito_leader = false  # 增加测试机会
```

### 生产前验证配置（使用真实阈值）

```toml
[bot]
dry_run = true
simulate_to_bundle = true

# 使用真实的利润阈值
[economics.profitability]
min_profit_lamports = 2_000_000  # 0.002 SOL

# 使用真实的风险控制
[economics.risk]
max_loss_lamports = 500_000  # 0.0005 SOL

# 启用Leader检查
[jito]
check_jito_leader = true
```

## 🚀 从模拟到生产

### 步骤1：深度模拟测试（1小时）

```bash
# 使用深度模拟模式
npm run start:flashloan:dryrun

# 观察：
# - 机会发现频率
# - Bundle构建成功率
# - 平均Tip
# - 平均延迟
```

### 步骤2：关闭模拟，小额测试（1小时）

```toml
[bot]
dry_run = false  # ⚠️ 关闭模拟
simulate_to_bundle = false

# 使用小额资金
[flashloan.solend]
max_borrow_amount = 100_000_000  # 0.1 SOL
```

### 步骤3：正常金额运行

```toml
[flashloan.solend]
max_borrow_amount = 10_000_000_000  # 10 SOL（根据实际情况调整）
```

## 📊 预期输出

### 成功的深度模拟

```
=========================================
   统计信息
=========================================
运行时间: 01:00:00
机会发现: 127
机会过滤: 115
交易尝试: 12
交易成功: 12 (100%)  ← 模拟成功
总利润: 0.0450 SOL  ← 理论利润
```

**注意**：`交易成功: 12 (100%)` 表示Bundle构建成功，不是真实上链。

## 💡 故障排除

### 问题1：没有发现机会

**原因**：利润阈值太高

**解决**：临时降低阈值
```toml
min_profit_lamports = 50_000  # 0.00005 SOL
```

### 问题2：构建失败

**原因**：可能是Jupiter API问题或网络问题

**检查**：
1. API Key是否正确
2. 网络连接是否稳定
3. Jupiter API限流（应该使用API Key避免）

### 问题3：Bundle构建延迟太高

**原因**：网络延迟或RPC性能问题

**优化**：
1. 使用高性能RPC（Helius Pro, QuickNode等）
2. 检查网络连接
3. 使用就近的RPC节点

## 📖 技术实现

### 代码位置

**配置解析**：`packages/jupiter-bot/src/flashloan-bot.ts`
```typescript
simulateToBundle: config.bot.simulate_to_bundle
```

**执行逻辑**：`packages/onchain-bot/src/executors/jito-executor.ts`
```typescript
if (this.config.simulateToBundle) {
  // 显示详情但不发送bundle
  logger.info('🎭 [SIMULATE_TO_BUNDLE] Bundle built successfully...');
  return { success: true, bundleId: 'SIMULATED', ... };
}
// 否则发送bundle到Jito
```

---

**文档版本**: v1.0  
**最后更新**: 2025-10-25  
**作者**: AI Assistant

