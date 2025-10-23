# 📝 配置指南 - 快速开始

## ✅ 测试已完成

所有核心功能测试通过：
- ✅ 成本计算
- ✅ Jito小费优化
- ✅ 风险评估
- ✅ 执行模式对比

---

## 🚀 3步启动您的套利机器人

### 步骤1：配置文件 (my-bot-config.toml)

**已为您创建**：`my-bot-config.toml`

#### 必须修改的配置项：

```toml
[launcher]
acknowledge_terms_of_service = true  # ⚠️ 改为 true

[bot]
# 添加您的RPC端点（建议使用付费RPC）
rpc_endpoints = [
  "https://api.mainnet-beta.solana.com",
  "https://your-paid-rpc.com",  # 添加付费RPC
]

# 密钥路径
keypair_path = "./keypairs/test-wallet.json"  # ⚠️ 改为您的钱包路径

# 测试时建议先干运行
dry_run = true  # ⚠️ 测试阶段设为 true

[execution]
mode = "jito"  # 使用Jito模式（推荐）
jito_block_engine_url = "https://amsterdam.devnet.block-engine.jito.wtf"  # Devnet测试

[economics]
capital_size = "small"  # 测试阶段用 small
min_profit_lamports = 30_000  # 0.00003 SOL

[economics.jito_tip]
percentile = 50  # 测试阶段用保守策略
profit_ratio = 0.30
```

---

### 步骤2：创建测试钱包

#### 选项A：使用Solana CLI（推荐）

```bash
# 安装Solana CLI（如果没有）
# https://docs.solana.com/cli/install-solana-cli-tools

# 创建新钱包
solana-keygen new -o ./keypairs/test-wallet.json

# 获取Devnet测试币
solana airdrop 5 ./keypairs/test-wallet.json --url devnet

# 查看余额
solana balance ./keypairs/test-wallet.json --url devnet
```

#### 选项B：使用现有钱包

```bash
# 复制您的钱包文件到 keypairs 目录
mkdir keypairs
copy C:\path\to\your\wallet.json .\keypairs\test-wallet.json

# 或在配置中直接指定路径
keypair_path = "C:/Users/YourName/wallet.json"
```

---

### 步骤3：运行测试

#### 干运行模式（推荐先测试）

```bash
# 编辑配置，确保：
# dry_run = true
# jito_block_engine_url = "https://amsterdam.devnet.block-engine.jito.wtf"

# 运行
npm run start:onchain-bot -- --config my-bot-config.toml
```

**预期输出**：
```
🚀 Starting On-Chain Bot...
Execution mode: JITO
✅ Jito executor initialized

📊 Found 3 arbitrage opportunities
💰 SOL-USDC: Gross=0.000150 SOL, Net=0.000135 SOL, ROI=450.0%, Tip=0.000015 SOL
✅ Opportunity passed all checks
🧪 DRY RUN - Transaction not sent

========== 性能指标 ==========
扫描次数: 100
发现机会: 12
执行模式: JITO
Bundle成功率: N/A (dry run)
```

#### 真实运行（Devnet）

```bash
# 编辑配置，修改：
# dry_run = false

# 运行
npm run start:onchain-bot -- --config my-bot-config.toml
```

---

## 📋 配置检查清单

在运行前，确认以下项目：

### 必需配置
- [ ] `acknowledge_terms_of_service = true`
- [ ] RPC端点已配置（至少2个）
- [ ] 钱包文件路径正确
- [ ] 钱包有足够余额（测试至少2 SOL）

### Devnet测试配置
- [ ] `dry_run = true`（先干运行）
- [ ] `jito_block_engine_url` 使用Devnet URL
- [ ] `capital_size = "small"`
- [ ] `min_profit_lamports = 30000`

### Mainnet配置（生产环境）
- [ ] `dry_run = false`
- [ ] `jito_block_engine_url = "https://mainnet.block-engine.jito.wtf"`
- [ ] 使用付费高性能RPC
- [ ] 根据资金量调整 `capital_size`
- [ ] 设置合理的风险参数

---

## 🎯 关键配置说明

### 资金量级 (capital_size)

| 量级 | 资金范围 | 小费百分位 | 利润比例 | 适合场景 |
|------|---------|-----------|---------|---------|
| small | < 10 SOL | 50th | 30% | 测试/小额 |
| medium | 10-100 SOL | 75th | 40% | 日常运营 |
| large | > 100 SOL | 95th | 50% | 大额套利 |

### 最小利润门槛

```toml
min_profit_lamports = 30_000  # 0.00003 SOL

# 建议值：
# 测试：30,000 (0.00003 SOL)
# 生产：50,000 - 100,000 (0.00005 - 0.0001 SOL)
```

### RPC端点

**免费RPC**（仅测试）：
- `https://api.devnet.solana.com`（Devnet）
- `https://api.mainnet-beta.solana.com`（Mainnet，有限制）

**付费RPC**（生产推荐）：
- Helius: `https://rpc.helius.xyz`
- QuickNode: `https://your-endpoint.quiknode.pro`
- Triton: `https://your-endpoint.rpcpool.com`

---

## 🛡️ 安全提示

### ⚠️ 重要警告

1. **使用专用热钱包**
   - 不要使用主钱包
   - 只存放少量操作资金

2. **小额测试**
   - Devnet充分测试
   - Mainnet从1-2 SOL开始
   - 逐步扩大规模

3. **监控资金**
   - 定期检查余额
   - 及时转出利润
   - 设置告警

4. **保护私钥**
   - 不要分享私钥文件
   - 不要提交到Git
   - 考虑加密存储

---

## 📊 性能优化建议

### 初期（测试阶段）
```toml
[bot]
scan_interval_ms = 1000  # 1秒扫描一次

[economics]
min_profit_lamports = 50_000  # 设置较高门槛
capital_size = "small"

[execution]
min_tip_lamports = 10_000  # 降低成本
```

### 优化后（生产环境）
```toml
[bot]
scan_interval_ms = 100  # 100ms扫描

[economics]
min_profit_lamports = 30_000  # 降低门槛，增加机会
capital_size = "medium"

[execution]
min_tip_lamports = 10_000
max_tip_lamports = 50_000_000  # 允许更高小费
```

---

## 🔍 故障排查

### 问题1：找不到钱包文件
```
Error: Keypair file not found
```
**解决**：
```bash
# 检查文件路径
dir keypairs\test-wallet.json

# 使用绝对路径
keypair_path = "E:/path/to/wallet.json"
```

### 问题2：RPC连接失败
```
Error: Failed to connect to RPC
```
**解决**：
```toml
# 使用多个RPC端点
rpc_endpoints = [
  "https://api.devnet.solana.com",
  "https://api.mainnet-beta.solana.com",
]
```

### 问题3：Jito连接失败
```
Error: Jito Block Engine not responding
```
**解决**：
```toml
# 确认使用正确的URL
# Devnet:
jito_block_engine_url = "https://amsterdam.devnet.block-engine.jito.wtf"

# Mainnet:
jito_block_engine_url = "https://mainnet.block-engine.jito.wtf"

# 或暂时禁用领导者检查
check_jito_leader = false
```

---

## 📞 下一步支持

### 测试成功后

1. **查看监控数据**
   ```bash
   # 观察性能指标
   # 每60秒输出一次统计
   ```

2. **调优参数**
   - 根据成功率调整小费策略
   - 根据机会数量调整利润门槛
   - 根据资金情况调整交易金额

3. **扩大规模**
   - 从小额开始
   - 观察几天数据
   - 逐步增加资金

### 需要帮助？

查看文档：
- `README.md` - 项目总览
- `JITO_INTEGRATION.md` - Jito详细指南
- `ENVIRONMENT_SETUP.md` - 环境问题

---

## ✅ 检查清单

启动前最后检查：

**环境**
- [ ] Node.js 20+ 已安装
- [ ] 依赖全部安装
- [ ] 测试脚本通过

**配置**
- [ ] 配置文件已创建
- [ ] 关键参数已修改
- [ ] RPC端点已设置
- [ ] 钱包路径正确

**安全**
- [ ] 使用测试钱包
- [ ] 设置为干运行模式
- [ ] 私钥未泄露

**测试**
- [ ] Devnet有测试币
- [ ] 干运行测试通过
- [ ] 监控正常显示

---

**准备好了？运行命令：**

```bash
npm run start:onchain-bot -- --config my-bot-config.toml
```

🚀 **祝您套利成功！**
