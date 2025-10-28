# WebSocket 连接问题故障排查

## 🔍 当前问题

程序成功编译和启动，但 **WebSocket 连接失败**，错误信息：
```
❌ WebSocket error: Failed to connect to WebSocket. Reconnecting in 5 seconds...
```

## ✅ 已验证的正常项

- [x] Rust 安装成功（v1.90.0）
- [x] 项目编译成功（1分51秒）
- [x] 程序成功启动
- [x] 网络连接正常（ping mainnet.helius-rpc.com: 56ms）
- [x] 配置文件加载成功

## ❌ 问题原因分析

### 可能原因 1：Windows TLS/SSL 问题（最可能）

Windows 上的 `tokio-tungstenite` 默认使用 `native-tls`，可能存在 TLS 握手问题。

### 可能原因 2：Helius API Key 过期

API Key (`d261c4a1-fffe-4263-b0ac-a667c05b5683`) 可能已过期或被限速。

### 可能原因 3：tokio-tungstenite 版本问题

版本 0.21.0 可能与 Windows 兼容性不佳。

---

## 🔧 解决方案

### 方案 1：使用 rustls 替代 native-tls（推荐）

修改 `Cargo.toml`：

```toml
[dependencies]
# 修改前
tokio-tungstenite = "0.21"

# 修改后
tokio-tungstenite = { version = "0.21", features = ["native-tls-vendored"] }
# 或使用 rustls
tokio-tungstenite = { version = "0.21", default-features = false, features = ["connect", "__rustls-tls"] }
```

然后重新编译：
```bash
cargo clean
cargo build --release
```

### 方案 2：验证 Helius API Key

访问 Helius 控制台验证 API Key 是否有效：
- URL: https://dashboard.helius.dev/
- 检查 API Key 状态
- 检查速率限制

### 方案 3：使用其他 RPC 提供商测试

临时使用公共 RPC 测试：

编辑 `config.toml`：
```toml
[websocket]
# 使用 Solana 公共 RPC（无需 API Key）
url = "wss://api.mainnet-beta.solana.com"
```

### 方案 4：添加详细错误日志

修改 `src/websocket.rs`，在连接失败处添加详细错误信息：

```rust
match connect_async(&self.url).await {
    Ok((ws_stream, _)) => { /* ... */ }
    Err(e) => {
        eprintln!("❌ WebSocket connection failed:");
        eprintln!("   URL: {}", self.url);
        eprintln!("   Error: {:?}", e);  // 打印详细错误
        anyhow::bail!("Failed to connect to WebSocket: {}", e);
    }
}
```

### 方案 5：升级到最新版本

升级依赖到最新稳定版：

```toml
[dependencies]
tokio-tungstenite = "0.28"  # 最新版本
tungstenite = "0.28"
```

---

## 🧪 快速测试方案

### 测试 1：使用 curl 测试 WebSocket

```bash
# 测试 HTTP 端点
curl "https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

### 测试 2：使用 websocat 测试 WebSocket

```bash
# 安装 websocat
cargo install websocat

# 测试连接
websocat "wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683"
```

---

## 📝 下一步行动建议

### 短期（立即尝试）

1. **方案 3**：先用 Solana 公共 RPC 测试（`wss://api.mainnet-beta.solana.com`）
2. 如果成功，说明代码没问题，是 Helius API Key 的问题
3. 如果仍失败，尝试**方案 1**（rustls）

### 中期（如果问题持续）

1. 实施**方案 4**：添加详细错误日志
2. 提交 Issue 到 `tokio-tungstenite` 项目（如果是库的问题）
3. 考虑使用 HTTP 长轮询作为备选方案

### 长期（优化）

1. 实现多 RPC 提供商支持（Helius, QuickNode, Triton）
2. 添加 RPC 健康检查和自动切换
3. 使用 gRPC（Yellowstone）替代 WebSocket

---

## 🆘 获取帮助

如果问题仍未解决：

1. **查看详细日志**：
   ```bash
   .\target\release\solana-pool-cache.exe > debug.log 2>&1
   ```

2. **联系 Helius 支持**：
   - Discord: https://discord.gg/helius
   - Email: support@helius.dev

3. **检查 Solana 网络状态**：
   - https://status.solana.com/

---

## 📚 相关资源

- [tokio-tungstenite Documentation](https://docs.rs/tokio-tungstenite/)
- [Helius WebSocket API](https://docs.helius.dev/solana-rpc-nodes/alpha-websockets)
- [Solana WebSocket API](https://solana.com/docs/rpc/websocket)

---

**更新日期**: 2025-10-26  
**状态**: 诊断中




