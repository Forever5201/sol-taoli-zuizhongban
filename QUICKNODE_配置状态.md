# 🔍 QuickNode 配置当前状态

**测试时间**: 2025-10-28 12:43  
**测试结果**: 2/5 端点成功 ✅

---

## 📊 测试结果摘要

| 端点 | 状态 | 延迟 | 说明 |
|------|------|------|------|
| **Helius 账号1** | ✅ 正常 | 1339ms | 可用 |
| **Helius 账号2** | ✅ 正常 | 1227ms | 可用（最快） |
| **QuickNode** | ❌ 401 错误 | - | **需要更新 URL** |
| **Ankr 公共** | ❌ 403 错误 | - | API key 问题 |
| **Solana 官方** | ❌ 连接失败 | - | 网络问题 |

---

## 🎯 QuickNode 配置步骤（必做！）

您的 QuickNode API Key: `QN_e8ae6d6aa11f486895510c87b2178516`

### Step 1: 获取完整 URL

1. **登录 QuickNode**:  
   https://www.quicknode.com/endpoints

2. **找到您的 Solana Mainnet 端点**:
   - 在 Dashboard 中查找 "Solana" 端点
   - 确认网络是 "Mainnet" 或 "mainnet-beta"

3. **复制 HTTP Provider URL**:
   ```
   示例格式（您的会不同）：
   https://ancient-quiet-surf.solana-mainnet.quiknode.pro/abc123def456/
   https://your-name-123.solana-mainnet.quiknode.pro/token123/
   ```

### Step 2: 更新配置文件

打开文件: `packages/onchain-bot/config.quicknode.toml`

找到第 12-18 行，将第一个 URL 替换：

**当前配置（需要修改）**:
```toml
urls = [
  "https://your-endpoint.solana-mainnet.quiknode.pro/QN_e8ae6d6aa11f486895510c87b2178516/",
  # ... 其他
]
```

**修改为（使用您从控制台复制的完整 URL）**:
```toml
urls = [
  "您从QuickNode控制台复制的完整URL",  # 🔥 替换这里
  "https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683",
  "https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65"
]
```

### Step 3: 重新测试

保存配置后，再次运行测试：

```bash
pnpm tsx packages/onchain-bot/test-quicknode-connection.ts
```

---

## ⚠️ 当前可用的配置

即使 QuickNode 暂时未配置，您也可以使用现有的 Helius 端点：

### 临时配置（立即可用）

```toml
[rpc]
urls = [
  # 使用两个 Helius 账号（总计 20 RPS）
  "https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683",
  "https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65"
]

# 速率限制调整（适配 20 RPS）
min_time = 120        # 120ms 间隔
max_concurrent = 5    # 最大并发 5

[markets]
scan_interval_ms = 300  # 每 300ms 扫描一次
```

这个配置可以让您：
- ✅ 立即开始测试
- ✅ 每秒约 6-8 次 RPC 请求（低于 20 RPS 限制）
- ✅ 等您配置好 QuickNode 后再升级性能

---

## 🔧 QuickNode URL 格式说明

### ✅ 正确格式示例

```
https://ancient-quiet-surf.solana-mainnet.quiknode.pro/abc123def456/
https://some-words-here.solana-mainnet.quiknode.pro/token/
https://endpoint-123.quiknode.pro/QN_xxxxx/
```

### ❌ 错误格式（会导致 401）

```
https://your-endpoint.solana-mainnet.quiknode.pro/QN_e8ae6d6aa11f486895510c87b2178516/
（这只是占位符，不是真实 URL）
```

### 🔍 如何判断 URL 正确？

正确的 QuickNode URL 应该：
1. ✅ 包含唯一的端点名称（如 `ancient-quiet-surf`）
2. ✅ 包含 `solana-mainnet` 或 `solana/mainnet`
3. ✅ 包含您的唯一 token（通常是长字符串）
4. ✅ 以 `/` 结尾

---

## 📝 快速命令参考

### 测试连接
```bash
pnpm tsx packages/onchain-bot/test-quicknode-connection.ts
```

### 测试市场扫描器
```bash
pnpm tsx packages/onchain-bot/src/test-market-scanner-fix.ts
```

### 查看配置文件
```bash
# Windows
notepad packages/onchain-bot/config.quicknode.toml

# 或使用 VSCode
code packages/onchain-bot/config.quicknode.toml
```

---

## 🎯 下一步行动计划

### 立即执行（5 分钟）

1. [ ] 登录 QuickNode 控制台
2. [ ] 复制 Solana Mainnet 的 HTTP Provider URL
3. [ ] 更新 `config.quicknode.toml` 的第一个 URL
4. [ ] 重新运行测试脚本

### 配置完成后

1. [ ] 确认 QuickNode 测试通过（延迟 < 200ms）
2. [ ] 运行市场扫描器测试
3. [ ] 开始套利机器人测试

---

## 💡 小贴士

1. **QuickNode 没有端点？**  
   - 点击 "Create Endpoint"
   - 选择 Solana → Mainnet
   - 免费套餐即可（1000万请求/月）

2. **忘记端点 URL？**  
   - Dashboard → Endpoints → 点击您的 Solana 端点
   - 查看 "HTTP Provider" 部分

3. **验证 URL 是否正确？**  
   - 在浏览器中访问：`您的URL`
   - 应该看到类似 `{"jsonrpc":"2.0",...}` 的响应

---

## 📞 需要帮助？

如果遇到问题：
- 查看 `QUICKNODE_SETUP_GUIDE.md` 完整指南
- 检查 QuickNode 控制台的端点状态
- 确认网络选择是 "Mainnet" 而非 "Testnet"

**文件位置**：
- 配置文件: `packages/onchain-bot/config.quicknode.toml`
- 测试脚本: `packages/onchain-bot/test-quicknode-connection.ts`
- 完整指南: `QUICKNODE_SETUP_GUIDE.md`

