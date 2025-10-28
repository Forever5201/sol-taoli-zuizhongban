# 🚀 QuickNode Solana Mainnet 配置完全指南

## 📋 目录

1. [获取 QuickNode 端点 URL](#1-获取-quicknode-端点-url)
2. [更新配置文件](#2-更新配置文件)
3. [测试连接](#3-测试连接)
4. [运行市场扫描器](#4-运行市场扫描器)
5. [常见问题](#5-常见问题)

---

## 1. 获取 QuickNode 端点 URL

### 步骤 1：登录 QuickNode

访问：https://www.quicknode.com/endpoints

### 步骤 2：找到 Solana Mainnet 端点

在您的 Dashboard 中：
- 查找 **Solana Mainnet** 或 **Solana mainnet-beta** 端点
- 如果没有，点击 **"Create Endpoint"** 创建一个

### 步骤 3：复制 HTTP Provider URL

在端点详情页面，您会看到类似这样的信息：

```
Network: Solana Mainnet

HTTP Provider:
https://xxx-xxx-xxx.solana-mainnet.quiknode.pro/YOUR-TOKEN/

WebSocket Provider:
wss://xxx-xxx-xxx.solana-mainnet.quiknode.pro/YOUR-TOKEN/
```

**复制 HTTP Provider 的完整 URL！**

### 📸 参考截图

您的端点 URL 可能是以下格式之一：

```
格式 1（推荐）:
https://ancient-quiet-surf.solana-mainnet.quiknode.pro/abc123def456/

格式 2:
https://your-endpoint.quiknode.pro/QN_e8ae6d6aa11f486895510c87b2178516/

格式 3:
https://rpc.quicknode.pro/v1/solana/mainnet/QN_e8ae6d6aa11f486895510c87b2178516/
```

---

## 2. 更新配置文件

### 方法 1：使用新配置文件（推荐）

打开 `packages/onchain-bot/config.quicknode.toml`，找到第 12 行：

```toml
[rpc]
urls = [
  # 🔥 将下面这行替换为您的完整 QuickNode URL
  "https://your-endpoint.solana-mainnet.quiknode.pro/QN_e8ae6d6aa11f486895510c87b2178516/",
  
  # 其他端点保持不变
  "https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683",
  "https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65",
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com"
]
```

**替换示例**：

假设您从 QuickNode 复制的 URL 是：
```
https://ancient-quiet-surf.solana-mainnet.quiknode.pro/abc123def456/
```

那么配置应该改为：
```toml
urls = [
  "https://ancient-quiet-surf.solana-mainnet.quiknode.pro/abc123def456/",
  "https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683",
  # ... 其他端点
]
```

### 方法 2：更新现有配置

如果您想更新 `config.example.toml`：

```toml
[rpc]
urls = [
  "您的QuickNode完整URL",
  "https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683",
  "https://mainnet.helius-rpc.com/?api-key=7df840f7-134f-4b6a-91fb-a4515a5f3f65",
  "https://rpc.ankr.com/solana"
]
```

---

## 3. 测试连接

运行测试脚本验证所有 RPC 端点：

```bash
# 从项目根目录运行
cd E:\6666666666666666666666666666\dex-cex\dex-sol

# 运行 QuickNode 连接测试
pnpm tsx packages/onchain-bot/test-quicknode-connection.ts
```

### 预期输出

✅ **成功示例**：
```
=======================================================================
🔬 QuickNode 和多 RPC 端点连接测试
=======================================================================

⏳ 正在测试所有端点...

✅ QuickNode (请更新URL): OK (85ms) - Slot: 123456789, Version: 1.18.15
✅ Helius 账号1: OK (120ms) - Slot: 123456790, Version: 1.18.15
✅ Helius 账号2: OK (125ms) - Slot: 123456788, Version: 1.18.15
✅ Ankr 公共: OK (200ms) - Slot: 123456787, Version: 1.18.14

=======================================================================
📊 测试结果汇总
=======================================================================

总端点数: 5
✅ 成功: 4
❌ 失败: 1

🏆 延迟排名（越低越好）：

🥇 1. QuickNode: 85ms
🥈 2. Helius 账号1: 120ms
🥉 3. Helius 账号2: 125ms
   4. Ankr 公共: 200ms
```

❌ **失败示例**（需要修复）：
```
❌ QuickNode (请更新URL): Failed to fetch
⚠️  需要从 QuickNode 控制台获取完整 URL

⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

📢 QuickNode 配置提示：

您的 QuickNode 端点需要更新！请按以下步骤操作：

1. 访问 QuickNode 控制台: https://www.quicknode.com/endpoints
2. 选择您的 Solana Mainnet 端点
3. 复制 "HTTP Provider" 完整 URL
4. 更新配置文件: packages/onchain-bot/config.quicknode.toml
```

---

## 4. 运行市场扫描器

确认连接成功后，测试市场扫描器：

```bash
# 使用 QuickNode 配置运行市场扫描器
pnpm tsx packages/onchain-bot/src/test-market-scanner-fix.ts
```

如果您想使用 `config.quicknode.toml`，需要修改测试脚本中的配置路径。

---

## 5. 常见问题

### Q1: 我找不到 QuickNode 端点 URL

**答**：登录 https://www.quicknode.com/endpoints，如果没有端点：
1. 点击 "Create Endpoint"
2. 选择 "Solana"
3. 选择 "Mainnet"
4. 选择免费套餐
5. 创建后复制 HTTP Provider URL

### Q2: URL 格式不确定

**答**：QuickNode URL 必须包含：
- `solana-mainnet` 或 `solana/mainnet`
- 您的唯一 token 或 API key
- 以 `/` 结尾（建议）

正确示例：
```
✅ https://xxx.solana-mainnet.quiknode.pro/token/
✅ https://xxx.quiknode.pro/QN_xxxxx/
```

错误示例：
```
❌ https://quicknode.com  (不完整)
❌ http://localhost:8080  (本地端点)
```

### Q3: 测试显示 "Wrong network"

**答**：您可能连接到了 testnet 或 devnet，请确保：
1. QuickNode 端点选择的是 **Mainnet** 而非 Testnet
2. URL 中包含 `mainnet` 关键词

### Q4: 连接超时或 403 错误

**答**：可能的原因：
1. **API 密钥无效**：检查密钥是否正确复制
2. **网络问题**：检查代理设置或防火墙
3. **配额用完**：检查 QuickNode 控制台的使用情况
4. **URL 错误**：确保复制了完整的 URL

### Q5: 所有端点都失败

**答**：
1. 检查网络连接
2. 检查代理设置（`HTTP_PROXY`, `HTTPS_PROXY` 环境变量）
3. 尝试直接访问 URL（在浏览器中测试）

---

## 🎯 配置验证清单

在开始使用前，确保：

- [ ] ✅ 已获取 QuickNode 完整 HTTP Provider URL
- [ ] ✅ 已更新 `config.quicknode.toml` 中的 URL
- [ ] ✅ 运行 `test-quicknode-connection.ts` 测试成功
- [ ] ✅ 至少 3 个 RPC 端点测试通过
- [ ] ✅ QuickNode 延迟在 100ms 以内（理想）
- [ ] ✅ 确认连接到 mainnet-beta（Genesis Hash 匹配）

---

## 📊 RPC 端点性能对比

根据测试结果，您的 RPC 端点性能通常如下：

| 提供商 | 预期延迟 | 免费额度 | 推荐用途 |
|--------|---------|---------|---------|
| **QuickNode** | 50-150ms | 1000万请求/月 | 主力查询 |
| **Helius** | 100-200ms | 10 RPS × 2账号 | 备用查询 + WebSocket |
| **Ankr** | 150-300ms | 100万/天 | 备用 |
| **Solana 公共** | 200-500ms | 严格限制 | 最后备用 |

---

## 🚀 下一步

配置完成后：

1. **测试套利机器人**：
   ```bash
   pnpm tsx packages/onchain-bot/src/index.ts
   ```

2. **监控性能**：
   - 观察 RPC 延迟
   - 检查速率限制
   - 确认无 403 错误

3. **优化配置**：
   - 根据延迟调整端点顺序
   - 移除失败的端点
   - 添加更多备用端点

---

## 📞 需要帮助？

如果遇到问题：
1. 查看测试脚本输出的详细错误信息
2. 检查 QuickNode 控制台的使用统计
3. 确认 API 密钥和 URL 都是最新的

**祝您配置顺利！** 🎉

