# 🇨🇳 中国大陆网络环境 - 代理解决方案

**问题**: `tokio-tungstenite` 库**不支持**通过环境变量（HTTP_PROXY/HTTPS_PROXY）使用代理连接 WebSocket。

---

## 🔍 问题根源

在中国大陆访问 Solana RPC（如 `api.mainnet-beta.solana.com`）需要通过代理，但：

1. ❌ `tokio-tungstenite` 不读取环境变量 `HTTP_PROXY`/`HTTPS_PROXY`
2. ❌ 需要在代码层面显式配置代理
3. ❌ Rust WebSocket 代理支持相对复杂

---

## ✅ 解决方案

### 方案 A：使用透明代理模式（推荐 ⭐⭐⭐）

在 Clash 中启用 **TUN 模式**或**全局代理模式**，让所有流量自动走代理。

#### 操作步骤：

1. **打开 Clash 配置**
   - 右键 Clash 图标 → "配置" → "设置"

2. **启用 TUN 模式**（推荐）
   - 找到 "TUN Mode" 或"增强模式"
   - 勾选启用
   - 重启 Clash

3. **或启用全局代理模式**
   - Clash 主界面 → 切换到"全局"模式（而非"规则"模式）

4. **重新运行程序**
   ```bash
   cd E:\6666666666666666666666666666\dex-cex\dex-sol\rust-pool-cache
   .\target\release\solana-pool-cache.exe
   ```

**原理**: TUN 模式会在系统层面拦截所有流量，Rust 程序无需任何修改。

---

### 方案 B：修改 Rust 代码支持代理（中等难度 ⭐⭐）

需要修改 `src/websocket.rs`，使用支持代理的库。

#### 步骤 1：修改 `Cargo.toml`

```toml
[dependencies]
# 原有依赖保持
tokio = { version = "1.35", features = ["full"] }
tokio-tungstenite = { version = "0.21", features = ["native-tls-vendored"] }
futures-util = "0.3"

# 新增代理支持
hyper = { version = "0.14", features = ["full"] }
hyper-proxy = "0.9"
http = "0.2"
```

#### 步骤 2：修改 `src/websocket.rs`

```rust
// 在文件开头添加
use hyper_proxy::{Proxy, ProxyConnector, Intercept};
use hyper::client::HttpConnector;

// 在 connect_and_process 方法中
async fn connect_and_process(&self, pools: &[PoolConfig]) -> Result<()> {
    println!("🔌 Connecting to WebSocket: {}", self.url);
    
    // 检查代理环境变量
    let proxy_url = std::env::var("HTTPS_PROXY")
        .or_else(|_| std::env::var("HTTP_PROXY"))
        .ok();
    
    let (ws_stream, _) = if let Some(proxy) = proxy_url {
        println!("🌐 Using proxy: {}", proxy);
        
        // 通过代理连接（需要实现复杂的代理逻辑）
        // 这部分代码较复杂，需要手动处理代理握手
        todo!("Implement proxy support")
    } else {
        // 直接连接
        connect_async(&self.url)
            .await
            .context("Failed to connect to WebSocket")?
    };
    
    // ... 其余代码
}
```

**注意**: 实现完整的 WebSocket 代理支持比较复杂，需要手动处理 HTTP CONNECT 握手。

---

### 方案 C：使用国内可访问的 RPC（临时方案 ⭐）

某些 RPC 提供商在国内有节点或 CDN：

```toml
# config.toml
[websocket]
# 尝试其他 RPC（如果有国内节点）
url = "wss://your-china-node.com"
```

**缺点**: 大多数 Solana RPC 都在国外，这个方案不太可行。

---

### 方案 D：使用 HTTP 轮询替代 WebSocket（最简单 ⭐⭐⭐）

如果 WebSocket 无法解决，可以改用 HTTP RPC 轮询：

```rust
// 替代 WebSocket
async fn poll_account_state(address: &str) {
    let rpc_client = RpcClient::new_with_commitment(
        "https://api.mainnet-beta.solana.com".to_string(),
        CommitmentConfig::confirmed(),
    );
    
    loop {
        match rpc_client.get_account(&address).await {
            Ok(account) => {
                // 反序列化和处理...
            }
            Err(e) => {
                eprintln!("Failed to fetch account: {}", e);
            }
        }
        
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
```

**优势**:
- ✅ HTTP 请求自动使用系统代理
- ✅ Clash 能正常代理 HTTP 流量
- ✅ 代码简单

**缺点**:
- ❌ 延迟更高（~300ms vs ~2ms）
- ❌ 更新频率受限（1 Hz vs 实时）

---

## 🚀 推荐方案

### 短期（立即尝试）

**方案 A：启用 Clash TUN 模式** ⭐⭐⭐
- 最简单，无需修改代码
- 成功率高
- 5 分钟内可完成

### 中期（如果 TUN 模式不可行）

**方案 D：改用 HTTP 轮询** ⭐⭐
- 代码修改较小
- 确保能工作
- 牺牲实时性

### 长期（生产环境）

**方案 B：实现完整代理支持** ⭐⭐
- 最灵活
- 支持所有场景
- 但需要 2-3 天开发时间

---

## 📝 Clash TUN 模式设置指南

### Windows 11/10

1. **以管理员身份运行 Clash**
   - 右键 Clash → "以管理员身份运行"

2. **启用 TUN 模式**
   - 打开 Clash 配置文件（`config.yaml`）
   - 找到或添加：
     ```yaml
     tun:
       enable: true
       stack: gvisor
       dns-hijack:
         - 198.18.0.2:53
       auto-route: true
       auto-detect-interface: true
     ```

3. **重启 Clash**

4. **测试**
   ```bash
   # 不设置任何代理环境变量，直接运行
   .\target\release\solana-pool-cache.exe
   ```

### Clash for Windows 图形界面

1. 打开 Clash for Windows
2. 点击 "General" 或"常规"
3. 找到 "TUN Mode" 或"TUN 模式"
4. 打开开关
5. 授予管理员权限
6. 重启 Clash

---

## 🧪 测试 TUN 模式是否生效

```powershell
# 不设置代理，直接测试
curl https://www.google.com
```

如果能访问 Google，说明 TUN 模式工作正常！

---

## ❓ 常见问题

### Q: TUN 模式对其他程序有影响吗？
A: 是的，TUN 模式会代理所有流量。如果只想代理特定程序，可以使用"规则模式"并配置域名规则。

### Q: TUN 模式需要管理员权限吗？
A: 是的，Windows 上 TUN 模式需要管理员权限。

### Q: 为什么不直接修改代码？
A: 因为 WebSocket 代理支持比较复杂，而 TUN 模式是更简单的解决方案。

---

## 📞 需要帮助？

如果以上方案都不可行，请：

1. 确认 Clash 版本（建议使用最新版）
2. 检查 Clash 日志是否有错误
3. 尝试其他代理软件（如 V2Ray）

---

**更新**: 2025-10-26  
**状态**: 等待测试 Clash TUN 模式  
**下一步**: 启用 TUN 模式并重新运行程序

🇨🇳🚀 **加油！**




