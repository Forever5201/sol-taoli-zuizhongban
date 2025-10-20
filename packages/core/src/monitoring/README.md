# 监控服务模块

提供实时告警和通知功能，帮助您及时了解机器人运行状态。

## 功能特性

- ✅ **Discord Webhook 集成** - 实时推送到 Discord 频道
- ✅ **多种告警类型** - 成功、错误、警告、信息
- ✅ **智能频率限制** - 避免告警轰炸
- ✅ **批量发送** - 可选的批量发送模式
- ✅ **详细统计** - 追踪告警发送状态
- ✅ **丰富的告警场景** - 利润、错误、熔断等

## 快速开始

### 1. 获取 Discord Webhook URL

1. 进入您的 Discord 服务器
2. 服务器设置 → 集成 → Webhook
3. 创建新的 Webhook
4. 复制 Webhook URL

### 2. 初始化监控服务

```typescript
import { MonitoringService } from '@solana-arb-bot/core/monitoring';

const monitoring = new MonitoringService({
  webhookUrl: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
  enabled: true,
  alertOnProfit: true,
  alertOnError: true,
  alertOnWarning: true,
  minProfitForAlert: 1_000_000, // 0.001 SOL
  rateLimitMs: 5000, // 5 秒最多一条
});
```

### 3. 使用示例

#### 利润通知

```typescript
// 交易成功后通知
await monitoring.alertProfit(
  5_000_000, // 0.005 SOL 利润
  'transaction_signature_here',
  {
    roi: 150, // 150% ROI
    tip: 1_000_000, // 0.001 SOL tip
    tokenPair: 'SOL-USDC',
  }
);
```

效果：
```
💰 套利成功！
成功执行套利交易，净利润 0.005000 SOL

💰 净利润: 0.005000 SOL
📈 ROI: 150.00%
🎯 Jito Tip: 0.001000 SOL
🔄 交易对: SOL-USDC
🔗 交易链接: Solscan
```

#### 错误告警

```typescript
// 捕获错误后通知
try {
  await executeArbitrage();
} catch (error) {
  await monitoring.alertError(
    error.message,
    '执行套利交易',
    {
      '交易对': 'SOL-USDC',
      '尝试次数': '3',
    }
  );
}
```

效果：
```
❌ 错误发生
```
Transaction timeout after 30 seconds
```

📍 上下文: 执行套利交易
交易对: SOL-USDC
尝试次数: 3
```

#### 熔断器告警

```typescript
// 熔断器触发时通知
if (circuitBreaker.isTripped()) {
  await monitoring.alertCircuitBreaker(
    '连续失败 5 次',
    300_000, // 5 分钟冷却
    {
      consecutiveFailures: 5,
      successRate: 0.35,
      netProfit: -500_000,
    }
  );
}

// 恢复时通知
if (circuitBreaker.getStatus() === 'closed') {
  await monitoring.alertCircuitBreakerRecovered();
}
```

效果：
```
🚨 熔断器触发！
机器人已自动停止交易以保护资金安全。

⚠️ 原因: 连续失败 5 次
⏳ 冷却时间: 300 秒
🔴 连续失败: 5
📊 成功率: 35.0%
💸 净利润: -0.000500 SOL
```

#### 性能统计

```typescript
// 定期发送性能统计（如每小时）
setInterval(async () => {
  const stats = getPerformanceStats();
  
  await monitoring.alertPerformanceStats({
    totalTrades: stats.total,
    successfulTrades: stats.successful,
    successRate: stats.successRate,
    totalProfit: stats.profit,
    averageProfit: stats.avgProfit,
    averageTip: stats.avgTip,
    uptime: Date.now() - botStartTime,
  });
}, 3600_000); // 每小时
```

效果：
```
📊 性能统计报告
机器人运行统计数据

📊 总交易数: 125
✅ 成功交易: 75
📈 成功率: 60.0%
💰 总利润: 0.125000 SOL
📊 平均利润: 0.001667 SOL
🎯 平均 Tip: 0.000500 SOL
⏱️ 运行时长: 12.50 小时
```

#### 启动和停止通知

```typescript
// 机器人启动时
await monitoring.alertStartup({
  network: 'mainnet-beta',
  capitalSize: 'medium',
  dryRun: false,
  minProfit: 500_000,
});

// 机器人停止时
await monitoring.alertShutdown('手动停止');

// 清理资源
await monitoring.cleanup();
```

## 高级配置

### 批量发送模式

适合高频告警场景，减少 Discord API 调用：

```typescript
const monitoring = new MonitoringService({
  webhookUrl: 'YOUR_WEBHOOK_URL',
  batchIntervalMs: 30000, // 30 秒批量发送一次
  maxBatchSize: 10, // 最多 10 条合并发送
});
```

### 自定义告警

```typescript
await monitoring.sendAlert({
  type: 'success',
  level: 'high',
  title: '🎉 自定义通知',
  description: '这是一条自定义告警消息',
  fields: [
    { name: '字段 1', value: '值 1', inline: true },
    { name: '字段 2', value: '值 2', inline: true },
    { name: '字段 3', value: '值 3', inline: false },
  ],
});
```

### 条件告警

```typescript
// 只在大额利润时告警
const monitoring = new MonitoringService({
  webhookUrl: 'YOUR_WEBHOOK_URL',
  minProfitForAlert: 10_000_000, // 0.01 SOL
});

// 或在代码中判断
if (profit > 10_000_000) {
  await monitoring.alertProfit(profit, tx);
}
```

## 集成到主循环

### JitoExecutor 集成

```typescript
// packages/onchain-bot/src/executors/jito-executor.ts

import { MonitoringService } from '@solana-arb-bot/core/monitoring';

export class JitoExecutor {
  private monitoring: MonitoringService;

  constructor(/* ... */, monitoring: MonitoringService) {
    this.monitoring = monitoring;
  }

  async execute(/* ... */) {
    try {
      const result = await this.sendBundle(/* ... */);
      
      if (result.success) {
        // 成功通知
        await this.monitoring.alertProfit(
          netProfit,
          result.signature!,
          {
            roi,
            tip: result.tipUsed,
            tokenPair: 'SOL-USDC',
          }
        );
      }
    } catch (error) {
      // 错误通知
      await this.monitoring.alertError(
        error.message,
        'Jito Bundle 执行'
      );
    }
  }
}
```

### CircuitBreaker 集成

```typescript
// packages/core/src/economics/circuit-breaker.ts

private open(reason: string): void {
  this.status = 'open';
  this.breakTime = Date.now();
  
  // 发送告警
  this.monitoring?.alertCircuitBreaker(
    reason,
    this.config.cooldownPeriod,
    {
      consecutiveFailures: this.metrics.consecutiveFailures,
      successRate: this.metrics.successRate,
      netProfit: this.metrics.netProfit,
    }
  );
}
```

## 统计信息

```typescript
const stats = monitoring.getStats();

console.log(`总告警数: ${stats.totalAlerts}`);
console.log(`成功通知: ${stats.successNotifications}`);
console.log(`失败通知: ${stats.failedNotifications}`);
console.log(`限流跳过: ${stats.rateLimitedSkips}`);
console.log(`最后通知: ${stats.lastNotificationTime}`);
```

## 配置示例

### 生产环境

```typescript
const monitoring = new MonitoringService({
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  enabled: true,
  alertOnProfit: true,
  alertOnError: true,
  alertOnWarning: true,
  minProfitForAlert: 1_000_000, // 0.001 SOL
  rateLimitMs: 5000, // 5 秒
  batchIntervalMs: 0, // 立即发送
});
```

### 测试环境

```typescript
const monitoring = new MonitoringService({
  webhookUrl: process.env.DISCORD_WEBHOOK_URL_TEST,
  enabled: true,
  alertOnProfit: false, // 测试环境不通知利润
  alertOnError: true,
  alertOnWarning: true,
  minProfitForAlert: 100_000, // 更低的阈值
  rateLimitMs: 1000, // 更频繁
  batchIntervalMs: 10000, // 10 秒批量
  maxBatchSize: 5,
});
```

### 开发环境

```typescript
const monitoring = new MonitoringService({
  enabled: false, // 开发时禁用
});
```

## 最佳实践

1. **设置合理的利润阈值**
   - 避免小额利润频繁通知
   - 建议 ≥ 0.001 SOL

2. **使用频率限制**
   - 避免短时间内大量告警
   - 建议 5-10 秒

3. **批量发送（可选）**
   - 高频交易场景下使用
   - 减少 API 调用

4. **定期性能统计**
   - 每小时或每天发送一次
   - 便于长期监控

5. **优雅退出**
   - 停止时调用 `cleanup()`
   - 确保剩余告警发送完成

## 故障排除

### 告警未发送

1. 检查 `webhookUrl` 是否正确
2. 检查 `enabled` 是否为 `true`
3. 检查网络连接
4. 查看日志中的错误信息

### 告警被限流

1. 减少告警频率
2. 增加 `rateLimitMs`
3. 使用批量发送模式
4. 提高 `minProfitForAlert`

### Discord 频道未收到消息

1. 确认 Webhook URL 有效
2. 检查 Discord 服务器权限
3. 确认 Webhook 未被删除
4. 尝试直接访问 Webhook URL（浏览器）

## 参考资料

- [Discord Webhooks 文档](https://discord.com/developers/docs/resources/webhook)
- [Discord Embed 格式](https://discord.com/developers/docs/resources/channel#embed-object)

