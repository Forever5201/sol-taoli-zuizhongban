# 动态 Tip 优化 - 5分钟快速启动 🚀

## 🎯 目标
将 Bundle 成功率从 60% 提升到 75%+，净利润提升 2-3 倍

---

## 第一步：选择配置策略（30秒）

根据你的资金量级选择一个配置文件：

| 资金量 | 配置文件 | 利润分成 | 目标成功率 |
|--------|---------|---------|-----------|
| 0.1-1 SOL | `config.conservative-tip.toml` | 25% | 65% |
| 1-10 SOL | `config.balanced-tip.toml` | 30% | 70% |
| 10+ SOL | `config.aggressive-tip.toml` | 45% | 85% |
| 闪电贷 | `config.flashloan.toml` | 35% | 75% |

**推荐**: 从平衡策略开始 ✅

---

## 第二步：测试功能（2分钟）

运行测试脚本验证 Tip 优化功能：

```bash
# Windows
scripts\test-tip-optimizer.bat

# Linux/Mac
npx tsx scripts/test-tip-optimizer.ts
```

**预期输出**:
```
📊 场景 1: 保守策略（小资金）
预期利润: 0.001000 SOL
计算 Tip: 0.000250 SOL  ✅ 25% 利润分成
Tip/利润比: 25.0%
净利润: 0.000750 SOL
```

---

## 第三步：启动机器人（30秒）

使用选择的配置启动：

```bash
# 平衡策略（推荐）
npm run start:onchain-bot -- packages/onchain-bot/config.balanced-tip.toml

# 保守策略
npm run start:onchain-bot -- packages/onchain-bot/config.conservative-tip.toml

# 激进策略
npm run start:onchain-bot -- packages/onchain-bot/config.aggressive-tip.toml

# Flash Loan 模式
npm run start:onchain-bot -- packages/onchain-bot/config.flashloan.toml
```

---

## 第四步：观察日志（2分钟）

### ✅ 期望看到的日志

**1. 初始化成功**:
```
✅ Jito Leader Scheduler enabled (4x success rate boost expected)
Jito executor initialized | Leader Check: ON
```

**2. Tip 计算日志（INFO 级别）**:
```
Calculating tip | Profit: 5000000 | Competition: 50.0% | Urgency: 70.0%
Tip calculated | Amount: 1750000 lamports (0.001750 SOL) | Profit Share: 35.0%
```

**3. Bundle 执行日志**:
```
✅ Jito Leader check passed: Current slot 123456789 is Jito Leader
Executing bundle | Expected Profit: 5000000 lamports | Tip: 1750000 lamports
✅ Bundle landed successfully! | Net Profit: 3250000 lamports
```

### ⏭️ 正常的跳过日志

```
⏭️  Skipping bundle: Jito Leader too far (10 slots, max 5)
```

**注意**: 看到 70-80% 的 bundle 被跳过是**正常的**！这正是 Leader 检查在工作。

---

## 📊 预期效果

### 第一天（积累历史数据）
- 成功率: 65-70%（历史学习未生效）
- 使用实时 Jito API 数据

### 第二天起（历史学习生效）
- 成功率: 70-75%+
- 融合实时和历史数据（40% 历史权重）
- 每个 token pair 独立学习

### 一周后（稳定运行）
- 成功率: 75%+
- 充足的历史数据
- 最优的 Tip 策略

---

## 🔧 快速调优

### 成功率不够高？增加利润分成

编辑配置文件：
```toml
[execution.tip_strategy]
profit_share_percentage = 0.40  # 从 0.35 增加到 0.40
```

### 成功率太低但 Tip 很高？降低竞争倍数

```toml
competition_multiplier = 2.0  # 从 2.5 降低到 2.0
```

### 想更依赖历史数据？增加历史权重

```toml
historical_weight = 0.5  # 从 0.4 增加到 0.5
```

---

## 💡 使用技巧

### 1. 日志级别调整

**生产环境**（减少日志量）:
```toml
[monitoring]
log_level = "info"  # 只看重要日志
```

**调试阶段**（详细日志）:
```toml
[monitoring]
log_level = "debug"  # 看到所有 Tip 计算过程
```

### 2. 监控关键指标

定期查看统计报告（如果机器人支持）:
```
Success Rate: 75.0%  ✅ 目标达成
Avg Tip: 0.001800 SOL
Tip Efficiency: 155.6%  ✅ 盈利中
```

### 3. 不同 Token Pair 的策略

历史学习是按 token pair 独立的：
- 热门 pair (SOL-USDC): 快速积累数据，精确优化
- 长尾 pair: 数据少，主要使用实时策略

---

## ❓ 常见问题

### Q: 为什么我的成功率只有 65%，不是 75%？

A: 
1. 检查是否积累了足够的历史数据（至少运行 1-2 小时）
2. 检查 RPC 延迟（高延迟会降低成功率）
3. 尝试增加 `profit_share_percentage`

### Q: Tip 太高了，利润不够

A: 
1. 降低 `profit_share_percentage`（如从 35% 到 30%）
2. 使用保守策略配置
3. 检查 `min_profit_lamports` 设置，确保只做高利润套利

### Q: 历史学习什么时候生效？

A: 
- 每个 token pair 需要至少 10 条历史记录
- 通常运行 1-2 小时后开始生效
- 查看日志中的 `TokenPair` 字段确认

### Q: 可以同时运行多个策略吗？

A: 
- 可以！使用不同的钱包和配置文件启动多个实例
- 建议：小资金用保守策略，大资金用激进策略

---

## 🎯 成功标准

运行 24 小时后，你应该看到：

- ✅ 成功率 > 70%
- ✅ Tip Efficiency > 150%（即 Tip < 2/3 利润）
- ✅ 净利润 > 修改前的 2 倍
- ✅ Leader Check Skips 约 70-80%

如果未达标，参考 `TIP_OPTIMIZATION_COMPLETE.md` 进行调优。

---

## 📚 深入学习

- **完整文档**: `TIP_OPTIMIZATION_COMPLETE.md`
- **测试脚本**: `scripts/test-tip-optimizer.ts`
- **配置示例**: `packages/onchain-bot/config.*.toml`

---

## 🎉 就这么简单！

1. ✅ 选择配置
2. ✅ 测试功能
3. ✅ 启动机器人
4. ✅ 观察效果

**预期**: 成功率 60% → 75%+，净利润提升 2-3 倍！

需要帮助？查看完整文档或运行测试脚本诊断。

**祝你套利成功！** 💰🚀

