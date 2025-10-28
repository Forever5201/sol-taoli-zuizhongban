# 📊 数据库记录 - 快速开始

5分钟内开始记录套利机会到数据库！

---

## 🚀 最快速度开始

### Step 1: 确保PostgreSQL运行

**检查PostgreSQL是否运行:**
```bash
psql --version
```

如果没有安装，请先安装 PostgreSQL 12+。

### Step 2: 设置数据库

**Windows:**
```bash
cd rust-pool-cache
setup-database.bat
```

**Linux/macOS:**
```bash
cd rust-pool-cache
chmod +x setup-database.sh
./setup-database.sh
```

### Step 3: 启动路由器

```bash
cargo run --release
```

就这么简单！路由器现在会自动记录所有发现的套利机会。

---

## 📋 查看记录的数据

### 最近的10个机会

```bash
cargo run --example query_opportunities -- --recent 10
```

### 统计信息

```bash
cargo run --example query_opportunities -- --stats
```

### 查看特定机会详情

```bash
cargo run --example query_opportunities -- --by-id 1
```

---

## ⚙️ 配置 (可选)

编辑 `config.toml`:

```toml
[database]
enabled = true  # 启用/禁用数据库
url = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"
record_opportunities = true  # 记录套利机会
record_pool_updates = false  # 记录池子更新(大量数据,建议关闭)
record_performance = true    # 记录性能指标
```

---

## 📊 记录的数据

每个套利机会会记录:

- ⏰ **时间信息**: 发现时间、订阅延迟
- 💰 **利润信息**: 输入/输出金额、毛利/净利、ROI
- 🛣️ **路径详情**: 每一跳的DEX、价格、流动性
- 🎯 **路由配置**: 模式、阈值、跳数
- ✅ **执行状态**: 是否执行、交易哈希、实际利润

---

## 🔍 查询命令大全

| 命令 | 说明 |
|------|------|
| `--recent [N]` | 最近N个机会 |
| `--stats` | 总体统计 |
| `--roi-dist` | ROI分布 |
| `--dex-stats` | DEX使用统计 |
| `--hourly` | 每小时统计 |
| `--by-id [ID]` | 特定机会详情 |

### 示例

```bash
# 最近20个机会
cargo run --example query_opportunities -- --recent 20

# 查看统计
cargo run --example query_opportunities -- --stats

# ROI分布
cargo run --example query_opportunities -- --roi-dist

# DEX性能
cargo run --example query_opportunities -- --dex-stats

# 每小时统计
cargo run --example query_opportunities -- --hourly

# 查看ID为42的机会
cargo run --example query_opportunities -- --by-id 42
```

---

## 🗄️ 直接SQL查询

连接数据库:
```bash
psql postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres
```

常用查询:

```sql
-- 所有机会
SELECT * FROM arbitrage_opportunities ORDER BY discovered_at DESC LIMIT 10;

-- 高ROI机会
SELECT * FROM arbitrage_opportunities WHERE roi_percent > 1.0;

-- 今天的机会
SELECT COUNT(*), AVG(roi_percent) 
FROM arbitrage_opportunities 
WHERE discovered_at::date = CURRENT_DATE;

-- 最常用的DEX
SELECT dex_name, COUNT(*) 
FROM arbitrage_steps 
GROUP BY dex_name 
ORDER BY COUNT(*) DESC;
```

---

## 🎯 预期输出示例

启动路由器时:
```
🗄️  Initializing database...
📊 Connecting to database...
   URL: postgresql://postgres:****@localhost:5432/postgres
✅ Database connected successfully
🔄 Running database migrations...
✅ Migrations completed
⏰ Database: Subscription started at 2025-10-27 10:30:45.123
```

发现机会时:
```
🔥 Found 3 arbitrage opportunities (optimized):

📝 Recorded opportunity #1 - ROI: 0.4523% - Path: USDC→SOL→USDT→USDC
📝 Recorded opportunity #2 - ROI: 0.3214% - Path: USDC→SOL→USDC
📝 Recorded opportunity #3 - ROI: 0.2891% - Path: USDT→RAY→SOL→USDT
```

查询统计时:
```
📈 总体统计:

总机会数: 156
平均ROI: 0.5234%
ROI范围: 0.3001% - 2.1234%
平均净利润: 5.23
平均跳数: 2.8
已执行: 12

按类型统计:
  Triangle: 89 次 (平均ROI: 0.4512%)
  Direct: 54 次 (平均ROI: 0.6123%)
  MultiHop: 13 次 (平均ROI: 0.8234%)
```

---

## 🧹 维护

### 清理旧数据 (30天前)

```sql
DELETE FROM arbitrage_opportunities
WHERE discovered_at < NOW() - INTERVAL '30 days';
```

### 备份数据库

```bash
pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql
```

---

## ❓ 常见问题

**Q: 连接失败?**  
A: 检查PostgreSQL是否运行，密码是否正确

**Q: 数据太多?**  
A: 禁用 `record_pool_updates`，定期清理旧数据

**Q: 查询慢?**  
A: 已自动创建索引，如果仍慢运行 `ANALYZE arbitrage_opportunities;`

---

## 📚 完整文档

详细文档请查看: `DATABASE_SETUP_GUIDE.md`

---

**就这么简单！开始记录您的套利机会吧！** 📊💰



5分钟内开始记录套利机会到数据库！

---

## 🚀 最快速度开始

### Step 1: 确保PostgreSQL运行

**检查PostgreSQL是否运行:**
```bash
psql --version
```

如果没有安装，请先安装 PostgreSQL 12+。

### Step 2: 设置数据库

**Windows:**
```bash
cd rust-pool-cache
setup-database.bat
```

**Linux/macOS:**
```bash
cd rust-pool-cache
chmod +x setup-database.sh
./setup-database.sh
```

### Step 3: 启动路由器

```bash
cargo run --release
```

就这么简单！路由器现在会自动记录所有发现的套利机会。

---

## 📋 查看记录的数据

### 最近的10个机会

```bash
cargo run --example query_opportunities -- --recent 10
```

### 统计信息

```bash
cargo run --example query_opportunities -- --stats
```

### 查看特定机会详情

```bash
cargo run --example query_opportunities -- --by-id 1
```

---

## ⚙️ 配置 (可选)

编辑 `config.toml`:

```toml
[database]
enabled = true  # 启用/禁用数据库
url = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"
record_opportunities = true  # 记录套利机会
record_pool_updates = false  # 记录池子更新(大量数据,建议关闭)
record_performance = true    # 记录性能指标
```

---

## 📊 记录的数据

每个套利机会会记录:

- ⏰ **时间信息**: 发现时间、订阅延迟
- 💰 **利润信息**: 输入/输出金额、毛利/净利、ROI
- 🛣️ **路径详情**: 每一跳的DEX、价格、流动性
- 🎯 **路由配置**: 模式、阈值、跳数
- ✅ **执行状态**: 是否执行、交易哈希、实际利润

---

## 🔍 查询命令大全

| 命令 | 说明 |
|------|------|
| `--recent [N]` | 最近N个机会 |
| `--stats` | 总体统计 |
| `--roi-dist` | ROI分布 |
| `--dex-stats` | DEX使用统计 |
| `--hourly` | 每小时统计 |
| `--by-id [ID]` | 特定机会详情 |

### 示例

```bash
# 最近20个机会
cargo run --example query_opportunities -- --recent 20

# 查看统计
cargo run --example query_opportunities -- --stats

# ROI分布
cargo run --example query_opportunities -- --roi-dist

# DEX性能
cargo run --example query_opportunities -- --dex-stats

# 每小时统计
cargo run --example query_opportunities -- --hourly

# 查看ID为42的机会
cargo run --example query_opportunities -- --by-id 42
```

---

## 🗄️ 直接SQL查询

连接数据库:
```bash
psql postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres
```

常用查询:

```sql
-- 所有机会
SELECT * FROM arbitrage_opportunities ORDER BY discovered_at DESC LIMIT 10;

-- 高ROI机会
SELECT * FROM arbitrage_opportunities WHERE roi_percent > 1.0;

-- 今天的机会
SELECT COUNT(*), AVG(roi_percent) 
FROM arbitrage_opportunities 
WHERE discovered_at::date = CURRENT_DATE;

-- 最常用的DEX
SELECT dex_name, COUNT(*) 
FROM arbitrage_steps 
GROUP BY dex_name 
ORDER BY COUNT(*) DESC;
```

---

## 🎯 预期输出示例

启动路由器时:
```
🗄️  Initializing database...
📊 Connecting to database...
   URL: postgresql://postgres:****@localhost:5432/postgres
✅ Database connected successfully
🔄 Running database migrations...
✅ Migrations completed
⏰ Database: Subscription started at 2025-10-27 10:30:45.123
```

发现机会时:
```
🔥 Found 3 arbitrage opportunities (optimized):

📝 Recorded opportunity #1 - ROI: 0.4523% - Path: USDC→SOL→USDT→USDC
📝 Recorded opportunity #2 - ROI: 0.3214% - Path: USDC→SOL→USDC
📝 Recorded opportunity #3 - ROI: 0.2891% - Path: USDT→RAY→SOL→USDT
```

查询统计时:
```
📈 总体统计:

总机会数: 156
平均ROI: 0.5234%
ROI范围: 0.3001% - 2.1234%
平均净利润: 5.23
平均跳数: 2.8
已执行: 12

按类型统计:
  Triangle: 89 次 (平均ROI: 0.4512%)
  Direct: 54 次 (平均ROI: 0.6123%)
  MultiHop: 13 次 (平均ROI: 0.8234%)
```

---

## 🧹 维护

### 清理旧数据 (30天前)

```sql
DELETE FROM arbitrage_opportunities
WHERE discovered_at < NOW() - INTERVAL '30 days';
```

### 备份数据库

```bash
pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql
```

---

## ❓ 常见问题

**Q: 连接失败?**  
A: 检查PostgreSQL是否运行，密码是否正确

**Q: 数据太多?**  
A: 禁用 `record_pool_updates`，定期清理旧数据

**Q: 查询慢?**  
A: 已自动创建索引，如果仍慢运行 `ANALYZE arbitrage_opportunities;`

---

## 📚 完整文档

详细文档请查看: `DATABASE_SETUP_GUIDE.md`

---

**就这么简单！开始记录您的套利机会吧！** 📊💰















