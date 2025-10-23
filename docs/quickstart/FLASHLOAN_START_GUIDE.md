# 🚀 闪电贷套利机器人 - 完整启动指南

**适合人群**：没有本金，想通过 Solend 闪电贷进行无本金套利

**所需资金**：仅需 **0.1 SOL**（约 $20）用于支付交易费

**预期收益**：0.005 - 0.1 SOL/次，取决于市场波动

---

## 📋 目录

1. [什么是闪电贷套利](#什么是闪电贷套利)
2. [准备工作](#准备工作)
3. [快速启动](#快速启动)
4. [配置说明](#配置说明)
5. [运行模式](#运行模式)
6. [监控和告警](#监控和告警)
7. [常见问题](#常见问题)
8. [风险提示](#风险提示)

---

## 🎯 什么是闪电贷套利

### 核心原理

闪电贷（Flash Loan）是一种**无抵押贷款**，特点：

```
传统套利（需要本金）：
┌─────────────────────────────────┐
│ 自有资金: 1 SOL                 │
│ 最大套利: 1 SOL × 5% = 0.05 SOL│
│ 需要锁定本金                     │
└─────────────────────────────────┘

闪电贷套利（无需本金）：
┌─────────────────────────────────┐
│ 借款: 100 SOL                   │
│ 套利: 100 SOL × 5% = 5 SOL     │
│ 费用: 100 SOL × 0.09% = 0.09   │
│ 净利润: 5 - 0.09 = 4.91 SOL    │
│ 无需本金！                       │
└─────────────────────────────────┘
```

### 交易流程

```
┌─────────────────────────────────────────┐
│ Instruction 0: Flash Borrow             │
│   从 Solend 借入 100 SOL                │
├─────────────────────────────────────────┤
│ Instruction 1: Swap on DEX A            │
│   100 SOL → 2000 USDC                   │
├─────────────────────────────────────────┤
│ Instruction 2: Swap on DEX B            │
│   2000 USDC → 105 SOL                   │
├─────────────────────────────────────────┤
│ Instruction 3: Flash Repay              │
│   还款 100.09 SOL (含 0.09% 费用)       │
│   剩余 4.91 SOL 为利润 💰               │
└─────────────────────────────────────────┘

⚠️ 如果任何步骤失败，整个交易回滚
    → 不会亏损本金，只亏损 Gas 费
```

### 优势

✅ **无需本金** - 只需要 0.1 SOL 支付交易费  
✅ **高杠杆** - 可以借款 100-1000 SOL 进行套利  
✅ **低风险** - 失败只损失 Gas 费（~0.0001-0.001 SOL）  
✅ **原子性** - 借款和还款在同一交易，绝对安全

---

## 📦 准备工作

### 1. 检查钱包

您已经配置了钱包：`keypairs/flashloan-wallet.json`

**确保钱包里有足够的 SOL 支付交易费：**

```bash
# 查看钱包地址
solana-keygen pubkey keypairs/flashloan-wallet.json

# 查看余额
solana balance keypairs/flashloan-wallet.json
```

**最低要求：0.1 SOL**（建议 0.2-0.5 SOL 以防万一）

💡 **如何充值？**
- 从中心化交易所（Binance、OKX）转账 SOL 到您的钱包地址
- 或使用 Solana 钱包（Phantom、Solflare）转账

### 2. 配置 RPC 端点（重要！）

闪电贷交易复杂，需要**高性能 RPC**。免费 RPC 可能不够用。

**推荐 RPC 提供商：**

| 提供商 | 免费额度 | 推荐指数 |
|--------|---------|---------|
| [Helius](https://helius.xyz/) | 100k 请求/天 | ⭐⭐⭐⭐⭐ |
| [QuickNode](https://quicknode.com/) | 有限免费 | ⭐⭐⭐⭐ |
| [Triton](https://triton.one/) | 需付费 | ⭐⭐⭐⭐⭐ |

**配置方法：**

编辑 `configs/flashloan-serverchan.toml`：

```toml
[rpc]
urls = [
  "https://rpc.helius.xyz/?api-key=YOUR_KEY",  # 替换为您的 API Key
  "https://api.mainnet-beta.solana.com",       # 备用（免费但慢）
]
```

### 3. 测试 Server酱（已完成）

您已经成功测试了 Server酱！✅

配置文件中已经包含了您的 SendKey：
```toml
[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true
```

### 4. 安装依赖

```bash
pnpm install
pnpm build
```

---

## 🚀 快速启动

### 方法一：一键启动（推荐）

**Windows：**
```cmd
start-flashloan-bot.bat
```

**Linux/Mac：**
```bash
chmod +x start-flashloan-bot.sh
./start-flashloan-bot.sh
```

### 方法二：命令行启动

```bash
# 1. 构建项目
pnpm build

# 2. 启动闪电贷机器人
pnpm start:flashloan --config=configs/flashloan-serverchan.toml
```

### 方法三：开发模式（实时编译）

```bash
pnpm dev:flashloan --config=configs/flashloan-serverchan.toml
```

---

## ⚙️ 配置说明

### 关键配置项

打开 `configs/flashloan-serverchan.toml`：

#### 1. 模拟运行（强烈建议先开启）

```toml
[bot]
dry_run = true  # true = 模拟运行，false = 真实交易
```

**第一次运行请设置为 `true`**，观察日志和通知，确认一切正常后再改为 `false`。

#### 2. 借款金额

```toml
[economics.cost]
flash_loan_amount = 100_000_000_000  # 100 SOL

[flashloan.solend]
min_borrow_amount = 10_000_000_000   # 最小 10 SOL
max_borrow_amount = 1_000_000_000_000  # 最大 1000 SOL
```

💡 **建议：**
- 初期：10-50 SOL
- 熟悉后：50-200 SOL
- 高级：200-1000 SOL

#### 3. 利润阈值

```toml
[economics.profit]
min_profit_lamports = 5_000_000  # 0.005 SOL 最低利润
min_roi = 200  # 200% ROI
```

**说明：**
- `min_profit_lamports`：必须赚到这么多才执行
- `min_roi = 200`：利润必须是费用的 2 倍（200%）

#### 4. 风险控制

```toml
[economics.risk]
max_consecutive_failures = 3  # 连续失败 3 次暂停
max_hourly_loss_lamports = 1_000_000  # 每小时最多亏 0.001 SOL
min_success_rate = 0.6  # 成功率低于 60% 暂停
```

#### 5. Server酱通知

```toml
[monitoring.serverchan]
send_key = "SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ"
enabled = true
alert_on_profit = true  # 赚钱时通知
alert_on_error = true  # 出错时通知
min_profit_for_alert = 5_000_000  # 利润超过 0.005 SOL 才通知
```

---

## 🎮 运行模式

### 模式一：模拟运行（Dry Run）

**特点：**
- 不会发送真实交易
- 只模拟计算利润和费用
- 测试所有逻辑和通知

**启动：**
```toml
# configs/flashloan-serverchan.toml
[bot]
dry_run = true
```

```bash
pnpm start:flashloan --config=configs/flashloan-serverchan.toml
```

**预期输出：**
```
🔍 发现套利机会！
   借款：100 SOL
   预期利润：0.05 SOL
   闪电贷费用：0.09 SOL
   净利润：0.041 SOL
   ROI：456%
   
✅ [DRY RUN] 模拟执行成功
```

**您会收到微信通知！**

### 模式二：真实交易

**特点：**
- 发送真实交易到链上
- 会消耗 SOL（Gas 费和 Jito tip）
- 可能赚钱也可能亏损 Gas 费

**启动前检查清单：**
- [ ] 钱包里有至少 0.1 SOL
- [ ] RPC 端点配置正确且可用
- [ ] 已经在模拟模式下运行过
- [ ] 理解风险和费用结构

**启动：**
```toml
# configs/flashloan-serverchan.toml
[bot]
dry_run = false  # 改为 false
```

```bash
pnpm start:flashloan --config=configs/flashloan-serverchan.toml
```

---

## 📱 监控和告警

### Server酱通知类型

机器人运行时，您会在微信"服务通知"收到以下消息：

#### 1. 💰 利润通知

```
🎉 套利成功！

净利润：0.042 SOL ($8.40)
借款金额：100 SOL
闪电贷费用：0.09 SOL
ROI：467%
耗时：2.3s

时间：2025-10-20 15:30:25
```

#### 2. ❌ 错误告警

```
⚠️ 闪电贷交易失败

原因：滑点过大
借款金额：100 SOL
损失：0.0005 SOL（仅 Gas 费）

时间：2025-10-20 15:35:10
```

#### 3. 🚨 熔断通知

```
🛑 触发熔断保护

原因：连续失败 3 次
累计损失：0.003 SOL
冷却时间：10 分钟

机器人已暂停，10 分钟后自动恢复
时间：2025-10-20 16:00:00
```

#### 4. 📊 定期统计

```
📊 闪电贷机器人运行报告

运行时间：2 小时
交易次数：15 次
成功：10 次（67%）
失败：5 次
总利润：0.35 SOL ($70)
总费用：0.05 SOL

时间：2025-10-20 18:00:00
```

### 日志文件

实时日志：`logs/flashloan.log`

```bash
# 实时查看日志（Windows）
type logs\flashloan.log

# 实时查看日志（Linux/Mac）
tail -f logs/flashloan.log
```

---

## ❓ 常见问题

### Q1: 闪电贷失败会亏钱吗？

**A:** 不会亏损本金，因为闪电贷是原子性的：
- 如果任何步骤失败，整个交易回滚
- 您只会损失 Gas 费（约 0.0001-0.001 SOL/次）
- 但频繁失败会累积损失，所以有熔断保护

### Q2: 为什么我的机器人没有发现机会？

**A:** 可能的原因：
1. **市场波动小** - 套利机会少，耐心等待
2. **利润阈值太高** - 降低 `min_profit_lamports`
3. **RPC 太慢** - 使用付费 RPC（Helius/QuickNode）
4. **代币列表太少** - 检查 `mints-high-liquidity.txt`

### Q3: 为什么机器人一直失败？

**A:** 常见原因：
1. **滑点过大** - 提高 `max_slippage`
2. **流动性不足** - 降低 `flash_loan_amount`
3. **Jito Leader 不在线** - 确保 `check_jito_leader = true`
4. **计算单元不足** - 提高 `compute_units`

### Q4: 借款金额怎么选？

**A:** 借款金额和成本的关系：

| 借款金额 | 闪电贷费用 | 需要利润率 | 难度 |
|---------|-----------|-----------|------|
| 10 SOL | 0.009 SOL | 2%+ | ⭐ 容易 |
| 50 SOL | 0.045 SOL | 2%+ | ⭐⭐ 中等 |
| 100 SOL | 0.09 SOL | 2%+ | ⭐⭐⭐ 较难 |
| 500 SOL | 0.45 SOL | 2%+ | ⭐⭐⭐⭐ 困难 |

**建议策略：**
- 初期从 10-50 SOL 开始
- 成功率稳定后增加到 100 SOL
- 只有在市场波动大时使用 500+ SOL

### Q5: 一天能赚多少钱？

**A:** 取决于市场波动和配置：

**保守策略（10-50 SOL）：**
- 机会：5-10 个/小时
- 成功率：60-70%
- 单次利润：0.005-0.02 SOL
- **预期日收益：0.05-0.2 SOL（$10-$40）**

**激进策略（100-500 SOL）：**
- 机会：3-8 个/小时
- 成功率：50-60%
- 单次利润：0.02-0.1 SOL
- **预期日收益：0.2-1 SOL（$40-$200）**

⚠️ **注意：这些是理想情况，实际收益取决于市场！**

### Q6: 我没有付费 RPC 可以用吗？

**A:** 可以，但会影响性能：
- 免费 RPC（如 `api.mainnet-beta.solana.com`）有限流
- 机会发现会更慢
- 交易可能失败更多

**建议：**
- 使用 Helius 免费额度（100k 请求/天）
- 或 QuickNode 试用版
- 成本很低，但收益显著

### Q7: 如何停止机器人？

**A:** 
- 按 `Ctrl + C` 在终端中停止
- 或直接关闭终端窗口
- 机器人会安全退出，不会有残留交易

---

## ⚠️ 风险提示

### 财务风险

1. **Gas 费损失**
   - 每次失败的交易会损失 ~0.0001-0.001 SOL
   - 频繁失败会累积损失
   - **缓解：启用熔断保护，设置合理阈值**

2. **闪电贷费用**
   - 即使交易成功，如果利润不足以覆盖费用也会亏损
   - **缓解：设置 `min_roi = 200`（利润必须是费用的 2 倍）**

3. **滑点损失**
   - 大额交易可能因滑点导致实际利润低于预期
   - **缓解：`max_slippage = 0.015`，只选大流动性池子**

### 技术风险

1. **RPC 失败**
   - 如果 RPC 宕机，机器人会停止运行
   - **缓解：配置多个 RPC 备用**

2. **网络拥堵**
   - Solana 网络拥堵时交易可能失败
   - **缓解：提高 `compute_unit_price`，使用 Jito MEV**

3. **程序 Bug**
   - 虽然代码经过测试，但仍可能有 bug
   - **缓解：先用 `dry_run = true` 模拟运行，小额测试**

### 监管风险

- 套利交易在大多数地区是合法的，但请了解当地法规
- 加密货币投资有风险，请量力而行

---

## 🎓 最佳实践

### 初次使用

1. **第一周：模拟运行**
   ```toml
   dry_run = true
   flash_loan_amount = 10_000_000_000  # 10 SOL
   ```
   观察机会发现和利润计算，熟悉系统

2. **第二周：小额真实交易**
   ```toml
   dry_run = false
   flash_loan_amount = 10_000_000_000  # 10 SOL
   ```
   真实交易，观察成功率和费用

3. **第三周：逐步增加**
   ```toml
   flash_loan_amount = 50_000_000_000  # 50 SOL
   ```
   成功率稳定后增加借款金额

4. **长期：优化策略**
   - 根据历史数据调整阈值
   - 优化代币列表
   - 测试不同的 Jito tip 策略

### 日常运维

- **每天查看日志和微信通知**
- **每周检查钱包余额**（确保有足够 SOL 支付 Gas）
- **每月回顾收益和损失**，优化配置

### 安全建议

- **不要泄露钱包私钥**（`flashloan-wallet.json`）
- **不要在公共场所运行机器人**
- **定期备份日志和配置**
- **限制每日最大损失**（`max_daily_loss_sol`）

---

## 📞 获取帮助

如果遇到问题：

1. **查看日志**：`logs/flashloan.log`
2. **查看配置**：`configs/flashloan-serverchan.toml`
3. **阅读设计文档**：`sol设计文档_修正版_实战.md`
4. **查看闪电贷文档**：`packages/core/src/flashloan/README.md`

---

## 🎉 准备好了吗？

按照以下步骤开始您的闪电贷套利之旅：

```bash
# 1. 确保钱包有 0.1+ SOL
solana balance keypairs/flashloan-wallet.json

# 2. 测试 Server酱
node test-serverchan-simple.js

# 3. 模拟运行
# 编辑 configs/flashloan-serverchan.toml: dry_run = true
start-flashloan-bot.bat

# 4. 观察日志和微信通知

# 5. 真实交易
# 编辑 configs/flashloan-serverchan.toml: dry_run = false
start-flashloan-bot.bat
```

**祝您套利顺利！💰**

---

## 📜 许可证

MIT License

---

## ⚖️ 免责声明

- 本软件仅供学习和研究用途
- 使用本软件进行交易的盈亏由用户自行承担
- 作者不对任何损失负责
- 加密货币投资有风险，请谨慎决策

---

*最后更新：2025-10-20*

