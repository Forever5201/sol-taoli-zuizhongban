# 🧪 Ultra API 修复 - 手动测试指南

## ⚠️ 重要说明

由于 Windows PowerShell 的编码问题和后台进程管理的复杂性，**建议您在自己的终端中手动运行测试**。这样您可以：
- 看到完整的、正确编码的输出
- 实时观察日志
- 更容易 debug 问题

---

## 🚀 测试步骤（3个方法，选其一）

### 方法 1: 使用 PowerShell 脚本（最简单）

1. **打开 PowerShell**（在项目根目录）

2. **运行测试脚本**：
```powershell
.\test-ultra-simple.ps1
```

3. **观察输出**，等待看到：
   - Worker 启动日志
   - 机会发现日志  
   - **关键**：`Deserialized transactions` 或 `Extracted instructions`

---

### 方法 2: 直接使用 Node.js（推荐）

1. **打开命令提示符或 PowerShell**

2. **直接运行**：
```cmd
node packages\jupiter-bot\dist\flashloan-bot.js configs\flashloan-dryrun.toml
```

3. **等待 1-2 分钟**，让 bot 发现机会

---

### 方法 3: 使用批处理脚本

1. **双击运行**：`test-ultra-simple.bat`

2. **观察控制台输出**

---

## 👀 需要寻找的关键日志

### ✅ 成功的标志

当 bot 发现机会并尝试构建交易时，您应该看到：

```
🚀 Building from cached Ultra transaction - ZERO additional API calls
🚀 Deserializing transactions from Ultra API responses...
✅ Deserialized transactions: tx1=1 sigs, tx2=1 sigs
✅ Extracted 8 instructions from tx1
✅ Extracted 6 instructions from tx2
✅ Loaded 2 ALTs from chain
✅ Extracted 14 instructions with 2 ALTs in 45ms (quote_age=3ms)
```

然后是 RPC 模拟：
```
🔬 RPC Simulation Validation...
✅ RPC simulation passed! Compute units: 150000
```

最后是深度模拟（如果启用）：
```
🎁 SIMULATE_TO_BUNDLE: Successfully prepared Jito Bundle (2 transactions)
```

### ❌ 不应该看到的错误（已修复）

```
❌ [API_DEBUG] swap1Result status: 404
❌ Built 0 instructions with 0 ALTs
```

如果看到这些，说明修复没有生效。

---

## 🐛 如果遇到启动错误

### 错误 1: "Cannot find module"

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...
```

**原因**: TypeScript 路径解析问题

**解决**: 使用编译后的 JS 文件（方法 2）

### 错误 2: "Cannot find 'configs/flashloan-dryrun.toml'"

**解决**: 确保在项目根目录运行

### 错误 3: Bot 启动后立即退出

**可能原因**:
- 配置文件有问题
- 钱包文件不存在  
- RPC 连接失败

**检查**:
```powershell
# 检查配置文件
Test-Path configs/flashloan-dryrun.toml

# 检查钱包文件
Test-Path keypairs/flashloan-wallet.json
```

---

## 📝 收集测试结果

### 如果测试成功 ✅

请复制并发送：

1. **第一次看到机会时的完整日志**（从 "Building from cached" 开始）
2. **RPC 模拟结果**
3. **Bundle 构建结果**（如果有）

### 如果测试失败 ❌

请复制并发送：

1. **完整的错误信息**
2. **最后 50 行日志**
3. **Bot 在哪一步停止/崩溃**

---

## 💡 测试技巧

### 1. 减少等待时间

编辑 `configs/flashloan-dryrun.toml`，临时降低利润阈值：

```toml
min_profit_lamports = 50_000  # 从 500_000 降到 50_000
```

这样更容易找到测试机会（但不会真实执行）。

### 2. 启用详细日志

在运行命令前设置环境变量：

```powershell
$env:LOG_LEVEL="debug"
node packages\jupiter-bot\dist\flashloan-bot.js configs\flashloan-dryrun.toml
```

### 3. 保存日志到文件

```powershell
node packages\jupiter-bot\dist\flashloan-bot.js configs\flashloan-dryrun.toml 2>&1 | Tee-Object -FilePath test-output.log
```

然后查看文件：
```powershell
Get-Content test-output.log -Tail 100
```

---

## 🔍 快速验证修复是否生效

即使没有机会出现，您也可以验证代码是否正确：

### 检查编译后的代码

```powershell
# 搜索新的反序列化逻辑
Select-String -Path "packages\jupiter-bot\dist\flashloan-bot.js" -Pattern "Deserializing transactions|VersionedTransaction.deserialize" -Context 1,1
```

如果找到了这些字符串，说明新代码已经编译进去了。

### 检查是否还有旧的 API 调用

```powershell
# 搜索错误的 /swap-instructions 调用
Select-String -Path "packages\jupiter-bot\dist\flashloan-bot.js" -Pattern "/swap-instructions" -Context 2,2
```

应该找不到（或者只在注释中），说明旧代码已删除。

---

## 📞 需要帮助？

如果遇到任何问题，请提供：

1. **运行的具体命令**
2. **完整的错误信息**（截图或复制文本）
3. **是否看到 Worker 启动**（"Worker X started with..."）
4. **是否看到机会发现**（"🎯 Opportunity found"）

---

## ✅ 测试清单

- [ ] 能够成功启动 bot（看到 Worker 日志）
- [ ] 等待 1-2 分钟，让机会出现
- [ ] 看到 "Deserialized transactions" 日志
- [ ] 看到 "Extracted N instructions" 日志
- [ ] 看到 "RPC simulation passed" 或失败原因
- [ ] （可选）看到 "SIMULATE_TO_BUNDLE" 成功

完成这些步骤后，修复就验证成功了！ 🎉

---

## 🎯 期望的完整输出示例

```
Worker 1 started with 10 mints × 2 bridge tokens [USDC, USDT]
Worker 2 started with 10 mints × 2 bridge tokens [USDC, USDT]
...
🎯 Opportunity found: SOL → USDC → SOL
   Expected profit: 0.001234 SOL (ROI: 1.23%)
   
🚀 Starting parallel validation (stats) + build (execution)...
📦 Using cached Ultra transaction (age: 3ms, tx1_len=1824, tx2_len=1756)
🚀 Building from cached Ultra transaction - ZERO additional API calls

💰 Profit calculation: ...
💡 优先费策略: high, 费用: 0.000010 SOL
✅ 可执行机会 - 净利润: 0.001100 SOL

🚀 Deserializing transactions from Ultra API responses...
✅ Deserialized transactions: tx1=1 sigs, tx2=1 sigs
✅ Extracted 8 instructions from tx1
✅ Extracted 6 instructions from tx2
✅ Loaded 2 ALTs from chain
✅ Extracted 14 instructions with 2 ALTs in 45ms (quote_age=3ms)

🔬 RPC Simulation Validation...
✅ RPC simulation passed! Compute units: 150000
✅ Transaction built and signed successfully

🎁 SIMULATE_TO_BUNDLE: Successfully prepared Jito Bundle (2 transactions)
```

这就是修复成功的完整证明！ ✨

