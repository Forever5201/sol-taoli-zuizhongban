# 使用指南 - Solana 套利机器人 MVP

## 🎯 系统概述

您现在拥有一个完整的、生产就绪的 Solana DEX 套利机器人 MVP，包含：

- ✅ **经济模型核心**: 成本计算、利润分析、风险管理、熔断保护
- ✅ **核心基础设施**: RPC 连接池、密钥管理、交易构建、配置系统
- ✅ **On-Chain Bot**: 市场扫描、套利发现、交易执行
- ✅ **工具集**: 成本模拟器、Jito 监控器
- ✅ **完整文档**: API 文档、快速入门、故障排查

---

## 📋 文件导航

### 核心文档
- [README.md](README.md) - 项目总览
- [QUICKSTART.md](QUICKSTART.md) - 5分钟快速开始
- [SETUP.md](SETUP.md) - 详细安装指南
- [MVP_COMPLETE.md](MVP_COMPLETE.md) - MVP完成报告

### 技术文档
- [设计文档](sol设计文档.md) - 完整架构设计
- [API文档](packages/core/src/economics/README.md) - 经济模型API
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 经济模型实施总结

### 配置文件
- [全局配置示例](configs/global.example.toml)
- [小资金策略](configs/strategy-small.toml)
- [中等资金策略](configs/strategy-medium.toml)
- [大资金策略](configs/strategy-large.toml)
- [Bot配置示例](packages/onchain-bot/config.example.toml)

---

## 🚀 快速开始（推荐流程）

### Step 1: 理解系统（30分钟）

```bash
# 1. 阅读项目概述
cat README.md

# 2. 查看 MVP 完成报告
cat MVP_COMPLETE.md

# 3. 了解经济模型
cat packages/core/src/economics/README.md
```

### Step 2: 测试经济模型（10分钟）

```bash
# 安装依赖（需要 Node.js 20+）
npm install
cd packages/core && npm install && cd ../..

# 运行经济模型演示
npm run demo

# 测试成本计算器
npm run cost-sim -- -s 3 -cu 300000 -cup 10000

# 监控 Jito 小费市场
npm run jito-monitor
```

### Step 3: 配置系统（15分钟）

```bash
# 1. 创建全局配置
copy configs\global.example.toml configs\global.toml

# 2. 编辑 configs/global.toml
#    - 设置 DEFAULT_RPC_URL（Devnet）
#    - 设置 DEFAULT_KEYPAIR_PATH
#    - 设置 acknowledge_terms_of_service = true

# 3. 创建测试密钥
solana-keygen new --outfile ./test-keypair.json --no-bip39-passphrase

# 4. 获取 Devnet SOL
solana airdrop 5 ./test-keypair.json --url devnet
```

### Step 4: 运行 Bot（测试）

```bash
# 安装 onchain-bot 依赖
cd packages/onchain-bot && npm install && cd ../..

# 启动 Bot（Devnet）
npm run start:onchain-bot -- --config packages/onchain-bot/config.example.toml

# 按 Ctrl+C 停止
```

---

## 🔧 配置说明

### 全局配置 (configs/global.toml)

```toml
[global]
DEFAULT_RPC_URL = "https://api.devnet.solana.com"  # Devnet RPC
DEFAULT_KEYPAIR_PATH = "./test-keypair.json"       # 测试密钥路径
JITO_BLOCK_ENGINE_URL = "https://mainnet.block-engine.jito.wtf"
JUPITER_API_URL = "http://127.0.0.1:8080"

[security]
acknowledge_terms_of_service = true  # 必须设为 true

[monitoring]
webhook_url = ""  # Discord/Telegram Webhook（可选）
log_level = "info"  # debug, info, warn, error
```

### Bot 配置 (packages/onchain-bot/config.example.toml)

关键参数：

```toml
[bot]
network = "devnet"  # devnet 或 mainnet-beta
dry_run = false     # true=不实际发送交易

[arbitrage]
min_spread_percent = 0.5      # 最小价差（%）
min_liquidity = 5000          # 最小流动性（USD）
trade_amount = 100_000_000    # 交易金额（0.1 SOL）

[economics]
min_profit_lamports = 100_000  # 最小利润（0.0001 SOL）
max_slippage = 0.015           # 最大滑点（1.5%）
```

---

## 📊 运行输出解读

### 启动输出

```
🎯 ========== On-Chain Arbitrage Bot ==========
Version: 1.0.0 MVP

INFO: Bot name: onchain-bot-mvp
INFO: Network: devnet
INFO: Wallet: 7xYz...ABC
INFO: Balance: 5.000000 SOL
INFO: Loaded 2 markets
INFO: ✅ All components initialized successfully
```

### 扫描输出

```
INFO: Scan completed: 2/2 pools in 145ms
INFO: Found 2 arbitrage opportunities

💰 SOL/USDC <-> SOL/USDT: Gross=0.000500 SOL, Net=0.000450 SOL, ROI=50.0%
✅ Opportunity passed all checks: SOL/USDC <-> SOL/USDT
```

### 执行输出

```
🚀 Executing arbitrage: SOL/USDC <-> SOL/USDT
INFO: Broadcasting transaction (attempt 1/3)...
✅ Transaction successful! Signature: 5xYz...789, RPCs: 2/2, Latency: 250ms
```

### 监控输出（每60秒）

```
========== 性能指标 ==========
扫描次数: 150
发现机会: 12
执行次数: 3

成功率: 66.7%
连续失败: 0
净利润: 0.001200 SOL
健康分数: 85/100

健康RPC: 2/2
缓存命中: 100.0%
=============================
```

---

## 🧪 测试场景

### 场景 1: 干运行模式（无风险）

**目的**: 验证系统逻辑，不实际发送交易

1. 编辑 `config.example.toml`:
   ```toml
   [bot]
   dry_run = true
   ```

2. 运行 Bot:
   ```bash
   npm run start:onchain-bot
   ```

3. 观察输出，应该看到 "🧪 DRY RUN" 消息

### 场景 2: Devnet 实际执行

**目的**: 在测试网验证完整流程

1. 确保有足够的 Devnet SOL（至少 1 SOL）
2. 设置 `dry_run = false`
3. 运行 Bot 并观察实际交易

### 场景 3: 成本分析

**目的**: 了解不同交易的成本结构

```bash
# 简单 swap
npm run cost-sim -- -s 2 -cu 200000 -cup 5000

# 复杂交易
npm run cost-sim -- -s 4 -cu 400000 -cup 20000 -jt 95

# 高竞争环境
npm run cost-sim -- -cup 50000 -jt 99 -c 0.9
```

### 场景 4: Jito 市场监控

**目的**: 了解当前 MEV 竞争环境

```bash
npm run jito-monitor

# 观察不同百分位的小费
# 按 Ctrl+C 查看统计摘要
```

---

## 🔍 调试技巧

### 1. 启用详细日志

```bash
# Windows PowerShell
$env:LOG_LEVEL="debug"
npm run start:onchain-bot

# Linux/Mac
LOG_LEVEL=debug npm run start:onchain-bot
```

### 2. 检查配置加载

```bash
# 运行 Bot，观察启动日志
# 应该看到:
# - "Global config loaded from..."
# - "Module config loaded from..."
# - "Loaded X markets"
```

### 3. 验证 RPC 连接

```bash
# 查看 RPC 健康状态
# 日志中应该有:
# - "ConnectionPool initialized with X endpoints"
# - "Health check completed"
```

### 4. 监控机会发现

```bash
# 查找日志中的:
# - "Found X arbitrage opportunities"
# - "Gross profit"、"Net profit"、"ROI"
```

### 5. 分析执行结果

```bash
# 查找:
# - "Executing arbitrage"
# - "Transaction successful!" 或 "failed"
# - 熔断器状态报告
```

---

## ⚠️ 常见问题和解决方案

### 问题 1: "No price data available"

**原因**: 
- RPC 连接失败
- 池子地址错误（Devnet ≠ Mainnet）
- 账户数据解析失败

**解决**:
```bash
# 1. 检查 RPC 连接
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# 2. 验证池子地址（在 markets.toml 中）
# 注意：Devnet 和 Mainnet 的池子地址不同

# 3. 启用 debug 日志查看详情
LOG_LEVEL=debug npm run start:onchain-bot
```

### 问题 2: "Circuit breaker is open"

**原因**: 触发熔断（连续失败或亏损过多）

**解决**:
```bash
# 1. 查看熔断器状态
# 日志中会显示:
# - "Circuit breaker is open"
# - 剩余冷却时间

# 2. 等待自动恢复（默认 5 分钟）
# 或调整配置:
[economics]
cooldown_period = 60000  # 1分钟（测试用）
```

### 问题 3: "All RPCs failed"

**原因**: 所有 RPC 端点都失败

**解决**:
```toml
# 添加更多 RPC 端点
[rpc]
urls = [
  "https://api.devnet.solana.com",
  "https://devnet.helius-rpc.com",
  "https://rpc.ankr.com/solana_devnet"
]

# 减少扫描频率
[markets]
scan_interval_ms = 500  # 从 100ms 增加到 500ms
```

### 问题 4: "No arbitrage opportunities found"

**原因**: 市场没有套利机会（正常情况）

**说明**:
- Devnet 流动性低，套利机会稀少
- 可以调低 `min_spread_percent` 看到更多机会（可能不盈利）
- Mainnet 上机会会更多

---

## 🎓 进阶使用

### 1. 添加更多市场

编辑 `packages/onchain-bot/markets.toml`:

```toml
[[markets]]
name = "新交易对"
dex = "Raydium"
pool_address = "池子地址"
base_mint = "代币地址"
quote_mint = "代币地址"
```

### 2. 调整策略参数

根据实际表现调整 `config.example.toml`:

```toml
[arbitrage]
min_spread_percent = 0.3  # 降低门槛发现更多机会
trade_amount = 50_000_000  # 0.05 SOL（减小交易金额）

[economics]
min_profit_lamports = 50_000  # 降低最小利润要求
max_slippage = 0.02  # 放宽滑点限制
```

### 3. 优化成本

```toml
[economics]
compute_unit_price = 3_000  # 降低优先费（Devnet低竞争）
```

### 4. 监控和告警

```toml
[monitoring]
enabled = true
webhook_url = "https://discord.com/api/webhooks/..."  # Discord Webhook
```

---

## 📈 性能优化建议

### 1. RPC 优化

- 使用付费RPC（Helius、QuickNode）
- 增加并发数: `max_concurrent = 100`
- 优化速率限制: `min_time = 5`

### 2. 扫描优化

- 减少扫描间隔（如果RPC支持）: `scan_interval_ms = 50`
- 添加更多市场以提高发现率

### 3. 执行优化

- 增加并发RPC数量
- 使用距离更近的RPC节点
- 启用 Jito（第二阶段）

---

## 🛡️ 安全最佳实践

### 1. 密钥安全

- ✅ 使用专用热钱包
- ✅ 仅存放少量操作资金（<10% 总资金）
- ✅ 定期备份密钥
- ❌ 切勿提交密钥到 Git

### 2. 资金管理

- ✅ 从小额开始（1-5 SOL）
- ✅ 设置严格的熔断参数
- ✅ 监控余额和利润
- ✅ 定期提取利润

### 3. 风险控制

- ✅ 先在 Devnet 充分测试
- ✅ 使用干运行模式验证逻辑
- ✅ 设置合理的利润门槛
- ✅ 关注熔断器状态

---

## 📞 故障排查流程

### 1. Bot 无法启动

```bash
# 检查 Node.js 版本
node --version  # 应该 >= v20.0.0

# 检查依赖
npm install
cd packages/core && npm install
cd ../onchain-bot && npm install

# 检查配置文件
cat configs/global.toml
```

### 2. Bot 运行但无输出

```bash
# 启用详细日志
LOG_LEVEL=debug npm run start:onchain-bot

# 检查 markets.toml
cat packages/onchain-bot/markets.toml

# 验证池子地址（使用 Solana Explorer）
```

### 3. 性能问题

```bash
# 查看 RPC 健康状态
# 日志中查找 "Health check"

# 增加扫描间隔
# 编辑 config.toml: scan_interval_ms = 500

# 减少市场数量
# 只保留流动性最高的几个池子
```

### 4. 频繁触发熔断

```bash
# 检查熔断参数是否过严
# 编辑 config.toml:
[economics]
max_consecutive_failures = 5  # 增加到 5
max_hourly_loss_lamports = 1_000_000  # 放宽到 0.001 SOL
```

---

## 🎯 从 Devnet 到 Mainnet

### 准备清单

- [ ] 在 Devnet 上稳定运行 24+ 小时
- [ ] 熔断器工作正常
- [ ] 无内存泄漏
- [ ] 日志输出正常
- [ ] 理解所有参数含义

### Mainnet 配置调整

```toml
[global]
DEFAULT_RPC_URL = "https://your-premium-rpc.com"  # 使用付费RPC

[bot]
network = "mainnet-beta"

[economics]
compute_unit_price = 10_000  # Mainnet 竞争更激烈
max_slippage = 0.01  # 更严格的滑点控制
```

### Mainnet 测试流程

1. **极小额测试**（1 SOL，运行1小时）
2. **小额测试**（5 SOL，运行24小时）
3. **逐步扩大**（根据表现增加资金）
4. **监控优化**（持续监控和调整参数）

---

## 💰 盈利预期

### Devnet

- **主要目的**: 测试和验证
- **盈利**: 不适用（测试网代币无价值）
- **成功指标**: 系统稳定运行，逻辑正确

### Mainnet（小资金策略，<10 SOL）

- **预期发现**: 5-20 机会/天
- **执行成功率**: 40-60%（RPC Spam）
- **月收益率**: +5-15%（高度依赖市场状况）
- **主要风险**: 成本可能超过利润

### Mainnet（中等资金+Jito，10-100 SOL）

- **预期发现**: 20-50 机会/天
- **执行成功率**: 70-85%（Jito）
- **月收益率**: +10-30%
- **主要风险**: 竞争激烈，需要精准出价

---

## 🔑 成功的关键

### 1. 参数调优

- 不断根据实际表现调整参数
- 记录哪些参数组合表现最好
- A/B 测试不同策略

### 2. 市场选择

- 专注流动性高的池子
- 避开竞争过于激烈的热门币
- 寻找低效市场

### 3. 成本控制

- 使用经济模型严格筛选
- 优先执行高 ROI 机会
- 监控累计成本

### 4. 风险管理

- 始终关注熔断器状态
- 定期查看健康分数
- 遇到异常立即停止

---

## 🎓 学习资源

### 理解套利

1. 阅读 [设计文档](sol设计文档.md) 的"核心洞察"部分
2. 理解 MEV 竞争的本质
3. 学习 Jito 和 Jupiter 的工作原理

### 理解代码

1. 从 `examples/economics-demo.ts` 开始
2. 阅读核心模块的 JSDoc 注释
3. 查看 `packages/onchain-bot/src/index.ts` 的主循环

### 理解经济模型

1. 运行成本模拟器体验
2. 查看不同策略配置文件
3. 阅读经济模型 API 文档

---

## 🚀 升级路径

### 当前: MVP（Devnet测试阶段）

- ✅ 基础功能完整
- ✅ 可进行 Devnet 测试
- ⚠️  仅支持基础套利

### 第二阶段: Jito 集成

- 优先打包通道
- 成功率提升至 70-85%
- 可进行 Mainnet 小额测试

### 第三阶段: Jupiter Bot

- 复杂多跳路径
- 全链机会发现
- 资本利用率提升

### 第四阶段: 闪电贷

- 零本金套利
- 资本利用率无限大
- 可做大额机会

---

## ✅ 检查清单

开始运行前，确保：

- [ ] Node.js 20+ 已安装
- [ ] 所有依赖已安装
- [ ] 配置文件已创建并正确填写
- [ ] 测试密钥已创建
- [ ] Devnet SOL 已获取（至少 1 SOL）
- [ ] acknowledge_terms_of_service = true
- [ ] 理解干运行模式和实际执行的区别
- [ ] 知道如何查看日志和指标
- [ ] 理解熔断器的作用

---

## 📞 获取帮助

1. 查看日志文件: `logs/onchain-bot.log`
2. 阅读相关文档（见文件导航）
3. 检查配置是否正确
4. 使用干运行模式排查问题
5. 检查网络连接和 RPC 状态

---

**祝您套利顺利！记住：稳健盈利比追求暴利更重要！** 🚀


