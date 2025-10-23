# 套利机会通知功能测试指南

## 🎉 功能已实现

恭喜！套利机会发现通知功能已成功添加到系统中。

## 📝 实施内容总结

### 修改的文件

1. **`configs/flashloan-serverchan.toml`** - 添加了机会通知配置项
2. **`packages/core/src/monitoring/service.ts`** - 扩展了监控服务，添加了 `alertOpportunityFound` 方法
3. **`packages/jupiter-bot/src/opportunity-finder.ts`** - 支持监控服务集成
4. **`packages/jupiter-bot/src/flashloan-bot.ts`** - 连接监控服务和机会发现器

### 新增配置项

```toml
[monitoring]
# 机会发现通知（开发阶段）
alert_on_opportunity_found = true  # 发现机会时通知
min_opportunity_profit_for_alert = 1_000_000  # 最小利润阈值 0.001 SOL
opportunity_alert_rate_limit_ms = 0  # 0 = 不限制频率
```

## 🧪 如何测试

### 步骤 1: 确认配置正确

检查 `configs/flashloan-serverchan.toml` 文件，确保包含：

```toml
[monitoring]
enabled = true

[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true

# 机会发现通知（开发阶段）
alert_on_opportunity_found = true
min_opportunity_profit_for_alert = 1_000_000  # 0.001 SOL
opportunity_alert_rate_limit_ms = 0  # 不限制频率
```

### 步骤 2: 测试 Server酱连接

首先确保微信通知可用：

```bash
node test-serverchan.js
```

**预期结果**：微信"服务通知"收到测试消息

### 步骤 3: 启动机器人（干运行模式）

使用干运行模式测试，避免真实交易：

```bash
# 确保配置文件中 dry_run = true
pnpm start --config=./configs/flashloan-serverchan.toml
```

### 步骤 4: 观察通知

机器人启动后，您会收到以下通知：

#### 1. 启动通知
```
🚀 闪电贷机器人已启动
钱包地址: xxx...
模式: 模拟运行
借款范围: 10 - 1000 SOL
```

#### 2. 机会发现通知 ⭐ **新功能**
```
🔍 发现套利机会

检测到潜在套利机会，预期利润 0.005000 SOL

💰 预期利润: 0.005000 SOL
📈 ROI: 2.50%
📥 输入金额: 10.0000 SOL
📤 输出金额: 10.2500 SOL
🌉 桥接代币: USDC
🪙 代币地址: So11111...
```

#### 3. 执行成功通知（如果找到可执行的机会）
```
🎉 闪电贷套利成功！
借款金额: 100.0000 SOL
净利润: 0.005000 SOL
ROI: 500.0%
```

## 📊 通知详情说明

### 机会通知包含的信息

| 字段 | 说明 | 示例 |
|------|------|------|
| 💰 预期利润 | 理论利润（扣费前） | 0.005000 SOL |
| 📈 ROI | 投资回报率 | 2.50% |
| 📥 输入金额 | 查询使用的输入金额 | 10.0000 SOL |
| 📤 输出金额 | 预期输出金额 | 10.2500 SOL |
| 🌉 桥接代币 | 中间交易的代币 | USDC |
| 🪙 代币地址 | 目标代币地址（前8位） | So11111... |

## ⚙️ 配置选项详解

### 1. 利润阈值过滤

```toml
min_opportunity_profit_for_alert = 1_000_000  # 只通知 >= 0.001 SOL 的机会
```

**建议值**：
- 开发调试：`1_000_000` (0.001 SOL) - 看到更多机会
- 正式运行：`5_000_000` (0.005 SOL) - 减少噪音

### 2. 频率限制

```toml
opportunity_alert_rate_limit_ms = 0  # 0 = 不限制
```

**建议值**：
- 开发调试：`0` - 查看所有机会
- 正式运行：`10000` (10秒) - 避免刷屏

### 3. 开关控制

```toml
alert_on_opportunity_found = true  # false = 关闭机会通知
```

**使用场景**：
- 开发阶段：`true` - 了解机会发现情况
- 生产环境：`false` - 只关注执行结果

## 🔍 验证清单

请确认以下内容：

- [ ] 微信收到了机器人启动通知
- [ ] 微信收到了"🔍 发现套利机会"通知
- [ ] 通知中包含完整的字段信息（利润、ROI、输入/输出金额等）
- [ ] 如果有桥接代币，显示了桥接代币名称
- [ ] 只有利润超过阈值（0.001 SOL）的机会才收到通知
- [ ] 日志中显示机会发现的详细信息

## 📱 预期通知频率

根据市场情况，您可能会收到：

- **活跃市场**：每分钟 1-5 条机会通知
- **普通市场**：每 5-10 分钟 1 条
- **冷清市场**：每小时 0-2 条

如果通知太频繁，可以：
1. 提高利润阈值（例如改为 0.005 SOL）
2. 添加频率限制（例如 10 秒）
3. 减少监控的代币数量

## 🐛 故障排查

### 问题 1: 没有收到机会通知

**检查项**：
1. 配置文件中 `alert_on_opportunity_found = true`
2. Server酱配置正确且已启用
3. 机器人成功启动并连接到 Jupiter API
4. 检查日志中是否有"🎯 Opportunity found"消息

**解决方法**：
```bash
# 查看日志
tail -f logs/*.log | grep "Opportunity"

# 降低利润阈值测试
min_opportunity_profit_for_alert = 100_000  # 0.0001 SOL
```

### 问题 2: 通知太频繁

**解决方法**：
```toml
# 方案1: 提高利润阈值
min_opportunity_profit_for_alert = 5_000_000  # 0.005 SOL

# 方案2: 添加频率限制
opportunity_alert_rate_limit_ms = 30000  # 30秒

# 方案3: 减少监控代币
# 编辑 mints-high-liquidity.txt，只保留主流代币
```

### 问题 3: 收到启动通知但没有机会通知

**可能原因**：
1. 市场暂时没有套利机会（正常情况）
2. RPC 连接问题
3. Jupiter API 限流

**检查方法**：
```bash
# 查看 Worker 状态
grep "Worker.*started" logs/*.log

# 查看查询统计
grep "Stats:" logs/*.log
```

## 📊 监控效果评估

运行一段时间后（建议 30-60 分钟），评估：

1. **通知数量是否合理**
   - 太多：调整阈值或频率限制
   - 太少：检查配置和网络连接

2. **机会质量如何**
   - 查看通知中的 ROI 是否符合预期
   - 检查实际执行成功率

3. **对开发是否有帮助**
   - 能否通过通知快速了解市场状况
   - 是否帮助优化策略参数

## 🎯 下一步建议

### 开发阶段
1. 保持 `alert_on_opportunity_found = true`
2. 观察机会发现频率和质量
3. 根据通知调整策略参数
4. 记录高质量机会的特征

### 准备生产
1. 将 `alert_on_opportunity_found = false`
2. 只保留执行结果通知
3. 提高利润阈值到 0.01 SOL 以上
4. 启用熔断和风控机制

## 💡 提示

- 机会发现 ≠ 一定执行：很多机会会因为费用、滑点等因素被过滤
- 通知是异步的：不会阻塞机会扫描和执行
- Server酱免费版：每天 1000 条消息，足够使用
- 建议同时关注日志文件：更详细的调试信息

## 🆘 需要帮助？

如果遇到问题：
1. 查看日志：`tail -f logs/*.log`
2. 检查配置：确保所有配置项正确
3. 测试 Server酱：`node test-serverchan.js`
4. 查看错误：`grep "error" logs/*.log -i`

---

**功能已就绪！** 🎉 现在就可以启动机器人，开始接收套利机会通知了。



