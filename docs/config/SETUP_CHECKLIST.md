# ✅ 闪电贷套利配置清单

**完成以下步骤即可开始赚钱！**

---

## 📋 配置清单

### ✅ **基础配置**（必需）

- [ ] **1. 创建配置文件**
  ```bash
  # 使用闪电贷配置
  copy .env.flashloan .env
  ```

- [ ] **2. 创建钱包**
  ```bash
  # 创建专用钱包
  solana-keygen new -o keypairs/flashloan-wallet.json
  
  # 记录钱包地址
  solana-keygen pubkey keypairs/flashloan-wallet.json
  
  # ⚠️ 重要：备份助记词！
  ```

- [ ] **3. 充值钱包**（最少 0.1 SOL）
  ```
  从交易所转账到钱包地址
  最少: 0.1 SOL ($15) - 用于 Gas
  推荐: 0.5 SOL ($75) - 更安全
  ```

- [ ] **4. 验证余额**
  ```bash
  solana balance --keypair keypairs/flashloan-wallet.json
  
  # 应该显示 > 0.1 SOL
  ```

---

### ⚙️ **RPC 配置**（强烈推荐）

- [ ] **5. 获取付费 RPC**
  ```
  推荐服务商：
  □ QuickNode: https://www.quicknode.com/
  □ Helius: https://www.helius.dev/
  □ Alchemy: https://www.alchemy.com/
  
  免费 RPC 性能有限，可能导致：
  - 响应慢
  - 请求失败
  - 错过套利机会
  ```

- [ ] **6. 配置 RPC**
  ```bash
  # 编辑 .env 文件
  SOLANA_RPC_URL=你的RPC地址
  ```

---

### 🔧 **闪电贷配置**（推荐）

- [ ] **7. 设置借款限额**
  ```bash
  # 编辑 .env 文件
  
  # 新手建议（稳健）
  MAX_FLASHLOAN_AMOUNT=20000000000  # 20 SOL
  MIN_PROFIT_AFTER_FEES=500000000   # 0.5 SOL
  
  # 进阶建议（平衡）
  MAX_FLASHLOAN_AMOUNT=100000000000  # 100 SOL
  MIN_PROFIT_AFTER_FEES=500000000    # 0.5 SOL
  
  # 专家建议（激进）
  MAX_FLASHLOAN_AMOUNT=200000000000  # 200 SOL
  MIN_PROFIT_AFTER_FEES=1000000000   # 1 SOL
  ```

- [ ] **8. 启用 Jito（可选但推荐）**
  ```bash
  # 编辑 .env 文件
  JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
  JITO_TIP_AMOUNT=5000  # 0.000005 SOL
  ```

---

### 🧪 **测试验证**（必需）

- [ ] **9. 运行闪电贷演示**
  ```bash
  scripts\flashloan-demo.bat
  
  # 或
  pnpm tsx packages/core/src/flashloan/example.ts
  ```
  
  **预期输出**：
  ```
  ✅ 闪电贷可行性验证通过
  ✅ 最优借款策略计算正确
  ✅ 成本估算准确
  ✅ 风险评估通过
  ```

- [ ] **10. 运行成本模拟**
  ```bash
  pnpm cost-sim
  ```
  
  **预期输出**：
  ```
  ✅ Jito 小费获取成功
  ✅ 成本计算准确
  ✅ 盈亏平衡点明确
  ```

- [ ] **11. 运行所有测试**
  ```bash
  pnpm test
  ```
  
  **预期结果**：
  ```
  ✅ Test Suites: 13 passed
  ✅ Tests: 157 passed
  ```

---

## 🚀 启动检查

### **启动前最后检查**

- [ ] **配置文件就绪**
  ```bash
  # 检查配置
  type .env | findstr "ENABLE_FLASHLOAN"
  # 应显示: ENABLE_FLASHLOAN=true
  
  type .env | findstr "SOLANA_RPC_URL"
  # 应显示你的 RPC 地址
  ```

- [ ] **钱包余额充足**
  ```bash
  solana balance --keypair keypairs/flashloan-wallet.json
  # 应显示 >= 0.1 SOL
  ```

- [ ] **依赖已安装**
  ```bash
  pnpm install
  ```

- [ ] **项目已构建**
  ```bash
  pnpm build
  ```

---

## 🎯 启动机器人

### **方法 1：直接启动**

```bash
# 启动闪电贷套利机器人
pnpm start:onchain-bot

# 观察日志
[INFO] 🤖 Solana Arbitrage Bot Starting...
[INFO] 📡 Connected to Mainnet
[INFO] 💰 Wallet Balance: 0.50 SOL
[INFO] ⚡ FlashLoan Enabled (Max: 100 SOL)
[INFO] 🔍 Scanning markets...
```

### **方法 2：使用配置文件**

```bash
# 创建启动脚本
echo @echo off > start-flashloan.bat
echo pnpm start:onchain-bot >> start-flashloan.bat

# 运行
start-flashloan.bat
```

### **方法 3：后台运行**

```bash
# 使用 PM2（需要先安装）
npm install -g pm2

# 启动
pm2 start "pnpm start:onchain-bot" --name "flashloan-bot"

# 查看日志
pm2 logs flashloan-bot

# 查看状态
pm2 status

# 停止
pm2 stop flashloan-bot
```

---

## 📊 监控指标

### **启动后应该看到**

```
✅ 机器人成功连接
✅ 钱包余额正确显示
✅ 闪电贷已启用
✅ 开始扫描市场
✅ 发现套利机会
✅ 执行交易
```

### **关键日志示例**

```
[INFO] 💎 FlashLoan Opportunity Found!
[INFO]    Pool A: Raydium SOL/USDC (100 → 10,000)
[INFO]    Pool B: Orca USDC/SOL (10,000 → 103)
[INFO]    Price Spread: 3.0%
[INFO]    Borrow Amount: 100 SOL
[INFO]    Expected Profit: 3 SOL
[INFO]    FlashLoan Fee: 0.09 SOL
[INFO]    Net Profit: 2.91 SOL
[INFO] 🔄 Building FlashLoan Transaction...
[INFO] ✅ Transaction Success!
[INFO]    Signature: 5xK7m9...
[INFO]    Actual Profit: 2.88 SOL
```

---

## ⚠️ 常见问题

### **问题 1：无法连接 RPC**
```
错误: RPC request failed
解决: 检查 RPC 地址是否正确，尝试使用付费 RPC
```

### **问题 2：余额不足**
```
错误: Insufficient funds
解决: 充值至少 0.1 SOL 到钱包
```

### **问题 3：找不到钱包**
```
错误: Keypair file not found
解决: 检查 DEFAULT_KEYPAIR_PATH 配置是否正确
```

### **问题 4：没有发现套利机会**
```
情况: 长时间没有交易
原因: 市场平静或配置过于严格
解决: 
  - 降低 MIN_PROFIT_AFTER_FEES
  - 降低 MIN_PRICE_SPREAD
  - 等待市场波动
```

### **问题 5：交易失败**
```
情况: 交易构建成功但执行失败
原因: 
  - 网络拥堵
  - 滑点过大
  - 闪电贷池子流动性不足
解决:
  - 提高 JITO_TIP_AMOUNT
  - 增加 MAX_SLIPPAGE
  - 减少 MAX_FLASHLOAN_AMOUNT
```

---

## 🎓 优化建议

### **性能优化**

1. **使用优质 RPC**
   - QuickNode（推荐）
   - Helius（推荐）
   - 多个 RPC 作为备份

2. **启用 Jito Bundle**
   - 提高交易上链速度
   - 增加成功率
   - 小费设置在 5000-10000

3. **调整计算单元**
   ```bash
   COMPUTE_UNIT_LIMIT=1400000
   COMPUTE_UNIT_PRICE=5000
   ```

### **策略优化**

1. **动态借款金额**
   - 根据价差大小调整
   - 3%+ 价差 → 借 200 SOL
   - 1-3% 价差 → 借 100 SOL
   - 0.5-1% 价差 → 借 50 SOL

2. **多路径套利**
   - 同时监控多个 DEX
   - 寻找三角套利机会
   - 利用 Jupiter 聚合

3. **时间优化**
   - 市场活跃时段运行
   - 避开维护时间
   - 波动大时机会多

---

## 🎊 完成！

**恭喜您完成所有配置！**

现在可以：
```bash
# 启动机器人
pnpm start:onchain-bot

# 开始赚钱！💰
```

**记住**：
- ✅ 从小额开始（借 20-50 SOL）
- ✅ 监控前 24 小时
- ✅ 根据数据优化参数
- ✅ 逐步放大规模

**祝套利成功！** 🚀💰
