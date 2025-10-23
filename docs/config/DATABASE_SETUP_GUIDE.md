# PostgreSQL 数据库设置指南

## 📊 概述

本指南将帮助您设置 PostgreSQL 数据库来记录和分析套利机器人的交易数据。

## 🎯 数据库功能

### 记录内容

1. **交易记录** (永久保留)
   - 交易签名、状态、时间
   - 代币信息（输入/输出/桥接代币）
   - 利润和费用明细
   - 闪电贷信息
   - Jito tip 信息
   - 路由详情

2. **套利机会** (保留30天)
   - 发现时间
   - 预期利润和ROI
   - 是否执行
   - 过滤原因

3. **统计数据**
   - 每日交易汇总
   - 代币表现统计
   - ROI分布
   - DEX性能对比

### 分析维度

- ✅ 按时间段分析（日/周/月利润）
- ✅ 按代币对分析（哪些代币最赚钱）
- ✅ 按费用分析（闪电贷、Jito、gas费明细）
- ✅ 按成功率分析（执行成功率、ROI分布）
- ✅ 按DEX分析（哪些DEX路由最好）

## 🚀 快速开始

### 前置要求

- PostgreSQL 14+ (推荐 15+)
- Node.js 18+
- pnpm

### 步骤 1: 安装 PostgreSQL

#### Windows

```powershell
# 使用 Chocolatey
choco install postgresql

# 或下载安装包
# https://www.postgresql.org/download/windows/
```

#### macOS

```bash
# 使用 Homebrew
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 步骤 2: 创建数据库和用户

```bash
# 切换到 postgres 用户（Linux/macOS）
sudo -u postgres psql

# Windows 直接打开 psql
```

在 PostgreSQL 命令行中执行：

```sql
-- 创建用户
CREATE USER arbitrage_user WITH PASSWORD 'your_secure_password';

-- 创建数据库
CREATE DATABASE arbitrage_db;

-- 授权
GRANT ALL PRIVILEGES ON DATABASE arbitrage_db TO arbitrage_user;

-- 退出
\q
```

### 步骤 3: 配置数据库连接

编辑 `configs/database.toml`:

```toml
[database]
url = "postgresql://arbitrage_user:your_secure_password@localhost:5432/arbitrage_db"
pool_size = 10
connection_timeout = 30
```

或者使用环境变量（推荐生产环境）：

```bash
# 创建 .env 文件
echo 'DATABASE_URL="postgresql://arbitrage_user:your_secure_password@localhost:5432/arbitrage_db"' > .env
```

### 步骤 4: 安装依赖

```bash
cd packages/core
pnpm install
```

### 步骤 5: 运行数据库迁移

```bash
# 生成 Prisma Client
pnpm db:generate

# 应用迁移
pnpm db:migrate
```

### 步骤 6: 验证连接

```bash
# 打开 Prisma Studio（可视化数据库管理工具）
pnpm db:studio
```

浏览器会自动打开 `http://localhost:5555`

## 💻 代码集成

### 在 FlashloanBot 中启用数据库

编辑 `configs/flashloan-serverchan.toml`，添加：

```toml
[database]
enabled = true
url = "postgresql://arbitrage_user:your_password@localhost:5432/arbitrage_db"

[database.retention]
opportunities_days = 30
enable_auto_cleanup = true
cleanup_interval_hours = 24
```

### 使用示例

```typescript
import { 
  initDatabase, 
  databaseRecorder, 
  databaseQuery,
  databaseStatistics 
} from '@solana-arb-bot/core';

// 初始化数据库
initDatabase({
  url: process.env.DATABASE_URL,
  poolSize: 10,
});

// 记录套利机会
const opportunityId = await databaseRecorder.recordOpportunity({
  inputMint: 'So11111...',
  outputMint: 'So11111...',
  bridgeToken: 'USDC',
  bridgeMint: 'EPjFW...',
  inputAmount: 10_000_000_000n,
  outputAmount: 10_050_000_000n,
  expectedProfit: 50_000_000n,
  expectedRoi: 0.5,
});

// 记录交易
const tradeId = await databaseRecorder.recordTrade({
  signature: 'abc123...',
  status: 'success',
  inputMint: 'So11111...',
  outputMint: 'So11111...',
  inputAmount: 100_000_000_000n,
  outputAmount: 100_500_000_000n,
  grossProfit: 500_000_000n,
  netProfit: 450_000_000n,
  roi: 0.45,
  flashloanFee: 90_000_000n,
  flashloanAmount: 100_000_000_000n,
  jitoTip: 10_000_000n,
  gasFee: 5_000_000n,
  totalFee: 105_000_000n,
  opportunityId,
});

// 查询最近交易
const recentTrades = await databaseQuery.getRecentTrades(20);

// 获取每日统计
const today = new Date();
await databaseStatistics.calculateDailyStats(today);
const dailyStats = await databaseStatistics.getDailyStats(today, today);

// 获取性能指标
const metrics = await databaseStatistics.getPerformanceMetrics();
console.log(`总利润: ${metrics.totalNetProfit / 1_000_000_000n} SOL`);
console.log(`成功率: ${metrics.successRate}%`);
console.log(`平均ROI: ${metrics.avgRoi}%`);
```

## 📈 常用查询示例

### 1. 查询最近7天的利润趋势

```typescript
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);
const endDate = new Date();

const stats = await databaseStatistics.getDailyStats(startDate, endDate);
stats.forEach(day => {
  const profitSOL = Number(day.totalNetProfit) / 1e9;
  console.log(`${day.statDate}: ${profitSOL.toFixed(4)} SOL (${day.successRate}%)`);
});
```

### 2. 找出最赚钱的代币对

```typescript
const topPairs = await databaseQuery.getTopTokenPairs(10);
topPairs.forEach((pair, index) => {
  const profitSOL = Number(pair.totalProfit) / 1e9;
  console.log(`${index + 1}. ${pair.bridgeToken}: ${profitSOL.toFixed(4)} SOL (${pair.count} trades)`);
});
```

### 3. 分析ROI分布

```typescript
const distribution = await databaseStatistics.getROIDistribution();
console.log('ROI 分布:');
distribution.ranges.forEach(range => {
  console.log(`${range.min}-${range.max}%: ${range.count} trades (${range.percentage.toFixed(1)}%)`);
});
```

### 4. 查看DEX性能

```typescript
const dexPerf = await databaseStatistics.getDEXPerformance();
dexPerf.forEach(dex => {
  const volumeSOL = Number(dex.totalVolume) / 1e9;
  console.log(`${dex.dexName}: ${volumeSOL.toFixed(2)} SOL volume, ${dex.avgPriceImpact.toFixed(4)}% avg impact`);
});
```

## 🔧 维护

### 手动清理旧数据

```typescript
import { createCleanupService } from '@solana-arb-bot/core';

const cleanup = createCleanupService({
  opportunitiesRetentionDays: 30,
  enableAutoCleanup: true,
});

// 执行完整清理
const result = await cleanup.performFullCleanup();
console.log(`清理了 ${result.opportunitiesDeleted} 条机会记录`);
```

### 自动清理（推荐）

在配置文件中启用：

```toml
[database.retention]
enable_auto_cleanup = true
cleanup_interval_hours = 24  # 每24小时清理一次
```

### 数据库备份

```bash
# 备份数据库
pg_dump -U arbitrage_user -h localhost arbitrage_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U arbitrage_user -h localhost arbitrage_db < backup_20251022.sql
```

### 性能优化

```sql
-- 分析表
ANALYZE trades;
ANALYZE opportunities;
ANALYZE trade_routes;

-- 重建索引
REINDEX TABLE trades;

-- 查看表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 📊 数据可视化

### 使用 Prisma Studio

```bash
cd packages/core
pnpm db:studio
```

### 使用 PostgreSQL 客户端

推荐工具：
- [pgAdmin](https://www.pgadmin.org/) - 功能全面
- [DBeaver](https://dbeaver.io/) - 跨平台
- [TablePlus](https://tableplus.com/) - 简洁美观

### 导出数据到 CSV

```sql
-- 导出每日统计
COPY (
  SELECT * FROM daily_statistics 
  ORDER BY stat_date DESC
) TO '/path/to/daily_stats.csv' CSV HEADER;

-- 导出交易记录
COPY (
  SELECT 
    signature,
    executed_at,
    status,
    bridge_token,
    net_profit / 1000000000.0 as profit_sol,
    roi
  FROM trades
  WHERE trade_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY executed_at DESC
) TO '/path/to/trades.csv' CSV HEADER;
```

## 🐛 故障排查

### 问题 1: 连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案**：
1. 检查 PostgreSQL 是否运行：`sudo systemctl status postgresql`
2. 检查防火墙设置
3. 验证连接字符串是否正确

### 问题 2: 权限错误

```
Error: permission denied for table trades
```

**解决方案**：

```sql
-- 重新授权
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arbitrage_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arbitrage_user;
```

### 问题 3: 迁移失败

```
Error: Migration failed
```

**解决方案**：

```bash
# 重置迁移
cd packages/core
npx prisma migrate reset

# 重新运行迁移
npx prisma migrate deploy
```

## 📚 相关资源

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Prisma 文档](https://www.prisma.io/docs)
- [SQL 教程](https://www.postgresqltutorial.com/)

## 💡 最佳实践

1. **定期备份**：至少每周备份一次数据库
2. **监控大小**：定期检查数据库大小，及时清理
3. **索引优化**：根据查询模式调整索引
4. **连接池**：合理配置连接池大小（10-20）
5. **环境变量**：生产环境使用环境变量存储敏感信息
6. **日志管理**：开发时启用查询日志，生产时关闭
7. **定期分析**：每周分析数据，优化交易策略

---

**数据库已就绪！** 🎉 现在您可以记录和分析所有套利数据了。



