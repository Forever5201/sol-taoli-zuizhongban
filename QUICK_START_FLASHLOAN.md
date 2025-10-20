# 🚀 闪电贷机器人 - 5分钟快速启动

> **适合**：没有本金，想用闪电贷套利的用户  
> **所需资金**：仅需 0.1 SOL（$20）支付交易费  
> **预期收益**：0.005-0.1 SOL/次

---

## ✅ 您已完成的准备工作

1. ✅ 钱包已配置：`keypairs/flashloan-wallet.json`
2. ✅ Server酱已测试成功
3. ✅ 配置文件已创建：`configs/flashloan-serverchan.toml`

---

## 📋 快速启动步骤

### 第一步：安装依赖（首次运行）

```bash
pnpm install
```

### 第二步：构建项目（首次运行）

```bash
pnpm build
```

### 第三步：检查钱包余额

确保钱包里至少有 **0.1 SOL** 用于支付交易费：

```bash
# 查看钱包地址
solana-keygen pubkey keypairs/flashloan-wallet.json

# 查看余额
solana balance keypairs/flashloan-wallet.json
```

**如果余额不足**：从交易所（Binance/OKX）转账 SOL 到上述地址。

### 第四步：配置 RPC（推荐）

编辑 `configs/flashloan-serverchan.toml`，将 RPC 替换为您自己的：

```toml
[rpc]
urls = [
  "https://rpc.helius.xyz/?api-key=YOUR_KEY",  # 👈 替换这里
  "https://api.mainnet-beta.solana.com",
]
```

**免费 RPC 推荐**：[Helius](https://helius.xyz/) - 100k 请求/天免费

### 第五步：模拟运行（强烈推荐）

编辑 `configs/flashloan-serverchan.toml`：

```toml
[bot]
dry_run = true  # 👈 保持为 true，先模拟运行
```

### 第六步：启动机器人

**Windows：**
```cmd
start-flashloan-bot.bat
```

**Linux/Mac：**
```bash
chmod +x start-flashloan-bot.sh
./start-flashloan-bot.sh
```

**或使用命令行：**
```bash
pnpm start:flashloan --config=configs/flashloan-serverchan.toml
```

---

## 📱 监控您的微信

机器人启动后，您会收到微信通知：

1. **💰 利润通知** - 套利成功
2. **❌ 错误告警** - 出现问题
3. **🚨 熔断通知** - 触发风险保护
4. **📊 定期统计** - 运行报告

---

## 🎯 从模拟到真实交易

### 模拟运行（观察1-2天）

```toml
[bot]
dry_run = true
```

**观察内容：**
- 是否发现套利机会？
- 利润计算是否合理？
- Server酱通知是否正常？

### 真实交易（谨慎开始）

```toml
[bot]
dry_run = false  # 改为 false

[flashloan.solend]
min_borrow_amount = 10_000_000_000  # 从 10 SOL 开始
```

**建议策略：**
- 第1周：10-50 SOL 借款
- 第2周：50-100 SOL 借款
- 第3周+：根据成功率调整

---

## 📊 预期表现

### 保守策略（10-50 SOL）
- 机会：5-10 个/小时
- 成功率：60-70%
- 单次利润：0.005-0.02 SOL
- **日收益：0.05-0.2 SOL（$10-$40）**

### 激进策略（100-500 SOL）
- 机会：3-8 个/小时
- 成功率：50-60%
- 单次利润：0.02-0.1 SOL
- **日收益：0.2-1 SOL（$40-$200）**

⚠️ **注意：实际收益取决于市场波动！**

---

## ⚠️ 重要提示

### 风险

1. **失败会损失 Gas 费**（约 0.0001-0.001 SOL/次）
2. **频繁失败会累积损失**（已有熔断保护）
3. **市场波动影响收益**

### 成本

```
总成本 = 闪电贷费用 + Gas费 + Jito小费

例：借 100 SOL
- 闪电贷费用：0.09 SOL（0.09%）
- Gas费：0.0001 SOL
- Jito小费：0.001-0.01 SOL
- 总成本：~0.1 SOL

必须确保利润 > 0.1 SOL 才划算
```

### 安全建议

- ✅ 先模拟运行1-2天
- ✅ 从小额开始（10 SOL）
- ✅ 设置每日损失上限
- ✅ 定期查看日志和通知
- ❌ 不要泄露钱包私钥
- ❌ 不要盲目增加借款金额

---

## 📁 重要文件位置

| 文件 | 用途 |
|------|------|
| `configs/flashloan-serverchan.toml` | 主配置文件 |
| `keypairs/flashloan-wallet.json` | 钱包私钥 |
| `mints-high-liquidity.txt` | 代币列表 |
| `logs/flashloan.log` | 运行日志 |
| `FLASHLOAN_START_GUIDE.md` | 详细指南 |

---

## 🆘 常见问题

### Q: 没有发现套利机会？

**A:** 
- 检查 RPC 是否可用（付费 RPC 更稳定）
- 市场波动小时机会少，耐心等待
- 降低利润阈值：`min_profit_lamports = 3_000_000`

### Q: 交易一直失败？

**A:**
- 提高滑点容忍度：`max_slippage = 0.02`
- 降低借款金额：`min_borrow_amount = 10_000_000_000`
- 确保 `check_jito_leader = true`

### Q: 如何停止机器人？

**A:**
- 按 `Ctrl + C` 在终端中停止
- 或直接关闭终端窗口

---

## 🎓 进阶阅读

- **完整指南**：`FLASHLOAN_START_GUIDE.md`
- **设计文档**：`sol设计文档_修正版_实战.md`
- **闪电贷原理**：`packages/core/src/flashloan/README.md`
- **Server酱配置**：`SERVER_CHAN_GUIDE.md`

---

## 🎉 准备好了吗？

```bash
# 1. 确保钱包有 0.1+ SOL
solana balance keypairs/flashloan-wallet.json

# 2. 安装依赖
pnpm install

# 3. 构建项目
pnpm build

# 4. 启动（模拟模式）
start-flashloan-bot.bat
```

**祝您套利顺利！💰**

---

## 📞 技术支持

如遇问题，请查看：
1. 日志文件：`logs/flashloan.log`
2. 错误信息：终端输出
3. 微信通知：Server酱告警

---

*最后更新：2025-10-20*

