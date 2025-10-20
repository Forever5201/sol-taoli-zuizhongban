# 日志系统

基于 Pino 的高性能日志系统，提供灵活的配置选项和多种输出方式。

## 功能特性

- ✅ **高性能** - Pino 是最快的 Node.js 日志库
- ✅ **结构化日志** - JSON 格式，易于解析和分析
- ✅ **美化输出** - 开发环境下彩色、易读的输出
- ✅ **文件输出** - 支持日志持久化
- ✅ **日志轮转** - 自动管理日志文件（可选）
- ✅ **多级别** - trace, debug, info, warn, error, fatal
- ✅ **模块化** - 每个模块可以有独立的日志器

## 快速开始

### 基础用法

```typescript
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('MyModule');

logger.info('这是一条信息日志');
logger.debug('调试信息', { userId: 123 });
logger.error('发生错误', { error: err.message });
logger.warn('警告信息');
```

### 增强配置

```typescript
import { createEnhancedLogger } from '@solana-arb-bot/core/logger/config';

const logger = createEnhancedLogger({
  level: 'debug',
  prettyPrint: true,
  fileOutput: true,
  logDir: './logs',
  logFileName: 'bot.log',
  consoleOutput: true,
  timestamp: true,
});

const moduleLogger = logger.child({ module: 'MyModule' });
moduleLogger.info('使用增强的日志器');
```

### 日志轮转（推荐生产环境）

```typescript
import { createRotatingFileLogger } from '@solana-arb-bot/core/logger/config';

const logger = createRotatingFileLogger({
  level: 'info',
  logDir: './logs',
  logFileName: 'bot.log',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 7, // 保留 7 天
  frequency: 'daily', // 每天轮转
});
```

**注意**: 需要安装 `pino-roll`：
```bash
pnpm add pino-roll
```

## 日志级别

从低到高：

| 级别 | 用途 | 示例 |
|-----|------|------|
| `trace` | 最详细的跟踪信息 | 函数进入/退出 |
| `debug` | 调试信息 | 变量值、中间状态 |
| `info` | 一般信息 | 启动、关键操作 |
| `warn` | 警告信息 | 配置缺失、降级运行 |
| `error` | 错误信息 | 异常、失败操作 |
| `fatal` | 致命错误 | 程序崩溃 |

**设置日志级别**:
```bash
# 环境变量
export LOG_LEVEL=debug

# 或在代码中
const logger = createEnhancedLogger({ level: 'debug' });
```

## 配置选项

### LoggerConfig

```typescript
interface LoggerConfig {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint?: boolean;        // 美化输出
  fileOutput?: boolean;          // 输出到文件
  logDir?: string;               // 日志目录
  logFileName?: string;          // 日志文件名
  consoleOutput?: boolean;       // 输出到控制台
  timestamp?: boolean;           // 包含时间戳
  includeMetadata?: boolean;     // 包含 pid/hostname
  production?: boolean;          // 生产模式
}
```

### 预设配置

#### 开发环境

```typescript
import { defaultDevelopmentConfig, createEnhancedLogger } from '@solana-arb-bot/core/logger/config';

const logger = createEnhancedLogger(defaultDevelopmentConfig);
// level: 'debug'
// prettyPrint: true
// fileOutput: true (./logs/dev.log)
// consoleOutput: true
```

#### 生产环境

```typescript
import { defaultProductionConfig, createEnhancedLogger } from '@solana-arb-bot/core/logger/config';

const logger = createEnhancedLogger(defaultProductionConfig);
// level: 'info'
// prettyPrint: false
// fileOutput: true (./logs/production.log)
// consoleOutput: true (JSON 格式)
// includeMetadata: true
```

#### 测试环境

```typescript
import { defaultTestConfig, createEnhancedLogger } from '@solana-arb-bot/core/logger/config';

const logger = createEnhancedLogger(defaultTestConfig);
// level: 'warn'
// fileOutput: false
// consoleOutput: false (静默模式)
```

#### 自动选择

```typescript
import { getDefaultConfig, createEnhancedLogger } from '@solana-arb-bot/core/logger/config';

const logger = createEnhancedLogger(getDefaultConfig());
// 根据 NODE_ENV 自动选择配置
```

## 使用示例

### 结构化日志

```typescript
logger.info({
  event: 'trade_executed',
  tokenPair: 'SOL-USDC',
  profit: 0.005,
  roi: 150,
}, 'Trade executed successfully');

// 输出 (JSON):
// {
//   "level": "info",
//   "time": "2025-10-20T10:30:00.000Z",
//   "module": "Executor",
//   "event": "trade_executed",
//   "tokenPair": "SOL-USDC",
//   "profit": 0.005,
//   "roi": 150,
//   "msg": "Trade executed successfully"
// }
```

### 错误日志

```typescript
try {
  await executeArbitrage();
} catch (error) {
  logger.error({
    err: error,
    context: 'arbitrage_execution',
    tokenPair: 'SOL-USDC',
  }, 'Failed to execute arbitrage');
}
```

### 性能测量

```typescript
const start = Date.now();

// ... 执行操作 ...

logger.debug({
  operation: 'query_jupiter',
  duration: Date.now() - start,
  tokenCount: 100,
}, 'Query completed');
```

### 条件日志

```typescript
if (logger.isLevelEnabled('debug')) {
  const detailedInfo = expensiveDebugInfoGeneration();
  logger.debug(detailedInfo, 'Detailed debug info');
}
```

## 集成到项目

### JitoExecutor 示例

```typescript
import { createLogger } from '@solana-arb-bot/core';

export class JitoExecutor {
  private logger = createLogger('JitoExecutor');

  async execute(/* ... */) {
    this.logger.info({
      event: 'bundle_sending',
      tip: tipAmount,
    }, 'Sending Jito bundle');

    try {
      const result = await this.sendBundle(/* ... */);
      
      this.logger.info({
        event: 'bundle_success',
        bundleId: result.bundleId,
        tip: result.tipUsed,
        latency: result.latency,
      }, 'Bundle executed successfully');
    } catch (error) {
      this.logger.error({
        err: error,
        event: 'bundle_failed',
      }, 'Bundle execution failed');
    }
  }
}
```

### OpportunityFinder 示例

```typescript
import { createLogger } from '@solana-arb-bot/core';

export class OpportunityFinder {
  private logger = createLogger('OpportunityFinder');
  private statsLogger = this.logger.child({ component: 'stats' });

  start() {
    this.logger.info({
      workerCount: this.config.workerCount,
      mintCount: this.config.mints.length,
    }, 'Starting opportunity finder');

    // 定期统计
    setInterval(() => {
      this.statsLogger.info({
        queriesTotal: this.stats.queriesTotal,
        opportunitiesFound: this.stats.opportunitiesFound,
        avgQueryTimeMs: this.stats.avgQueryTimeMs,
      }, 'Performance stats');
    }, 60000);
  }
}
```

### 主循环示例

```typescript
import { createEnhancedLogger } from '@solana-arb-bot/core/logger/config';

async function main() {
  const logger = createEnhancedLogger({
    level: process.env.LOG_LEVEL as any || 'info',
    fileOutput: true,
    logDir: './logs',
    logFileName: 'arbitrage-bot.log',
  });

  logger.info({
    event: 'bot_starting',
    network: 'mainnet-beta',
    version: '1.0.0',
  }, 'Arbitrage bot starting');

  try {
    // ... 机器人逻辑 ...
  } catch (error) {
    logger.fatal({
      err: error,
      event: 'bot_crashed',
    }, 'Bot crashed unexpectedly');
    process.exit(1);
  }
}
```

## 日志分析

### 使用 jq 分析 JSON 日志

```bash
# 查找所有错误日志
cat logs/bot.log | jq 'select(.level == "error")'

# 统计每种事件的数量
cat logs/bot.log | jq -r '.event' | sort | uniq -c

# 查找特定模块的日志
cat logs/bot.log | jq 'select(.module == "JitoExecutor")'

# 计算平均 ROI
cat logs/bot.log | jq 'select(.event == "trade_executed") | .roi' | jq -s 'add/length'
```

### 使用 grep 快速查找

```bash
# 查找错误
grep '"level":"error"' logs/bot.log

# 查找特定事件
grep '"event":"trade_executed"' logs/bot.log

# 查找特定时间段
grep '2025-10-20T10:' logs/bot.log
```

## 性能优化

1. **生产环境使用 JSON 输出**
   - 不使用 pino-pretty
   - 减少 CPU 开销

2. **合理设置日志级别**
   - 生产：`info` 或 `warn`
   - 开发：`debug`
   - 测试：`warn` 或 `error`

3. **使用日志轮转**
   - 避免单个日志文件过大
   - 自动清理旧日志

4. **异步日志传输**
   - Pino 默认使用异步写入
   - 不会阻塞主线程

## 故障排除

### 日志未输出到文件

1. 检查日志目录权限
2. 确认 `fileOutput: true`
3. 检查磁盘空间

### 日志格式混乱

1. 确认只在开发环境使用 pino-pretty
2. 生产环境使用 JSON 输出
3. 检查是否有多个日志实例

### 性能问题

1. 降低日志级别
2. 禁用 pino-pretty（生产环境）
3. 使用条件日志

## 最佳实践

1. **使用结构化日志**
   ```typescript
   // 好
   logger.info({ userId: 123, action: 'login' }, 'User logged in');
   
   // 不好
   logger.info(`User ${userId} logged in with action ${action}`);
   ```

2. **一致的事件命名**
   ```typescript
   logger.info({ event: 'trade_executed' }); // snake_case
   logger.info({ event: 'bundle_sent' });
   logger.info({ event: 'opportunity_found' });
   ```

3. **包含上下文信息**
   ```typescript
   logger.error({
     err: error,
     tokenPair: 'SOL-USDC',
     amount: 1000000,
     attemptCount: 3,
   }, 'Trade failed');
   ```

4. **避免敏感信息**
   ```typescript
   // 好
   logger.info({ walletPrefix: wallet.slice(0, 8) });
   
   // 不好
   logger.info({ privateKey: wallet });
   ```

5. **使用子日志器**
   ```typescript
   const executor = logger.child({ component: 'executor' });
   const monitor = logger.child({ component: 'monitor' });
   ```

## 参考资料

- [Pino 文档](https://getpino.io/)
- [Pino Pretty](https://github.com/pinojs/pino-pretty)
- [Pino Roll](https://github.com/feugy/pino-roll)

