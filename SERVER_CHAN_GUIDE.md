# Server酱（微信通知）使用指南

## 🎉 恭喜！您的 SendKey 已就绪

**您的 SendKey**: `SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ`

---

## 🚀 快速开始（3 步完成）

### 步骤 1: 测试连接（1 分钟）

```bash
# 运行测试脚本
node test-serverchan.js
```

**预期结果**：
- ✅ 看到"测试成功"消息
- ✅ 微信"服务通知"收到测试消息

如果收到了，说明配置成功！🎉

---

### 步骤 2: 配置到机器人（2 分钟）

**方法 1: 使用配置文件（推荐）**

```bash
# 复制配置文件
cp configs/monitoring-serverchan.toml configs/my-config.toml

# 您的 SendKey 已经预填好了，直接使用即可！
```

**方法 2: 编辑现有配置**

在您的配置文件（如 `configs/strategy-small.toml`）中添加：

```toml
[monitoring]
enabled = true

[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true

alert_on_profit = true
alert_on_error = true
alert_on_warning = true
min_profit_for_alert = 1_000_000  # 0.001 SOL
```

---

### 步骤 3: 启动机器人

```bash
# 使用配置启动
pnpm start --config ./configs/my-config.toml
```

**完成！** 🎉 您现在会在微信收到所有重要通知！

---

## 📱 您将收到的通知类型

### 1. 💰 利润通知（最重要！）

每次套利成功都会收到：

```
✅ 套利成功！

成功执行套利交易，净利润 0.005000 SOL

**净利润**: 0.005000 SOL
**ROI**: 150.00%
**Jito Tip**: 0.001000 SOL
**交易对**: SOL-USDC

**时间**: 2025-10-20 14:32:15
```

### 2. ❌ 错误告警

出现问题时：

```
❌ 错误发生

Transaction timeout after 30 seconds

**上下文**: 执行套利交易
**交易对**: SOL-USDC
**尝试次数**: 3

**时间**: 2025-10-20 14:35:10
```

### 3. 🚨 熔断器通知

风险保护触发：

```
⚠️ 熔断器触发！

机器人已自动停止交易以保护资金安全。

**原因**: 连续失败 5 次
**冷却时间**: 300 秒
**连续失败**: 5
**成功率**: 35.0%

**时间**: 2025-10-20 15:00:00
```

### 4. 📊 性能统计

定期（每小时）：

```
ℹ️ 性能统计报告

机器人运行统计数据

**总交易数**: 125
**成功交易**: 75
**成功率**: 60.0%
**总利润**: 0.125000 SOL
**平均利润**: 0.001667 SOL
**运行时长**: 12.50 小时

**时间**: 2025-10-20 16:00:00
```

### 5. 🚀 启动/停止通知

```
ℹ️ 机器人已启动

套利机器人开始运行

**网络**: mainnet-beta
**资金量级**: medium
**模式**: 生产模式
**最小利润**: 0.000500 SOL

**时间**: 2025-10-20 10:00:00
```

---

## 🎛️ 自定义通知设置

### 调整通知阈值

只通知大额利润：

```toml
[monitoring]
min_profit_for_alert = 5_000_000  # 只通知 ≥ 0.005 SOL 的利润
```

### 调整通知频率

避免过于频繁：

```toml
[monitoring]
rate_limit_ms = 10000  # 10 秒内最多一条
```

### 关闭特定类型通知

```toml
[monitoring]
alert_on_profit = true   # 保留利润通知
alert_on_error = true    # 保留错误通知
alert_on_warning = false # 关闭警告通知（如果觉得太多）
```

---

## 💡 实用建议

### 🎯 推荐配置（新手）

```toml
[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true

[monitoring]
alert_on_profit = true
min_profit_for_alert = 500_000   # 0.0005 SOL，接收更多通知
rate_limit_ms = 5000
```

**优点**：能看到大部分交易，了解机器人表现

### 🎯 推荐配置（进阶）

```toml
[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true

[monitoring]
alert_on_profit = true
min_profit_for_alert = 2_000_000  # 0.002 SOL，只通知大额
rate_limit_ms = 10000
```

**优点**：减少通知数量，只关注重要交易

### 🎯 推荐配置（只要关键信息）

```toml
[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true

[monitoring]
alert_on_profit = true
min_profit_for_alert = 5_000_000  # 只通知大额利润
alert_on_error = true              # 错误必须通知
alert_on_warning = true            # 警告必须通知（熔断等）
rate_limit_ms = 30000              # 30 秒
```

**优点**：最精简，只收到最重要的信息

---

## 📊 Server酱免费额度

### 免费版

- **每天 1000 条消息**
- **完全够用**！

**计算**：
- 假设每小时 10 次套利 = 240 次/天
- 假设 2 次错误 = 2 条/天
- 假设 24 次统计报告 = 24 条/天
- **总计**: ~266 条/天 << 1000 条

**结论**：免费版完全满足需求！

### 付费版（可选）

- 如果您运行多个机器人
- 或需要更高频率通知
- 可以考虑升级（￥19.9/月）

---

## 🔧 代码集成示例

如果您想在自己的代码中使用 Server酱：

```typescript
import { MonitoringService } from '@solana-arb-bot/core';

// 初始化
const monitoring = new MonitoringService({
  enabled: true,
  serverChan: {
    sendKey: 'SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ',
    enabled: true,
  },
  alertOnProfit: true,
  minProfitForAlert: 1_000_000,
});

// 利润通知
await monitoring.alertProfit(
  5_000_000,  // 0.005 SOL
  'transaction_signature',
  {
    roi: 150,
    tip: 1_000_000,
    tokenPair: 'SOL-USDC',
  }
);

// 错误通知
await monitoring.alertError(
  'Transaction failed',
  'JitoExecutor'
);

// 熔断通知
await monitoring.alertCircuitBreaker(
  '连续失败 5 次',
  300_000,  // 5 分钟
  {
    consecutiveFailures: 5,
    successRate: 0.35,
  }
);
```

---

## ❓ 常见问题

### Q1: 没收到测试消息？

**解决方案**：

1. **检查微信设置**
   - 打开微信 → 我 → 设置 → 新消息提醒
   - 确保"服务通知"未被屏蔽

2. **等待 1-2 分钟**
   - 首次使用可能有延迟

3. **重新测试**
   ```bash
   node test-serverchan.js
   ```

4. **检查 SendKey**
   - 确认是否完整复制
   - 访问 https://sct.ftqq.com/ 确认

### Q2: 通知太多太烦？

**解决方案**：

```toml
# 提高利润阈值
min_profit_for_alert = 10_000_000  # 只通知 ≥ 0.01 SOL

# 增加频率限制
rate_limit_ms = 60000  # 1 分钟最多一条

# 关闭警告通知
alert_on_warning = false
```

### Q3: 想同时用 Discord 和 Server酱？

**完全可以！**

```toml
[monitoring]
# Discord Webhook
webhook_url = "https://discord.com/api/webhooks/..."

# Server酱（同时启用）
[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true
```

**效果**：
- Discord 收到详细消息（电脑查看）
- 微信收到简要通知（手机查看）
- 双重保障！

### Q4: SendKey 会过期吗？

**不会过期**，除非：
- 您主动重置
- 账号被封（违规使用）

**建议**：
- 妥善保管 SendKey
- 不要分享给他人
- 定期检查通知是否正常

### Q5: 如何更换 SendKey？

```toml
# 只需修改配置文件
[monitoring.serverchan]
send_key = "NEW_SEND_KEY"
```

重启机器人即可。

---

## 📞 获取帮助

### Server酱官方

- 官网：https://sct.ftqq.com/
- 文档：https://sct.ftqq.com/doc
- 问题反馈：官网客服

### 机器人相关

- 查看日志：`tail -f logs/*.log`
- 搜索错误：`grep "Server酱" logs/*.log`
- 查看状态：机器人控制台输出

---

## 🎉 总结

### ✅ 您已完成

1. ✅ 获得 SendKey
2. ✅ 代码已集成 Server酱
3. ✅ 配置文件已准备好
4. ✅ 测试脚本可用

### 🚀 下一步

1. **测试连接**：`node test-serverchan.js`
2. **配置机器人**：修改配置文件
3. **启动运行**：开始接收通知！

---

**您的套利机器人现在会自动向您的微信推送所有重要信息！** 📱💰

再也不用担心错过赚钱机会或出现问题不知道了！🎉

有任何问题随时问我！😊

