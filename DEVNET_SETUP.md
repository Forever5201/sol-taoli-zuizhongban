# 🧪 Devnet 测试环境设置指南

## 📋 前置要求

- ✅ Node.js 18+ 和 pnpm 已安装
- ✅ 所有依赖已安装（`pnpm install`）
- ✅ 所有测试通过（`pnpm test`）
- ✅ Solana CLI 已安装（可选，但推荐）

---

## 🚀 快速开始（5 分钟）

### **选项 A: 使用现有 Devnet 钱包**

如果 `keypairs/devnet-test-wallet.json` 已存在：

```bash
# Windows
scripts\deploy-devnet.bat

# Linux/Mac
chmod +x scripts/deploy-devnet.sh
./scripts/deploy-devnet.sh
```

### **选项 B: 创建新的 Devnet 钱包**

#### 步骤 1: 安装 Solana CLI（如果还没有）

```bash
# Windows (PowerShell)
cmd /c "curl https://release.solana.com/v1.17.0/solana-install-init-x86_64-pc-windows-msvc.exe --output solana-install.exe"
.\solana-install.exe

# Linux/Mac
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
```

#### 步骤 2: 创建 Devnet 钱包

```bash
# 创建新钱包
solana-keygen new -o keypairs/devnet-test-wallet.json

# 记录并安全保存助记词！
```

#### 步骤 3: 获取 Devnet SOL（免费测试代币）

```bash
# 方法 1: 使用 Solana CLI（推荐）
solana airdrop 2 --url devnet --keypair keypairs/devnet-test-wallet.json

# 方法 2: 使用 Solana Faucet 网页
# 访问: https://faucet.solana.com/
# 粘贴你的钱包地址并请求 SOL
```

#### 步骤 4: 验证余额

```bash
solana balance --url devnet --keypair keypairs/devnet-test-wallet.json

# 应该显示 ~2 SOL
```

---

## 🧪 运行测试

### **快速功能测试**（推荐先运行）

```bash
# Windows
scripts\quick-devnet-test.bat

# Linux/Mac
./scripts/quick-devnet-test.sh
```

这会运行：
1. ✅ 经济模型演示（无需链上交互）
2. ✅ Jupiter Swap 测试（可能需要 RPC）
3. ✅ 成本模拟器

### **完整 Devnet 部署**

```bash
# Windows
scripts\deploy-devnet.bat

# Linux/Mac
./scripts/deploy-devnet.sh
```

---

## 📊 监控和验证

### **查看实时日志**

机器人启动后会显示：
- 🔍 扫描的池子数量
- 💰 发现的套利机会
- 📈 预期利润
- ⚡ 交易执行状态
- 🛡️ 熔断器状态

### **检查交易**

```bash
# 查看最近交易
solana transaction-history --url devnet --keypair keypairs/devnet-test-wallet.json

# 在 Solana Explorer 查看
# https://explorer.solana.com/?cluster=devnet
```

---

## ⚙️ 配置调整

编辑 `.env.devnet` 来调整参数：

```bash
# 日志级别（debug 可以看到更多细节）
LOG_LEVEL=debug

# 最大交易金额（Devnet 可以设大一些）
MAX_TRANSACTION_AMOUNT=1000000000  # 1 SOL

# 最小余额
MIN_WALLET_BALANCE=0.1
```

---

## 🎯 预期行为

### **在 Devnet 上，你应该看到：**

✅ **机器人启动成功**
```
[INFO] 🤖 Solana Arbitrage Bot Starting...
[INFO] 📡 Connected to Devnet
[INFO] 💰 Wallet Balance: 2.00 SOL
[INFO] 🔍 Scanning markets...
```

✅ **发现套利机会**（Devnet 上可能较少）
```
[INFO] 💎 Opportunity Found!
[INFO]    Pool A: SOL/USDC (Raydium)
[INFO]    Pool B: SOL/USDC (Orca)
[INFO]    Price Diff: 0.8%
[INFO]    Expected Profit: $12.50
```

⚠️ **可能的警告**（正常现象）
```
[WARN] 📊 Low liquidity in pool XYZ
[WARN] ⏱️ High network latency (Devnet)
[WARN] 🔄 Waiting for confirmation...
```

❌ **常见错误和解决方案**

| 错误 | 原因 | 解决方案 |
|-----|------|---------|
| "Insufficient funds" | 余额不足 | 执行 `solana airdrop 2 --url devnet` |
| "RPC request failed" | RPC 连接问题 | 等待几秒后重试 |
| "Transaction timeout" | Devnet 拥堵 | 正常现象，会自动重试 |
| "No opportunities" | Devnet 流动性低 | 正常，Devnet 活动较少 |

---

## 🔧 高级配置

### **使用自定义 RPC**

如果公共 Devnet RPC 太慢，可以使用付费服务：

```bash
# .env.devnet
SOLANA_RPC_URL=https://your-devnet-rpc.com
```

推荐 RPC 提供商：
- QuickNode (https://www.quicknode.com/)
- Alchemy (https://www.alchemy.com/)
- Helius (https://www.helius.dev/)

### **调试模式**

启用更详细的日志：

```bash
# .env.devnet
LOG_LEVEL=debug
VERBOSE=true
```

### **干运行模式**（只模拟，不实际交易）

```bash
# .env.devnet
DRY_RUN=true
```

---

## 📈 性能测试

### **基准测试**

```bash
pnpm test:benchmark
```

### **压力测试**

```bash
pnpm test:stress
```

---

## 🛡️ 安全提示

### **Devnet 最佳实践**

1. ✅ **永远不要**在 Devnet 使用主网钱包
2. ✅ **永远不要**在配置文件中明文存储私钥
3. ✅ **定期备份**测试钱包的助记词
4. ✅ **限制测试金额**（即使是免费的 Devnet SOL）
5. ✅ **监控日志**了解系统行为

### **从 Devnet 到主网的迁移清单**

- [ ] 验证所有功能在 Devnet 正常工作
- [ ] 分析至少 24 小时的 Devnet 运行数据
- [ ] 确认没有频繁的错误或异常
- [ ] 理解成本结构（gas fees, Jito tips）
- [ ] 准备主网钱包（**不要重用 Devnet 钱包！**）
- [ ] 从小额开始（0.1 SOL）
- [ ] 设置告警和监控
- [ ] 准备紧急停止程序

---

## 🆘 故障排除

### **机器人无法启动**

```bash
# 1. 检查依赖
pnpm install

# 2. 重新构建
pnpm build

# 3. 检查钱包
solana-keygen verify keypairs/devnet-test-wallet.json

# 4. 检查网络连接
curl https://api.devnet.solana.com -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

### **没有发现套利机会**

这在 Devnet 上是**正常**的，因为：
- Devnet 流动性低
- Devnet 用户活动少
- 很少有真实的套利机会

解决方案：
- 运行更长时间（至少 30 分钟）
- 调整最小利润阈值（降低门槛）
- 或者直接跳过 Devnet，在主网用小额测试

### **获取更多帮助**

- 📚 查看文档: `docs/`
- 🐛 报告问题: GitHub Issues
- 💬 社区支持: Discord/Telegram

---

## ✅ 成功标准

在部署到主网前，确保在 Devnet 上：

1. ✅ 机器人可以稳定运行 1+ 小时无崩溃
2. ✅ 能够正确识别套利机会（即使很少）
3. ✅ 交易构建和签名正常
4. ✅ 熔断器在异常情况下正常工作
5. ✅ 日志清晰易懂
6. ✅ 性能指标在合理范围内

---

## 🎓 学习资源

- [Solana 开发文档](https://docs.solana.com/)
- [Jupiter 聚合器文档](https://docs.jup.ag/)
- [Raydium 文档](https://docs.raydium.io/)
- [AMM 原理讲解](https://docs.uniswap.org/protocol/V2/concepts/protocol-overview/how-uniswap-works)

---

**祝测试顺利！如有问题，请查看日志或联系支持。** 🚀
