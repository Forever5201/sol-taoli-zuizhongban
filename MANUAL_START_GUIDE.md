# 🚀 Jupiter 本地 API - 手动启动指南

## ✅ 当前状态

1. ✅ **Windows RPC 代理** - 正常运行（端口 8899）
2. ✅ **Clash TUN 模式** - 已启用
3. ⏳ **Jupiter API** - 需要手动启动

---

## 📋 手动启动步骤（3 分钟）

### 方案 A：直接启动（推荐尝试）

打开 **新的 PowerShell 窗口**，执行：

```powershell
# 1. 进入项目目录
cd E:\6666666666666666666666666666\dex-cex\dex-sol

# 2. 启动 WSL 并运行 Jupiter API
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && ./jupiter-swap-api --rpc-url 'http://172.23.176.1:8899' --port 8080 --host 0.0.0.0 --allow-circular-arbitrage"
```

**预期输出**（30-60 秒后）：
```
[INFO] Loading Jupiter router...
[INFO] Fetching markets from europa server...
[INFO] Loaded 15,234 markets
[INFO] Server listening on http://0.0.0.0:8080
```

---

### 方案 B：如果方案 A 失败（使用公共 RPC）

```powershell
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && ./jupiter-swap-api --rpc-url 'https://api.mainnet-beta.solana.com' --port 8080 --host 0.0.0.0 --allow-circular-arbitrage"
```

---

## 🧪 验证 Jupiter API 已启动

在**另一个** PowerShell 窗口运行：

```powershell
pnpm tsx test-local-jupiter-api.ts
```

**成功标志**：
```
✅ Health check passed (2ms)
✅ Quote received (3ms) 🔥 EXCELLENT
🏆 AVERAGE LATENCY <5MS - READY FOR PRODUCTION!
```

---

## 🚀 启动您的 Bot

Jupiter API 启动成功后，运行：

```powershell
# 设置环境变量（使用本地 API）
$env:USE_LOCAL_JUPITER_API="true"

# 启动 Bot
pnpm start:flashloan
```

**成功标志**（Bot 日志）：
```
[Worker 1] API: http://localhost:8080/quote (🟢 LOCAL API)
[Worker 1] Mode: Local (< 5ms latency)
```

---

## ❌ 故障排查

### 错误 1: "Connection refused"

**原因**: RPC 代理可能已停止

**解决**:
```powershell
# 重新启动 RPC 代理
node solana-rpc-proxy.js
```

---

### 错误 2: "DNS error" 或 "failed to lookup"

**原因**: WSL DNS 问题

**解决**: 使用方案 B（公共 Solana RPC）

---

### 错误 3: "Cannot find jupiter-swap-api"

**原因**: 文件权限或路径问题

**解决**:
```powershell
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && chmod +x jupiter-swap-api && ls -la jupiter-swap-api"
```

---

## 📊 性能对比

| 方案 | RPC | 延迟 | 稳定性 |
|------|-----|------|--------|
| **方案 A** | Windows RPC 代理 (8899) | **<5ms** ⚡ | ⭐⭐⭐⭐⭐ |
| **方案 B** | 公共 Solana RPC | **<10ms** ⚡ | ⭐⭐⭐⭐ |
| ~~远程 Ultra API~~ | Helius | ~150ms | ⭐⭐⭐ |

---

## 💡 下一步

一旦 Jupiter API 成功启动：

1. ✅ 运行测试：`pnpm tsx test-local-jupiter-api.ts`
2. ✅ 启动 Bot：`pnpm start:flashloan`
3. ✅ 监控日志：检查 Worker 是否使用本地 API
4. ✅ 观察性能：延迟应该从 ~150ms 降到 <5ms

---

**🎯 目标：从发现机会到上链，总延迟从 900ms 降到 460ms（提升 50%）！**


