# Windows 数据库快速配置指南

## 🎯 当前状态

✅ 代码集成完成 - 数据库记录功能已添加到机器人中  
✅ 环境变量已配置 - .env 文件已创建  
⚠️ PostgreSQL 未安装 - 需要安装数据库服务器

## 📦 方案选择

你有两个选择：

### 选项 1: 完整安装 PostgreSQL（推荐用于生产）

**优点**: 完整功能，适合长期使用  
**缺点**: 安装稍复杂，占用空间较大（~200MB）

### 选项 2: 跳过数据库（快速开始）

**优点**: 立即开始交易  
**缺点**: 不记录历史数据

## 🚀 选项 1: 安装 PostgreSQL

### 步骤 1: 下载安装器

访问: https://www.postgresql.org/download/windows/

或直接下载: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

选择 PostgreSQL 15 或 16 版本（Windows x86-64）

### 步骤 2: 安装 PostgreSQL

1. 运行安装器
2. **重要**: 在设置密码时，输入: `arbitrage_password`
   （或者记住你的密码，稍后修改 .env 文件）
3. 端口使用默认 5432
4. 其他选项保持默认即可

### 步骤 3: 创建数据库

安装完成后，打开 PowerShell（管理员权限）：

```powershell
# 连接到 PostgreSQL
& 'C:\Program Files\PostgreSQL\15\bin\psql.exe' -U postgres

# 在 psql 中执行以下命令:
CREATE USER arbitrage_user WITH PASSWORD 'arbitrage_password';
CREATE DATABASE arbitrage_db;
GRANT ALL PRIVILEGES ON DATABASE arbitrage_db TO arbitrage_user;
\q
```

### 步骤 4: 运行数据库设置

```powershell
# 回到项目目录
cd E:\6666666666666666666666666666\dex-cex\dex-sol

# 运行配置脚本
.\setup-database.bat
```

### 步骤 5: 启动机器人

```powershell
pnpm start --config ./configs/flashloan-serverchan.toml
```

现在所有机会都会自动记录到数据库！

## 🎯 选项 2: 临时禁用数据库

如果你想先开始交易，稍后再配置数据库：

### 修改配置文件

编辑 `configs/flashloan-serverchan.toml`，找到数据库部分：

```toml
[database]
enabled = false  # 改为 false
```

### 启动机器人

```powershell
pnpm start --config ./configs/flashloan-serverchan.toml
```

机器人会正常运行，只是不记录历史数据。

## 📊 验证数据库（选项 1 完成后）

### 查看数据库管理界面

```powershell
cd packages\core
pnpm db:studio
```

浏览器会自动打开 http://localhost:5555，你可以看到：
- `opportunities` 表：所有发现的套利机会
- `trades` 表：所有执行的交易

### 查看记录的机会

运行机器人后，在日志中会看到：

```
[OpportunityFinder] 🎯 Opportunity found: So11... → USDT → So11... | Profit: 0.005102 SOL (0.05% ROI)
[OpportunityFinder] Opportunity recorded to database: 0.005102 SOL
```

## 🔧 常见问题

### Q: 安装时密码设置错了怎么办？

修改 `.env` 和 `packages\core\.env` 文件中的密码：

```
DATABASE_URL="postgresql://arbitrage_user:你的密码@localhost:5432/arbitrage_db"
```

### Q: 端口 5432 已被占用？

在安装时选择不同的端口（如 5433），然后修改 .env：

```
DATABASE_URL="postgresql://arbitrage_user:arbitrage_password@localhost:5433/arbitrage_db"
```

### Q: 数据库占用太多空间？

可以定期清理旧数据。数据库会自动保留：
- 交易记录：永久
- 机会记录：30 天（自动清理）

手动清理：

```sql
-- 删除 7 天前的机会记录
DELETE FROM opportunities WHERE created_at < NOW() - INTERVAL '7 days';
```

### Q: 想卸载数据库？

1. 在 Windows 控制面板中卸载 PostgreSQL
2. 删除数据目录（通常在 `C:\Program Files\PostgreSQL\`）
3. 在配置文件中设置 `database.enabled = false`

## 🎓 下一步

### 如果选择了选项 1（已安装数据库）：

1. ✅ 启动机器人
2. ✅ 观察日志确认数据正在记录
3. ✅ 使用 Prisma Studio 查看数据
4. ✅ 根据历史数据优化策略

### 如果选择了选项 2（跳过数据库）：

1. ✅ 立即开始交易
2. ⏰ 稍后按选项 1 安装数据库
3. ⏰ 重启机器人后开始记录

## 📱 获取帮助

如果遇到问题：

1. 检查 PostgreSQL 服务是否运行：
   ```powershell
   Get-Service -Name postgresql*
   ```

2. 测试数据库连接：
   ```powershell
   node test-database-connection.js
   ```

3. 查看详细错误日志

---

**推荐**: 如果你计划长期使用机器人，建议选择选项 1 安装数据库。这样可以：
- 📊 分析历史机会，找出最佳交易时段
- 📈 跟踪利润趋势
- 🎯 优化策略参数
- 💾 保存所有交易记录

**快速开始**: 如果你想立即测试机器人，选择选项 2，稍后再配置数据库。


