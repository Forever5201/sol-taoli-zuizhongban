# 数据库快速启动指南

## ⚡ 5 分钟快速设置

### 步骤 1: 安装 PostgreSQL

**Windows:**
```powershell
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt install postgresql
sudo systemctl start postgresql
```

### 步骤 2: 创建数据库

```bash
# 运行以下命令（Windows 用户直接打开 psql）
sudo -u postgres psql
```

在 psql 中执行：
```sql
CREATE USER arbitrage_user WITH PASSWORD 'your_password';
CREATE DATABASE arbitrage_db;
GRANT ALL PRIVILEGES ON DATABASE arbitrage_db TO arbitrage_user;
\q
```

### 步骤 3: 配置连接

创建 `.env` 文件：
```bash
echo 'DATABASE_URL="postgresql://arbitrage_user:your_password@localhost:5432/arbitrage_db"' > .env
```

### 步骤 4: 安装依赖和运行迁移

```bash
cd packages/core
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 步骤 5: 验证

```bash
pnpm db:studio
```

浏览器打开 `http://localhost:5555` 查看数据库。

## ✅ 完成！

数据库现在已经准备好记录您的套利数据了。

机器人启动后会自动：
- ✅ 记录每个发现的套利机会
- ✅ 记录每笔交易的详细信息
- ✅ 计算每日统计数据
- ✅ 自动清理30天前的机会记录

## 📊 快速查询示例

### 查看今天的利润

```typescript
import { databaseStatistics } from '@solana-arb-bot/core';

const today = new Date();
await databaseStatistics.calculateDailyStats(today);
const stats = await databaseStatistics.getDailyStats(today, today);

console.log(`今日交易: ${stats[0].totalTrades}`);
console.log(`成功率: ${stats[0].successRate}%`);
console.log(`净利润: ${Number(stats[0].totalNetProfit) / 1e9} SOL`);
```

### 查看最近的交易

```typescript
import { databaseQuery } from '@solana-arb-bot/core';

const trades = await databaseQuery.getRecentTrades(10);
trades.forEach(trade => {
  const profit = Number(trade.netProfit) / 1e9;
  console.log(`${trade.signature}: ${profit.toFixed(4)} SOL`);
});
```

### 找出最赚钱的代币对

```typescript
import { databaseQuery } from '@solana-arb-bot/core';

const topPairs = await databaseQuery.getTopTokenPairs(5);
topPairs.forEach((pair, index) => {
  const totalProfit = Number(pair.totalProfit) / 1e9;
  console.log(`${index + 1}. ${pair.bridgeToken}: ${totalProfit.toFixed(4)} SOL`);
});
```

## 🔧 故障排查

**连接失败？**
- 检查 PostgreSQL 是否运行
- 验证用户名密码是否正确
- 确认数据库名称正确

**迁移失败？**
```bash
cd packages/core
npx prisma migrate reset
npx prisma migrate deploy
```

**权限错误？**
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arbitrage_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arbitrage_user;
```

## 📚 更多信息

详细文档: [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)



