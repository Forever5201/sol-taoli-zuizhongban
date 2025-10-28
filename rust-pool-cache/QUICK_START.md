# 🚀 快速启动指南

## 前提条件

### 1. 安装 Rust

如果您还没有安装 Rust，请按照以下步骤操作：

**Windows:**
1. 访问 [https://rustup.rs/](https://rustup.rs/)
2. 下载并运行 `rustup-init.exe`
3. 按照安装向导完成安装
4. 重启终端使 PATH 生效

**验证安装:**
```bash
rustc --version
cargo --version
```

应该看到类似输出：
```
rustc 1.75.0 (82e1608df 2023-12-21)
cargo 1.75.0 (1d8b05cdd 2023-11-20)
```

## 📦 构建项目

```bash
# 进入项目目录
cd rust-pool-cache

# 检查代码（不构建二进制）
cargo check

# 构建调试版本（快速，带调试信息）
cargo build

# 构建发布版本（优化，速度更快）
cargo build --release
```

## ▶️ 运行程序

### 方式 1：使用 cargo run（推荐用于开发）

```bash
# 使用默认配置文件 (config.toml)
cargo run

# 使用自定义配置文件
cargo run -- path/to/custom-config.toml

# 发布模式运行（更快）
cargo run --release
```

### 方式 2：直接运行二进制文件

```bash
# 构建发布版本
cargo build --release

# 运行
./target/release/solana-pool-cache

# 或在 Windows:
.\target\release\solana-pool-cache.exe
```

## 📝 配置说明

在运行前，确保 `config.toml` 中的 Helius API Key 是有效的：

```toml
[websocket]
url = "wss://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE"
```

当前配置已经包含了项目的 API Key：`d261c4a1-fffe-4263-b0ac-a667c05b5683`

## 🎯 预期行为

程序启动后，您应该看到：

1. ✅ 成功连接到 WebSocket
2. 📡 订阅了 3 个池（SOL/USDC, SOL/USDT, USDC/USDT）
3. 🔄 实时打印池状态更新（每个池每 5-30 秒更新一次）
4. 📊 每 60 秒打印统计报告

## 🛑 停止程序

按 `Ctrl+C` 优雅停止程序，程序会打印最终统计信息。

## 🧪 运行测试

```bash
# 运行所有测试
cargo test

# 运行测试并显示输出
cargo test -- --nocapture

# 运行特定测试
cargo test test_calculate_price
```

## 🐛 故障排查

### 问题：cargo 命令未找到

**解决方案**：
1. 确认已安装 Rust：`rustup --version`
2. 如果未安装，访问 [https://rustup.rs/](https://rustup.rs/)
3. 安装后重启终端

### 问题：连接失败 "Failed to connect to WebSocket"

**可能原因**：
1. API Key 无效或过期
2. 网络连接问题
3. Helius 服务暂时不可用

**解决方案**：
- 检查 `config.toml` 中的 API Key
- 测试网络连接：`ping mainnet.helius-rpc.com`
- 查看 Helius 状态：[https://status.helius.dev/](https://status.helius.dev/)

### 问题：编译错误

**解决方案**：
```bash
# 清理构建缓存
cargo clean

# 更新依赖
cargo update

# 重新构建
cargo build
```

## 📈 性能测试建议

1. **初次运行**：至少运行 10 分钟以获得有意义的统计数据
2. **监控延迟**：观察 P95 和 P99 延迟是否 < 5ms
3. **检查更新频率**：每个池应该每分钟更新 2-10 次
4. **记录结果**：将统计信息复制到 `README.md` 的"Performance Testing Results"部分

## 🔄 下一步

成功验证原型后：

1. ✅ 确认延迟 < 5ms
2. ✅ 确认价格计算正确（对比 DexScreener）
3. ✅ 记录性能数据
4. 📝 规划 MVP 阶段（扩展到 100 个池 + HTTP API）

## 📞 获取帮助

如果遇到问题，请检查：
- `README.md` - 完整文档
- `docs/architecture/LOCAL_POOL_CACHE_TECHNICAL_SPEC.md` - 技术规格
- 项目 Issues 或联系团队

---

**祝您使用愉快！** 🦀🚀



