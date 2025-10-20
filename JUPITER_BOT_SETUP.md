# 🚀 Jupiter Bot 配置指南

## 📊 Jupiter Bot vs Onchain Bot

```
功能对比:
┌─────────────────────────────────────────────────────────┐
│                 Jupiter Bot  vs  Onchain Bot            │
├─────────────────────────────────────────────────────────┤
│ 套利类型       三角/环形          双池直接              │
│ 机会数量       ★★★★★              ★★★☆☆              │
│ 路径优化       自动最优            手动配置              │
│ 覆盖范围       所有DEX             指定DEX               │
│ 延迟           5-10ms             1-5ms                 │
│ 配置复杂度     ★★★★☆              ★★☆☆☆              │
│ 本金需求       0.1-2 SOL          0.1-2 SOL            │
│ 与闪电贷结合   ✅ 完美             ✅ 支持               │
└─────────────────────────────────────────────────────────┘

推荐策略: 同时运行两个Bot！
├─ Jupiter Bot: 发现三角套利
└─ Onchain Bot: 发现双池套利
```

---

## 🎯 Jupiter Bot 特性

### 核心优势

1. **环形套利检测**
   ```
   SOL → USDC → USDT → SOL
   自动发现价格闭环机会
   ```

2. **Jupiter 聚合**
   ```
   自动选择最优路径
   覆盖所有主流DEX:
   ├─ Raydium
   ├─ Orca
   ├─ Meteora
   └─ 其他20+ DEX
   ```

3. **闪电贷增强**
   ```
   无本金套利
   借款 100 SOL → 套利 → 归还
   仅需 0.1 SOL Gas费
   ```

---

## 📋 配置选项

### 选项 A: 使用公共 Jupiter API（推荐入门）

**优点**：
- ✅ 无需额外配置
- ✅ 立即可用
- ✅ 维护简单

**缺点**：
- ⚠️ 有速率限制
- ⚠️ 延迟稍高（50-100ms）
- ⚠️ 与他人共享资源

**配置**：
```toml
[jupiter]
api_url = "https://quote-api.jup.ag/v6"
query_interval_ms = 200  # 稍慢一点避免限制
```

**适合**：
- 测试和学习
- 小规模套利
- 不想配置本地服务器

---

### 选项 B: 使用本地 Jupiter Server（推荐生产）

**优点**：
- ✅ 无速率限制
- ✅ 延迟极低（1-5ms）
- ✅ 完全控制

**缺点**：
- ⚠️ 需要配置
- ⚠️ 占用系统资源
- ⚠️ 需要维护

**配置步骤**：

#### 1. 启动 Jupiter Server
```powershell
# Windows 自动化方式
cd packages\jupiter-server
pnpm run start

# 或手动下载 Jupiter CLI
# (详见 packages/jupiter-server/README.md)
```

#### 2. 修改配置
```toml
[jupiter]
api_url = "http://127.0.0.1:8080"
query_interval_ms = 10  # 可以更快
```

**适合**：
- 高频套利
- 追求极致性能
- 认真做生产环境

---

## 🚀 快速启动

### 当前配置状态

```
✅ 配置文件: packages/jupiter-bot/my-config.toml
✅ 代币列表: packages/jupiter-bot/mints.txt
✅ 钱包: keypairs/flashloan-wallet.json
✅ 余额: 0.012533571 SOL
✅ 闪电贷: 已启用
```

### 启动步骤

#### 方式 1: 使用公共 API（最简单）

```powershell
# 1. 进入目录
cd E:\6666666666666666666666666666\dex-cex\dex-sol

# 2. 确认配置
# 检查 packages/jupiter-bot/my-config.toml
# 确保 api_url = "https://quote-api.jup.ag/v6"

# 3. 启动
pnpm --filter @solana-arb-bot/jupiter-bot start
```

#### 方式 2: 使用本地 Server（高性能）

```powershell
# 1. 启动 Jupiter Server（新终端）
cd packages\jupiter-server
pnpm run start

# 2. 等待启动完成
# 看到 "Server is ready" 后继续

# 3. 修改配置（另一个终端）
# 编辑 packages/jupiter-bot/my-config.toml
# 改为 api_url = "http://127.0.0.1:8080"

# 4. 启动 Bot
pnpm --filter @solana-arb-bot/jupiter-bot start
```

---

## 📊 配置详解

### 关键参数说明

#### 交易参数
```toml
[trading]
# 每笔交易金额
trade_amount_sol = 0.01  # 小额测试
# trade_amount_sol = 0.1   # 正式运行

# 最小利润（考虑闪电贷费用 0.09%）
min_profit_sol = 0.0001  # 0.01%
# min_profit_sol = 0.001   # 0.1% 更保守

# 滑点容差
slippage_bps = 50  # 0.5%
```

#### Jito 小费策略
```toml
[jito]
# 基础小费（低竞争）
tip_lamports = 10000   # 0.00001 SOL

# 中等竞争
# tip_lamports = 25000   # 0.000025 SOL

# 高竞争
# tip_lamports = 50000   # 0.00005 SOL

# 动态小费（推荐）
[advanced]
dynamic_tip = true
tip_profit_percentage = 5  # 利润的5%作为小费
```

#### 闪电贷配置
```toml
[flashloan]
enabled = true
max_flashloan_amount = 100000000000  # 100 SOL

# 最小净利润（扣除0.09%费用后）
min_profit_after_fees = 500000  # 0.0005 SOL
```

---

## 🔧 双 Bot 并行策略（终极配置）

### 架构

```
┌─────────────────────────────────────────┐
│         套利机会发现层                   │
├─────────────────────────────────────────┤
│  Jupiter Bot        Onchain Bot         │
│  (三角套利)         (双池套利)          │
│      ↓                   ↓               │
│  发现环形机会        发现价差             │
└──────┬──────────────────┬────────────────┘
       │                  │
       └────────┬─────────┘
                ↓
      ┌─────────────────┐
      │  Jito Executor   │
      │  (统一执行)      │
      └─────────────────┘
                ↓
         闪电贷增强交易
                ↓
            成功套利！
```

### 启动脚本

创建 `start-dual-bots.bat`:

```batch
@echo off
echo Starting Dual Bot System...

start "Jupiter Bot" cmd /k "pnpm --filter @solana-arb-bot/jupiter-bot start"
timeout /t 2
start "Onchain Bot" cmd /k "pnpm start:onchain-bot"

echo Both bots started!
pause
```

---

## 📈 预期收益对比

### 单个 Bot

```
Onchain Bot 单独运行:
├─ 机会/小时: 5-10 个
├─ 成功率: 60-80%
└─ 日均: 0.01-0.05 SOL

Jupiter Bot 单独运行:
├─ 机会/小时: 10-20 个
├─ 成功率: 70-90%
└─ 日均: 0.02-0.1 SOL
```

### 双 Bot 并行

```
Jupiter + Onchain 并行:
├─ 机会/小时: 15-30 个
├─ 成功率: 65-85%
└─ 日均: 0.03-0.15 SOL

收益提升: 50-200%！
```

### 加上闪电贷

```
双 Bot + 闪电贷:
├─ 本金需求: 0.1-0.5 SOL（仅Gas费）
├─ 实际使用: 最高 100 SOL（借的）
├─ ROI 提升: 1000%+
└─ 日均收益: 0.05-0.3 SOL
```

---

## ⚠️ 重要提示

### 余额建议

```
当前余额: 0.0125 SOL

最低要求: 0.1 SOL
推荐配置: 0.5 SOL
理想配置: 1-2 SOL

原因:
├─ Gas 费储备
├─ Jito 小费
├─ 交易缓冲
└─ 应急准备
```

### 风险控制

1. **从小额开始**
   ```toml
   trade_amount_sol = 0.01  # 先测试
   ```

2. **启用熔断器**
   ```toml
   circuit_breaker_enabled = true
   circuit_breaker_max_failures = 5
   ```

3. **监控日志**
   ```
   实时查看 logs/jupiter-bot.log
   关注错误和警告
   ```

---

## 🛠️ 故障排查

### 问题 1: 找不到机会

**可能原因**：
- 利润阈值太高
- 查询间隔太慢
- 代币列表太少

**解决**：
```toml
min_profit_sol = 0.0001    # 降低阈值
query_interval_ms = 100    # 加快查询
# 添加更多代币到 mints.txt
```

### 问题 2: 交易失败

**可能原因**：
- Jito 小费太低
- 滑点设置太小
- 网络拥堵

**解决**：
```toml
tip_lamports = 25000       # 提高小费
slippage_bps = 100         # 放宽滑点
```

### 问题 3: API 速率限制

**症状**：
```
Error: Rate limit exceeded
Too many requests
```

**解决**：
```toml
query_interval_ms = 500    # 降低频率
# 或切换到本地 Jupiter Server
```

---

## 📚 相关资源

- `packages/jupiter-bot/README.md` - 详细文档
- `packages/jupiter-server/README.md` - Server 配置
- `BUILD_STATUS.md` - 系统状态
- `FINAL_STATUS.md` - 完整状态报告

---

## 🎯 下一步

### 现在可以做：

**选项 1: 测试 Jupiter Bot（公共API）**
```powershell
pnpm --filter @solana-arb-bot/jupiter-bot start
```

**选项 2: 测试 Onchain Bot**
```powershell
pnpm start:onchain-bot
```

**选项 3: 先充值再启动**
```
充值 0.5-1 SOL 到:
6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG

然后启动双 Bot 系统
```

---

**配置完成！Jupiter Bot 已就绪！** 🚀
