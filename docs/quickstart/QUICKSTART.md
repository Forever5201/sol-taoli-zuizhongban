# On-Chain Bot MVP - 快速入门指南

## 🎯 快速测试（5分钟）

### 前提条件

确保已安装 Node.js 20+ 和 npm。

### 步骤 1: 安装依赖

```bash
# 安装根依赖
npm install

# 安装 core 包依赖
cd packages/core
npm install
cd ../..

# 安装 onchain-bot 包依赖
cd packages/onchain-bot
npm install
cd ../..
```

### 步骤 2: 创建 Devnet 测试密钥

```bash
# 使用 Solana CLI 生成测试密钥
solana-keygen new --outfile ./test-keypair.json --no-bip39-passphrase

# 或者手动创建一个 JSON 数组文件
# 格式：[123, 45, 67, ...] （64个字节）
```

### 步骤 3: 获取 Devnet SOL

```bash
# 使用 Solana CLI
solana airdrop 5 ./test-keypair.json --url devnet

# 或访问 https://faucet.solana.com/
```

### 步骤 4: 创建全局配置

```bash
# 复制示例配置
copy configs\global.example.toml configs\global.toml

# 编辑 configs/global.toml，设置：
# - DEFAULT_RPC_URL = "https://api.devnet.solana.com"
# - DEFAULT_KEYPAIR_PATH = "./test-keypair.json"
# - acknowledge_terms_of_service = true
```

### 步骤 5: 运行 Bot

```bash
# 开发模式（带详细日志）
npm run start:onchain-bot -- --config packages/onchain-bot/config.example.toml

# 或使用构建后的版本
npm run build
npm run start:onchain-bot:prod -- --config packages/onchain-bot/config.example.toml
```

---

## 📊 预期输出

Bot 启动后会显示类似的输出：

```
🎯 ========== On-Chain Arbitrage Bot ==========
Version: 1.0.0 MVP
Config: packages/onchain-bot/config.example.toml

INFO: Initializing On-Chain Bot...
INFO: Bot name: onchain-bot-mvp
INFO: Network: devnet
INFO: Dry run: false

INFO: Initializing RPC pool with 2 endpoints...
INFO: ConnectionPool initialized with 2 endpoints

INFO: Loading keypair from ./test-keypair.json...
INFO: Keypair loaded: 7x...ABC
INFO: Wallet: 7x...ABC
INFO: Balance: 5.000000 SOL

INFO: Loading markets from ./markets.toml...
INFO: Loaded 2 markets

INFO: Market scanner initialized with 2 markets
INFO: Arbitrage engine initialized with min spread 0.5%
INFO: Spam executor initialized with 3 max retries
INFO: Initializing economics system...
INFO: ✅ All components initialized successfully

🚀 Starting On-Chain Bot...
INFO: Monitoring started (interval: 60000ms)

INFO: Scan completed: 2/2 pools in 145ms
INFO: Found 0 arbitrage opportunities
...
```

---

## 🧪 测试功能

### 1. 测试经济模型

```bash
# 运行经济模型演示
npm run demo
```

### 2. 测试成本计算

```bash
# 模拟 Devnet 交易成本
npm run cost-sim -- -s 2 -cu 200000 -cup 5000 -jt 50

# 查看帮助
npm run cost-sim -- --help
```

### 3. 监控 Jito 小费市场

```bash
# 实时监控（需要网络连接）
npm run jito-monitor
```

---

## 🔧 调试技巧

### 查看详细日志

设置环境变量：
```bash
# Windows PowerShell
$env:LOG_LEVEL="debug"
npm run start:onchain-bot

# Linux/Mac
LOG_LEVEL=debug npm run start:onchain-bot
```

### 干运行模式

在 `config.toml` 中设置：
```toml
[bot]
dry_run = true
```

这样 Bot 会执行所有逻辑，但不实际发送交易。

### 减少扫描频率

如果遇到 RPC 限流，在 `config.toml` 中增加间隔：
```toml
[markets]
scan_interval_ms = 500  # 从 100ms 增加到 500ms
```

---

## 📂 关键文件

### 配置文件

- `configs/global.toml` - 全局配置（需手动创建）
- `packages/onchain-bot/config.example.toml` - Bot 配置模板
- `packages/onchain-bot/markets.toml` - 市场列表

### 日志文件

- `logs/onchain-bot.log` - Bot 运行日志（自动创建）

### 密钥文件

- `./test-keypair.json` - Devnet 测试密钥（需手动创建）

---

## ⚠️ 常见问题

### 问题 1: "Keypair file not found"

**解决**: 确保在 `configs/global.toml` 中正确设置了密钥路径：
```toml
DEFAULT_KEYPAIR_PATH = "./test-keypair.json"
```

### 问题 2: "Balance is low"

**解决**: 获取更多 Devnet SOL：
```bash
solana airdrop 5 ./test-keypair.json --url devnet
```

### 问题 3: "No price data available"

**可能原因**:
- RPC 连接失败
- 池子地址不正确（Devnet 与 Mainnet 不同）
- 账户数据结构解析错误

**解决**: 
1. 检查 RPC 连接
2. 验证 `markets.toml` 中的池子地址
3. 使用 `LOG_LEVEL=debug` 查看详细日志

### 问题 4: "All RPCs failed"

**解决**:
- 添加更多 RPC 端点
- 减少扫描频率
- 检查网络连接

---

## 🎓 下一步

1. **理解输出**: 观察 Bot 如何扫描市场和发现机会
2. **调整参数**: 修改 `min_spread_percent`、`trade_amount` 等
3. **添加更多市场**: 在 `markets.toml` 中添加更多交易对
4. **优化策略**: 根据 Devnet 表现调整经济模型参数
5. **准备 Mainnet**: 在充分测试后，切换到 Mainnet 配置

---

## 📞 获取帮助

- 查看日志文件
- 阅读 [README.md](README.md)
- 查看 [API 文档](packages/core/src/economics/README.md)
- 检查 [SETUP.md](SETUP.md)

---

**祝测试顺利！🚀**


