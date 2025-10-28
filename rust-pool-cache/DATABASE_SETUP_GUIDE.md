# 数据库设置指南

本指南帮助您设置PostgreSQL数据库以记录套利机会。

---

## 📋 前置要求

1. **PostgreSQL 12+** 已安装并运行
2. **数据库凭据** (用户名、密码)

### 安装PostgreSQL (如果尚未安装)

**Windows:**
```powershell
# 下载安装器
# https://www.postgresql.org/download/windows/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

---

## 🚀 快速设置

### 方法1: 使用设置脚本 (推荐)

```bash
cd rust-pool-cache
chmod +x setup-database.sh
./setup-database.sh
```

### 方法2: 手动设置

1. **创建数据库** (如果使用新数据库):
```sql
psql -U postgres
CREATE DATABASE arbitrage_db;
\q
```

2. **运行迁移脚本**:
```bash
psql -U postgres -d arbitrage_db -f migrations/001_create_arbitrage_tables.sql
```

3. **验证表已创建**:
```sql
psql -U postgres -d arbitrage_db
\dt
-- 应该看到: arbitrage_opportunities, arbitrage_steps, pool_updates, router_performance
```

---

## ⚙️ 配置路由器

编辑 `config.toml`:

```toml
[database]
enabled = true
url = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/arbitrage_db"
record_opportunities = true
record_pool_updates = false  # 可选，会产生大量数据
record_performance = true
```

### 配置说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | false | 是否启用数据库记录 |
| `url` | string | - | PostgreSQL连接URL |
| `record_opportunities` | boolean | true | 记录套利机会 |
| `record_pool_updates` | boolean | false | 记录池子更新（大量数据） |
| `record_performance` | boolean | true | 记录性能指标 |

---

## 🏃 启动路由器

```bash
cargo run --release
```

启动时您会看到:
```
🗄️  Initializing database...
📊 Connecting to database...
   URL: postgresql://postgres:****@localhost:5432/arbitrage_db
✅ Database connected successfully
🔄 Running database migrations...
✅ Migrations completed
⏰ Database: Subscription started at 2025-10-27 10:30:45.123
```

当发现机会时：
```
🔥 Found 3 arbitrage opportunities (optimized):

📝 Recorded opportunity #1 - ROI: 0.4523% - Path: USDC→SOL→USDT→USDC
📝 Recorded opportunity #2 - ROI: 0.3214% - Path: USDC→SOL→USDC
```

---

## 📊 查询数据

### 查看最近的机会

```bash
cargo run --example query_opportunities -- --recent 10
```

输出示例:
```
📋 最近的 10 个套利机会:

ID: 42 | 时间: 2025-10-27 10:32:15
   延迟: 89523ms 自订阅开始
   类型: Triangle | 模式: Complete
   ROI: 0.4523% | 净利润: 4.523 USDC
   跳数: 3 | 路径: USDC→SOL→USDT→USDC
```

### 查看统计

```bash
cargo run --example query_opportunities -- --stats
```

输出示例:
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

### ROI分布

```bash
cargo run --example query_opportunities -- --roi-dist
```

### DEX统计

```bash
cargo run --example query_opportunities -- --dex-stats
```

### 每小时统计

```bash
cargo run --example query_opportunities -- --hourly
```

### 查看特定机会详情

```bash
cargo run --example query_opportunities -- --by-id 42
```

---

## 🗄️ 数据库表结构

### arbitrage_opportunities (主表)

记录每个发现的套利机会：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| discovered_at | TIMESTAMP | 发现时间 |
| time_since_subscription_ms | INTEGER | 自订阅开始的毫秒数 |
| arbitrage_type | VARCHAR(20) | 类型 (Direct/Triangle/MultiHop) |
| start_token | VARCHAR(20) | 起始代币 |
| end_token | VARCHAR(20) | 结束代币 |
| input_amount | DECIMAL(20,6) | 输入金额 |
| output_amount | DECIMAL(20,6) | 输出金额 |
| gross_profit | DECIMAL(20,6) | 毛利润 |
| net_profit | DECIMAL(20,6) | 净利润 |
| roi_percent | DECIMAL(10,4) | ROI百分比 |
| estimated_fees | DECIMAL(20,6) | 估算费用 |
| hop_count | INTEGER | 跳数 |
| path_summary | TEXT | 路径摘要 |
| router_mode | VARCHAR(20) | 路由模式 |
| is_executed | BOOLEAN | 是否执行 |
| execution_status | VARCHAR(50) | 执行状态 |
| execution_tx_hash | VARCHAR(100) | 交易哈希 |
| actual_profit | DECIMAL(20,6) | 实际利润 |

### arbitrage_steps (路径详情表)

记录每个机会的具体步骤：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| opportunity_id | INTEGER | 关联机会ID |
| step_order | INTEGER | 步骤顺序 |
| pool_id | VARCHAR(100) | 池子ID |
| dex_name | VARCHAR(50) | DEX名称 |
| input_token | VARCHAR(20) | 输入代币 |
| output_token | VARCHAR(20) | 输出代币 |
| price | DECIMAL(20,10) | 价格 |
| liquidity_base | BIGINT | 基础代币流动性 |
| liquidity_quote | BIGINT | 报价代币流动性 |
| expected_input | DECIMAL(20,6) | 预期输入 |
| expected_output | DECIMAL(20,6) | 预期输出 |

### pool_updates (池子更新表)

记录池子更新（可选）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| pool_address | VARCHAR(100) | 池子地址 |
| pool_name | VARCHAR(100) | 池子名称 |
| pool_type | VARCHAR(50) | 池子类型 |
| updated_at | TIMESTAMP | 更新时间 |
| price | DECIMAL(20,10) | 价格 |
| base_reserve | BIGINT | 基础储备 |
| quote_reserve | BIGINT | 报价储备 |

### router_performance (性能统计表)

记录路由器性能：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| timestamp | TIMESTAMP | 时间戳 |
| scan_duration_ms | INTEGER | 扫描耗时(毫秒) |
| opportunities_found | INTEGER | 发现的机会数 |
| pools_scanned | INTEGER | 扫描的池子数 |
| router_mode | VARCHAR(20) | 路由模式 |
| min_roi_percent | DECIMAL(10,4) | 最小ROI阈值 |
| max_hops | INTEGER | 最大跳数 |

---

## 🔧 高级查询

### SQL示例

**查询高ROI机会:**
```sql
SELECT * FROM arbitrage_opportunities
WHERE roi_percent > 1.0
ORDER BY roi_percent DESC
LIMIT 10;
```

**查询特定DEX的机会:**
```sql
SELECT DISTINCT o.*
FROM arbitrage_opportunities o
JOIN arbitrage_steps s ON o.id = s.opportunity_id
WHERE s.dex_name = 'Raydium AMM V4'
ORDER BY o.discovered_at DESC;
```

**计算每天的机会数:**
```sql
SELECT 
    DATE(discovered_at) as date,
    COUNT(*) as opportunities,
    AVG(roi_percent) as avg_roi
FROM arbitrage_opportunities
GROUP BY DATE(discovered_at)
ORDER BY date DESC;
```

---

## 🧹 数据维护

### 清理旧数据

删除30天前的记录:
```sql
DELETE FROM arbitrage_opportunities
WHERE discovered_at < NOW() - INTERVAL '30 days';
```

### 备份数据库

```bash
pg_dump -U postgres arbitrage_db > backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
psql -U postgres arbitrage_db < backup_20251027.sql
```

---

## ❓ 常见问题

### Q: 数据库连接失败

**A:** 检查:
1. PostgreSQL服务是否运行
2. 连接URL是否正确
3. 用户名和密码是否正确
4. 防火墙是否允许连接

### Q: 迁移失败

**A:** 确保数据库为空或手动删除冲突的表:
```sql
DROP TABLE IF EXISTS arbitrage_steps CASCADE;
DROP TABLE IF EXISTS arbitrage_opportunities CASCADE;
DROP TABLE IF EXISTS pool_updates CASCADE;
DROP TABLE IF EXISTS router_performance CASCADE;
```

### Q: 数据量太大

**A:** 
1. 禁用 `record_pool_updates`
2. 定期清理旧数据
3. 增加 `min_roi_percent` 阈值
4. 使用分区表(高级)

### Q: 查询很慢

**A:** 已创建索引,如果仍慢:
```sql
-- 重建索引
REINDEX TABLE arbitrage_opportunities;

-- 更新统计信息
ANALYZE arbitrage_opportunities;
```

---

## 📚 相关文档

- PostgreSQL官方文档: https://www.postgresql.org/docs/
- sqlx文档: https://docs.rs/sqlx/

---

**需要帮助?** 查看日志或创建issue。

**祝您套利顺利！** 💰



本指南帮助您设置PostgreSQL数据库以记录套利机会。

---

## 📋 前置要求

1. **PostgreSQL 12+** 已安装并运行
2. **数据库凭据** (用户名、密码)

### 安装PostgreSQL (如果尚未安装)

**Windows:**
```powershell
# 下载安装器
# https://www.postgresql.org/download/windows/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

---

## 🚀 快速设置

### 方法1: 使用设置脚本 (推荐)

```bash
cd rust-pool-cache
chmod +x setup-database.sh
./setup-database.sh
```

### 方法2: 手动设置

1. **创建数据库** (如果使用新数据库):
```sql
psql -U postgres
CREATE DATABASE arbitrage_db;
\q
```

2. **运行迁移脚本**:
```bash
psql -U postgres -d arbitrage_db -f migrations/001_create_arbitrage_tables.sql
```

3. **验证表已创建**:
```sql
psql -U postgres -d arbitrage_db
\dt
-- 应该看到: arbitrage_opportunities, arbitrage_steps, pool_updates, router_performance
```

---

## ⚙️ 配置路由器

编辑 `config.toml`:

```toml
[database]
enabled = true
url = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/arbitrage_db"
record_opportunities = true
record_pool_updates = false  # 可选，会产生大量数据
record_performance = true
```

### 配置说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | false | 是否启用数据库记录 |
| `url` | string | - | PostgreSQL连接URL |
| `record_opportunities` | boolean | true | 记录套利机会 |
| `record_pool_updates` | boolean | false | 记录池子更新（大量数据） |
| `record_performance` | boolean | true | 记录性能指标 |

---

## 🏃 启动路由器

```bash
cargo run --release
```

启动时您会看到:
```
🗄️  Initializing database...
📊 Connecting to database...
   URL: postgresql://postgres:****@localhost:5432/arbitrage_db
✅ Database connected successfully
🔄 Running database migrations...
✅ Migrations completed
⏰ Database: Subscription started at 2025-10-27 10:30:45.123
```

当发现机会时：
```
🔥 Found 3 arbitrage opportunities (optimized):

📝 Recorded opportunity #1 - ROI: 0.4523% - Path: USDC→SOL→USDT→USDC
📝 Recorded opportunity #2 - ROI: 0.3214% - Path: USDC→SOL→USDC
```

---

## 📊 查询数据

### 查看最近的机会

```bash
cargo run --example query_opportunities -- --recent 10
```

输出示例:
```
📋 最近的 10 个套利机会:

ID: 42 | 时间: 2025-10-27 10:32:15
   延迟: 89523ms 自订阅开始
   类型: Triangle | 模式: Complete
   ROI: 0.4523% | 净利润: 4.523 USDC
   跳数: 3 | 路径: USDC→SOL→USDT→USDC
```

### 查看统计

```bash
cargo run --example query_opportunities -- --stats
```

输出示例:
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

### ROI分布

```bash
cargo run --example query_opportunities -- --roi-dist
```

### DEX统计

```bash
cargo run --example query_opportunities -- --dex-stats
```

### 每小时统计

```bash
cargo run --example query_opportunities -- --hourly
```

### 查看特定机会详情

```bash
cargo run --example query_opportunities -- --by-id 42
```

---

## 🗄️ 数据库表结构

### arbitrage_opportunities (主表)

记录每个发现的套利机会：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| discovered_at | TIMESTAMP | 发现时间 |
| time_since_subscription_ms | INTEGER | 自订阅开始的毫秒数 |
| arbitrage_type | VARCHAR(20) | 类型 (Direct/Triangle/MultiHop) |
| start_token | VARCHAR(20) | 起始代币 |
| end_token | VARCHAR(20) | 结束代币 |
| input_amount | DECIMAL(20,6) | 输入金额 |
| output_amount | DECIMAL(20,6) | 输出金额 |
| gross_profit | DECIMAL(20,6) | 毛利润 |
| net_profit | DECIMAL(20,6) | 净利润 |
| roi_percent | DECIMAL(10,4) | ROI百分比 |
| estimated_fees | DECIMAL(20,6) | 估算费用 |
| hop_count | INTEGER | 跳数 |
| path_summary | TEXT | 路径摘要 |
| router_mode | VARCHAR(20) | 路由模式 |
| is_executed | BOOLEAN | 是否执行 |
| execution_status | VARCHAR(50) | 执行状态 |
| execution_tx_hash | VARCHAR(100) | 交易哈希 |
| actual_profit | DECIMAL(20,6) | 实际利润 |

### arbitrage_steps (路径详情表)

记录每个机会的具体步骤：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| opportunity_id | INTEGER | 关联机会ID |
| step_order | INTEGER | 步骤顺序 |
| pool_id | VARCHAR(100) | 池子ID |
| dex_name | VARCHAR(50) | DEX名称 |
| input_token | VARCHAR(20) | 输入代币 |
| output_token | VARCHAR(20) | 输出代币 |
| price | DECIMAL(20,10) | 价格 |
| liquidity_base | BIGINT | 基础代币流动性 |
| liquidity_quote | BIGINT | 报价代币流动性 |
| expected_input | DECIMAL(20,6) | 预期输入 |
| expected_output | DECIMAL(20,6) | 预期输出 |

### pool_updates (池子更新表)

记录池子更新（可选）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| pool_address | VARCHAR(100) | 池子地址 |
| pool_name | VARCHAR(100) | 池子名称 |
| pool_type | VARCHAR(50) | 池子类型 |
| updated_at | TIMESTAMP | 更新时间 |
| price | DECIMAL(20,10) | 价格 |
| base_reserve | BIGINT | 基础储备 |
| quote_reserve | BIGINT | 报价储备 |

### router_performance (性能统计表)

记录路由器性能：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| timestamp | TIMESTAMP | 时间戳 |
| scan_duration_ms | INTEGER | 扫描耗时(毫秒) |
| opportunities_found | INTEGER | 发现的机会数 |
| pools_scanned | INTEGER | 扫描的池子数 |
| router_mode | VARCHAR(20) | 路由模式 |
| min_roi_percent | DECIMAL(10,4) | 最小ROI阈值 |
| max_hops | INTEGER | 最大跳数 |

---

## 🔧 高级查询

### SQL示例

**查询高ROI机会:**
```sql
SELECT * FROM arbitrage_opportunities
WHERE roi_percent > 1.0
ORDER BY roi_percent DESC
LIMIT 10;
```

**查询特定DEX的机会:**
```sql
SELECT DISTINCT o.*
FROM arbitrage_opportunities o
JOIN arbitrage_steps s ON o.id = s.opportunity_id
WHERE s.dex_name = 'Raydium AMM V4'
ORDER BY o.discovered_at DESC;
```

**计算每天的机会数:**
```sql
SELECT 
    DATE(discovered_at) as date,
    COUNT(*) as opportunities,
    AVG(roi_percent) as avg_roi
FROM arbitrage_opportunities
GROUP BY DATE(discovered_at)
ORDER BY date DESC;
```

---

## 🧹 数据维护

### 清理旧数据

删除30天前的记录:
```sql
DELETE FROM arbitrage_opportunities
WHERE discovered_at < NOW() - INTERVAL '30 days';
```

### 备份数据库

```bash
pg_dump -U postgres arbitrage_db > backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
psql -U postgres arbitrage_db < backup_20251027.sql
```

---

## ❓ 常见问题

### Q: 数据库连接失败

**A:** 检查:
1. PostgreSQL服务是否运行
2. 连接URL是否正确
3. 用户名和密码是否正确
4. 防火墙是否允许连接

### Q: 迁移失败

**A:** 确保数据库为空或手动删除冲突的表:
```sql
DROP TABLE IF EXISTS arbitrage_steps CASCADE;
DROP TABLE IF EXISTS arbitrage_opportunities CASCADE;
DROP TABLE IF EXISTS pool_updates CASCADE;
DROP TABLE IF EXISTS router_performance CASCADE;
```

### Q: 数据量太大

**A:** 
1. 禁用 `record_pool_updates`
2. 定期清理旧数据
3. 增加 `min_roi_percent` 阈值
4. 使用分区表(高级)

### Q: 查询很慢

**A:** 已创建索引,如果仍慢:
```sql
-- 重建索引
REINDEX TABLE arbitrage_opportunities;

-- 更新统计信息
ANALYZE arbitrage_opportunities;
```

---

## 📚 相关文档

- PostgreSQL官方文档: https://www.postgresql.org/docs/
- sqlx文档: https://docs.rs/sqlx/

---

**需要帮助?** 查看日志或创建issue。

**祝您套利顺利！** 💰















