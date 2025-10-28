# 🚀 本地 Jupiter API + 免费 RPC 完整指南

**目标**：在免费 RPC 限制下成功启动本地 Jupiter API

**您的硬件**：i7-11700K (8C/16T), 16GB RAM, 1.9TB 磁盘  
**评估**：❌ 无法运行完整 Solana 节点，但 ✅ 可以运行 Jupiter API

---

## 📋 **方案对比**

| 方案 | 成功率 | 启动时间 | RPC成本 | 说明 |
|------|--------|---------|---------|------|
| **方案A** | 30-40% | 20-40分钟 | $0 | 极保守启动（免费Helius） |
| **方案B** | 95%+ | 3-5分钟 | $79/月 | 付费Helius Developer |
| **方案C** | 100% | 即时 | $0 | 远程Ultra API（无需本地API） |

---

## 🎯 **方案 A：极保守启动策略（免费）**

### **前提条件**：

1. ✅ 至少 **24 小时**没有尝试启动 Jupiter API
   - 原因：Helius 配额需要恢复
   - 检查：查看您最后一次尝试的时间

2. ✅ Clash TUN 模式已启用且运行正常
   - 检查：`curl --proxy http://127.0.0.1:7890 https://www.google.com`

3. ✅ Proxychains 已配置
   - 检查：`wsl ls -la /tmp/proxychains-jupiter.conf`

---

### **执行步骤**：

#### **Step 1：进入 WSL**

```bash
wsl
cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol
```

#### **Step 2：确认 Proxychains 配置**

```bash
# 如果没有配置过，运行：
./setup-proxychains.sh
```

#### **Step 3：启动 Jupiter API（极保守模式）**

```bash
chmod +x start-jupiter-ultra-conservative.sh
./start-jupiter-ultra-conservative.sh
```

#### **Step 4：耐心等待（20-40 分钟）**

**预期日志序列**：

```
[INFO] Fetching markets from europa server...   ← 10-15秒
[INFO] Fetched 836,073 markets                   ← 即时
[INFO] Initializing router...                    ← 20-30分钟 ⚠️ 关键阶段
  ↓ 内部正在做什么：
  - 查询每个市场的链上账户状态
  - 使用单线程，速度极慢但不会触发 429
  - 如果看到 429 错误 → 立即停止，等待 24 小时
[INFO] Loaded XXXXX markets into router          ← 成功！
[INFO] Server listening on http://0.0.0.0:8080   ← 成功！
```

#### **Step 5：验证 API 可用**

在**另一个 PowerShell 窗口**运行：

```powershell
# Windows PowerShell
cd E:\6666666666666666666666666666\dex-cex\dex-sol
pnpm tsx test-local-jupiter-api.ts
```

预期输出：

```
✅ Health check passed (2ms)
✅ Quote received (4ms) 🔥 EXCELLENT
   Input: 1 SOL
   Output: 185.23 USDC
```

---

### **失败处理**：

如果看到 `429 Too Many Requests`：

1. **立即停止**（Ctrl+C）
2. **不要重试**！
3. **等待 24 小时**
4. 或考虑升级到付费 RPC

---

## 🎯 **方案 B：升级到付费 Helius（推荐）**

### **为什么推荐？**

```
成本：$79/月 ≈ $2.6/天

如果每天套利收益 >$10：
  → ROI = 285%
  → 绝对值得！

如果每天套利收益 <$5：
  → 暂时不值得
  → 先用远程 API 测试
```

### **付费后的优势**：

```
Helius Developer Plan:
✅ 50M 请求/月（vs 免费 100K）
✅ 高并发限制（100+ vs 5-10）
✅ 无突发限制
✅ 优先级队列
✅ 启动时间：3-5 分钟（vs 20-40 分钟）
✅ 可随时重启
```

### **如何升级**：

1. 访问：https://www.helius.dev/pricing
2. 选择 **Developer Plan** ($79/月)
3. 获取新的 API Key
4. 替换 `start-jupiter-ultra-conservative.sh` 中的 API Key

---

## 🎯 **方案 C：先用远程 API 测试（零风险）**

### **为什么这是最理性的选择？**

```
问题：值得花 $79/月 优化吗？
答案：需要数据支持！

理性流程：
1. 用远程 API 测试 1-3 天
2. 收集数据：
   - 每小时机会数：____ 个
   - 捕获率：____ %
   - 平均利润：____ SOL
   - 日收益：____ $
3. 计算 ROI：
   - 如果优化后收益提升 >$10/天
     → 升级付费 RPC
   - 如果收益提升 <$5/天
     → 继续免费方案
```

### **如何使用远程 API**：

```powershell
# 在 PowerShell 中
cd E:\6666666666666666666666666666\dex-cex\dex-sol

# 配置使用远程 API
$env:USE_LOCAL_JUPITER_API="false"

# 启动 Bot
pnpm start:flashloan
```

**优点**：
- ✅ 零成本
- ✅ 立即开始
- ✅ 验证系统功能
- ✅ 收集真实数据
- ✅ 完全支持闪电贷

**缺点**：
- ⚠️ 延迟 ~150ms（vs 本地 <5ms）
- ⚠️ 可能错过部分快速消失的机会

---

## 📊 **决策矩阵**

### **如果您想立即测试系统**：
→ **方案 C**（远程 API）

### **如果您已经测试过，想优化性能**：
→ **方案 B**（付费 RPC）

### **如果您想免费尝试本地 API**：
→ **方案 A**（极保守启动）
   - ⚠️ 但请确保等待 24 小时
   - ⚠️ 成功率只有 30-40%

---

## 🎯 **我的专业建议**

基于您的情况（硬件限制 + 免费 RPC），我强烈建议：

```
第 1 周：
  使用远程 API（方案 C）
    ↓
  目标：验证系统 + 收集数据
    ↓
  成本：$0
  风险：零

第 2 周：
  根据第 1 周数据决策
    ↓
  如果日收益 >$10：升级付费 RPC（方案 B）
  如果日收益 <$5：继续远程 API（方案 C）
```

**原因**：
1. 避免盲目投入（$79/月）
2. 用真实数据驱动决策
3. 降低试错成本

---

## 🚀 **立即行动**

### **选择方案 C（推荐）**：

```powershell
# 在 PowerShell 中运行
cd E:\6666666666666666666666666666\dex-cex\dex-sol
$env:USE_LOCAL_JUPITER_API="false"
pnpm start:flashloan
```

### **或选择方案 A（激进）**：

```bash
# 在 WSL 中运行
wsl
cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol
./start-jupiter-ultra-conservative.sh
```

---

## 📞 **需要帮助？**

如果遇到问题，提供以下信息：
1. 选择的方案
2. 错误日志
3. 最后一次尝试启动的时间

---

**祝您套利成功！** 🎯

