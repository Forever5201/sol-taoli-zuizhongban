# Jupiter Server Manager - 快速启动指南

## 🎯 3小时快速上线计划

按照这个指南，您将在 **3-4小时** 内完成 Jupiter Server Manager 的实施和测试。

---

## ⏱️ 时间分配

- **Phase 1**: 环境准备和依赖安装 (30分钟)
- **Phase 2**: 独立测试 Jupiter Server (1小时)
- **Phase 3**: 集成到 Jupiter Bot (1小时)
- **Phase 4**: 验证和调优 (1小时)

---

## 📋 Phase 1: 环境准备 (30分钟)

### 1.1 安装依赖

```bash
# 进入项目根目录
cd E:\6666666666666666666666666666\dex-cex\dex-sol

# 安装所有依赖
pnpm install

# 构建 core 包
cd packages/core
pnpm build

# 构建 jupiter-server 包
cd ../jupiter-server
pnpm build
```

### 1.2 配置 RPC

编辑 `configs/global.toml`，确保有有效的 RPC URL：

```toml
[global]
DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com"  # 或您的付费 RPC
DEFAULT_KEYPAIR_PATH = "./keypairs/devnet-test-wallet.json"
```

### 1.3 检查环境

```bash
# 确认 Node.js 版本
node --version  # 应该是 v20+

# 确认 pnpm 可用
pnpm --version
```

---

## 🧪 Phase 2: 独立测试 Jupiter Server (1小时)

### 2.1 第一次运行（自动下载）

```bash
# Windows
.\scripts\start-jupiter-server.bat

# Linux/Mac
pnpm tsx scripts/test-jupiter-server.ts
```

**预期输出**：

```
🚀 Starting Jupiter Server Test...

📦 Step 1: Starting Jupiter Server...
Downloading Jupiter CLI v6.0.35...
Downloading from: https://github.com/jup-ag/jupiter-quote-api-node/...
Binary written to: .\bin\jupiter-cli
✅ Jupiter CLI downloaded successfully (45.23 MB)
Starting Jupiter Server...
Jupiter Server is ready (attempt 3/30)
✅ Jupiter Server started successfully at http://127.0.0.1:8080
✅ Server started

🏥 Step 2: Health Check...
✅ Server is healthy

🔄 Step 3: Testing Circular Arbitrage Query...
   Query: SOL → SOL (0.1 SOL)
   Result:
   - Input: 0.1 SOL
   - Output: 0.100123 SOL
   - Profit: 0.000123 SOL (0.12% ROI)
   ✅ Opportunity found! (环形套利可行)
```

### 2.2 验证功能

打开浏览器访问：

- **健康检查**: http://127.0.0.1:8080/health
- **查询测试**: http://127.0.0.1:8080/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=So11111111111111111111111111111111111111112&amount=100000000

### 2.3 故障排查

#### 问题：下载失败

```
Error: Failed to download Jupiter CLI
```

**解决方案 A**：手动下载

1. 访问：https://github.com/jup-ag/jupiter-quote-api-node/releases
2. 下载对应平台的二进制文件
3. 放到 `./bin/jupiter-cli`（Windows: `jupiter-cli.exe`）
4. 重新运行

**解决方案 B**：使用代理

```bash
# 设置代理
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890

# 重新运行
.\scripts\start-jupiter-server.bat
```

#### 问题：启动超时

```
Error: Jupiter Server failed to start within 30 seconds
```

**解决方案**：

1. 检查 RPC URL 是否有效
2. 检查 8080 端口是否被占用
3. 查看日志：`[JupiterManager]` 开头的输出

---

## 🔗 Phase 3: 集成到 Jupiter Bot (1小时)

### 3.1 更新 Jupiter Bot 配置

创建 `packages/jupiter-bot/config.with-server.toml`:

```toml
[bot]
name = "jupiter-bot-with-server"
network = "mainnet-beta"
dry_run = true  # ⚠️ 测试阶段设为 true

# ✅ 关键：启用自托管 Jupiter Server
[jupiter_server]
start_server = true
rpc_url = "${DEFAULT_RPC_URL}"
port = 8080
enable_circular_arbitrage = true

[opportunity_finder]
mints_file = "./mints.txt"
worker_count = 2  # 先用 2 个 worker 测试
query_interval_ms = 100  # 较慢的查询间隔（测试用）
min_profit_lamports = 1_000_000  # 0.001 SOL
slippage_bps = 50

[execution]
mode = "spam"  # 先用 spam 模式测试
trade_amount_sol = 0.01  # 小金额测试

[spam]
rpc_urls = [
  "${DEFAULT_RPC_URL}",
]
concurrent_sends = 1

[keypair]
path = "${DEFAULT_KEYPAIR_PATH}"
min_balance_sol = 0.1
```

### 3.2 创建代币列表

创建 `packages/jupiter-bot/mints.txt`：

```
# 主流代币（测试用）
So11111111111111111111111111111111111111112
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```

### 3.3 测试集成

```bash
# 进入 jupiter-bot 目录
cd packages/jupiter-bot

# 运行（dry run模式）
pnpm tsx src/index.ts config.with-server.toml
```

**预期输出**：

```
[JupiterBot] Wallet loaded: xxxxx
[JupiterBot] Loaded 3 mints
[JupiterBot] Jupiter Bot initialized in spam mode
[JupiterBot] 🚀 Starting Jupiter Bot...
[JupiterManager] Starting Jupiter Server...
[JupiterManager] Jupiter CLI already exists at ./bin/jupiter-cli
[JupiterManager] ✅ Jupiter Server started successfully
[JupiterBot] ✅ Jupiter Server started
[JupiterBot] Performing health check...
[JupiterBot] ✅ Jupiter API healthy: 200
[OpportunityFinder] Opportunity Finder initialized: 2 workers, 3 mints
[OpportunityFinder] Starting Opportunity Finder...
[OpportunityFinder] Worker 0 started with 2 mints
[OpportunityFinder] Worker 1 started with 1 mints
```

---

## ✅ Phase 4: 验证和调优 (1小时)

### 4.1 验证清单

- [ ] Jupiter Server 自动下载并启动
- [ ] 健康检查通过
- [ ] 能查询环形套利路由
- [ ] Worker 正常运行
- [ ] 能发现套利机会（即使不盈利）
- [ ] 按 Ctrl+C 后优雅退出

### 4.2 性能调优

#### 调优 1：增加代币数量

编辑 `mints.txt`，添加更多代币（从 3 个增加到 20 个）：

```
# 参考 NotArb 的代币列表
So11111111111111111111111111111111111111112  # SOL
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC
Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB  # USDT
7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs  # ETH
mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So   # mSOL
# ... 添加更多
```

#### 调优 2：增加 Worker 数量

```toml
[opportunity_finder]
worker_count = 4  # 从 2 增加到 4
query_interval_ms = 50  # 从 100ms 减少到 50ms
```

#### 调优 3：监控吞吐量

观察日志中的统计信息：

```
[OpportunityFinder] Stats: 1234 queries, 5 opportunities, avg 78.5ms per query
```

**目标**：
- 查询吞吐：40-80 次/秒（4 workers）
- 机会发现：5-20 个/小时
- 平均查询时间：50-100ms

### 4.3 生产准备

#### 准备 1：使用付费 RPC

```toml
[jupiter_server]
rpc_url = "https://your-premium-rpc.com"  # 替换
```

#### 准备 2：关闭 dry_run

```toml
[bot]
dry_run = false  # ⚠️ 谨慎：将执行真实交易
```

#### 准备 3：增加资金

确保钱包有足够余额：
- 测试：0.1 SOL
- 小规模：1-5 SOL
- 生产：10+ SOL

---

## 📊 成功指标

### 🎉 Phase 2 成功标志

- ✅ Jupiter Server 自动下载
- ✅ 健康检查返回 200
- ✅ 能查询环形套利（即使无利润）
- ✅ 进程可以正常启动和停止

### 🎉 Phase 3 成功标志

- ✅ Jupiter Bot 能自动启动 Jupiter Server
- ✅ Worker 正常运行
- ✅ 能发现机会（日志中看到 "Opportunity found"）
- ✅ 无崩溃运行 5 分钟+

### 🎉 Phase 4 成功标志

- ✅ 查询吞吐达到 40+ 次/秒
- ✅ 能发现 5+ 个机会/小时
- ✅ 平均查询时间 < 100ms
- ✅ 可以稳定运行 1 小时+

---

## 🚀 下一步

完成 Jupiter Server Manager 后，按优先级推进：

### 立即推进（Day 2）

**JitoLeaderScheduler** - 成功率提升 4 倍

```bash
# 创建文件
packages/onchain-bot/src/executors/jito-leader-scheduler.ts

# 参考修正方案中的完整代码
# 预计时间：2-3 小时
# 立即效果：Bundle 成功率 15% → 60%
```

### 短期推进（Day 3-5）

1. **经济模型完善** - 避免亏损交易
2. **监控告警** - Discord Webhook
3. **Worker Threads 优化** - 吞吐量提升

### 中期推进（Week 2+）

1. **闪电贷集成**
2. **多钱包并行**
3. **On-Chain Bot 补充**

---

## 📞 需要帮助？

### 常见问题

**Q1: 为什么查询很慢？**

A: 检查 RPC 延迟。使用 `ping` 测试：
```bash
curl -X POST YOUR_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

**Q2: 为什么没发现机会？**

A: 这是正常的。环形套利机会稀少：
- 主流币：1-5 个/小时
- 长尾币：可能几小时都没有

建议：
- 增加代币数量（50-100 个）
- 降低利润阈值
- 等待市场波动

**Q3: 如何确认 Jupiter Server 正在工作？**

A: 访问 http://127.0.0.1:8080/health，应该返回：
```json
{"status":"ok"}
```

---

## ✅ 完成检查清单

复制这个清单，逐项完成：

```
Phase 1: 环境准备
[ ] 安装了所有依赖
[ ] 配置了 RPC URL
[ ] Node.js 版本正确

Phase 2: 独立测试
[ ] Jupiter Server 能启动
[ ] 健康检查通过
[ ] 能查询环形套利
[ ] 能正常停止

Phase 3: 集成测试
[ ] Jupiter Bot 能启动 Server
[ ] Worker 正常运行
[ ] 能发现机会
[ ] 优雅退出正常

Phase 4: 生产准备
[ ] 吞吐量达标（40+ 次/秒）
[ ] 机会发现率正常（5+ 个/小时）
[ ] 稳定运行 1 小时+
[ ] 配置了付费 RPC

下一步
[ ] 开始实施 JitoLeaderScheduler
[ ] 计划添加经济模型集成
[ ] 设置监控告警
```

---

**祝您实施顺利！** 🚀

如遇到问题，检查：
1. 日志输出
2. RPC 连接
3. 端口占用
4. 防火墙设置

