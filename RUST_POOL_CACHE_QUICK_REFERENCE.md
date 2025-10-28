# 🦀 Rust Pool Cache 原型 - 快速参考卡

> **状态**: ✅ 实施完成 | **版本**: v0.1.0 | **日期**: 2025-10-26

---

## 📍 项目位置

```
项目根目录/
└── rust-pool-cache/          ← 新的 Rust 子项目
    ├── src/                   ← Rust 源代码
    ├── Cargo.toml             ← 依赖配置
    ├── config.toml            ← 运行时配置
    ├── README.md              ← 完整文档
    ├── QUICK_START.md         ← 快速启动指南
    ├── IMPLEMENTATION_COMPLETE.md  ← 实施报告
    ├── run.bat                ← Windows 启动脚本
    └── run.sh                 ← Linux/Mac 启动脚本
```

---

## 🎯 项目目标

验证通过 **WebSocket 订阅 + Borsh 反序列化** 实时缓存 Solana DEX 池状态的技术可行性。

**关键指标**:
- ✅ 延迟 < 5ms（目标 < 2ms）
- ✅ 更新频率 0.5-2 updates/sec
- ✅ 稳定运行 > 10 分钟

---

## 🚀 3 步快速启动

### 1️⃣ 安装 Rust（如果尚未安装）

**Windows / Mac / Linux:**
```bash
# 访问并按照说明操作
https://rustup.rs/
```

### 2️⃣ 运行程序

**使用启动脚本（推荐）:**

```bash
# Windows
cd rust-pool-cache
run.bat

# Linux/Mac
cd rust-pool-cache
chmod +x run.sh
./run.sh
```

**或手动运行:**

```bash
cd rust-pool-cache
cargo run --release
```

### 3️⃣ 观察输出

程序将：
- 🔌 连接到 Helius WebSocket
- 📡 订阅 3 个 Raydium 池（SOL/USDC, SOL/USDT, USDC/USDT）
- 🔄 实时打印池更新（价格、储备量、延迟）
- 📊 每 60 秒打印统计报告

**按 `Ctrl+C` 停止程序**

---

## 📊 预期输出示例

```
╔═══════════════════════════════════════════════════════════╗
║   🦀 Solana Pool Cache - Prototype Version 0.1.0          ║
╚═══════════════════════════════════════════════════════════╝

✅ WebSocket connected successfully
📡 Subscribed to SOL/USDC
📡 Subscribed to SOL/USDT
📡 Subscribed to USDC/USDT

┌─────────────────────────────────────────────────────
│ [2025-10-26 09:23:45] SOL/USDC Pool Updated
│ ├─ Price:        185.24 USDC/SOL
│ ├─ SOL Reserve:  100,234.5 SOL
│ ├─ USDC Reserve: 18,563,421.2 USDC
│ ├─ Latency:      1.23 ms
│ └─ Slot:         123456789
└─────────────────────────────────────────────────────

┌───────────────────────────────────────────────────────┐
│  Statistics - Last 60 seconds                         │
│  Total Updates:           45                          │
│  Update Rate:           0.75 updates/sec              │
│  Average Latency:       1.10 ms                       │
│  P95 Latency:           1.45 ms                       │
└───────────────────────────────────────────────────────┘
```

---

## 🧪 性能验证清单

运行程序至少 **10 分钟**，然后检查：

- [ ] ✅ WebSocket 连接成功且稳定
- [ ] ✅ 3 个池全部订阅成功
- [ ] ✅ 实时接收池更新（每个池 5-30 秒/次）
- [ ] ✅ 平均延迟 < 5ms（目标 < 2ms）
- [ ] ✅ P95 延迟 < 10ms
- [ ] ✅ 价格与 [DexScreener](https://dexscreener.com) 匹配
- [ ] ✅ 无崩溃或内存泄漏

**记录结果到**: `rust-pool-cache/README.md` 的 "Performance Testing Results" 部分

---

## 📂 核心文件说明

| 文件 | 作用 | 关键点 |
|------|------|--------|
| `src/main.rs` | 程序入口 | 任务协调、信号处理 |
| `src/websocket.rs` | WebSocket 客户端 | 订阅、接收、重连 |
| `src/deserializers/raydium.rs` | Raydium 反序列化 | Borsh 布局、价格计算 |
| `src/metrics.rs` | 延迟统计 | P50/P95/P99 计算 |
| `src/config.rs` | 配置加载 | TOML 解析、验证 |
| `config.toml` | 运行时配置 | WebSocket URL、池地址 |

---

## ⚙️ 配置修改

编辑 `rust-pool-cache/config.toml`:

```toml
[websocket]
url = "wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# 添加更多池
[[pools]]
address = "NEW_POOL_ADDRESS"
name = "TOKEN_A/TOKEN_B"
```

保存后重新运行程序。

---

## 🔧 常见问题

### ❌ "cargo 命令未找到"
**解决**: 安装 Rust → https://rustup.rs/

### ❌ "Failed to connect to WebSocket"
**解决**: 
1. 检查 API Key: `config.toml`
2. 测试网络: `ping mainnet.helius-rpc.com`
3. 查看状态: https://status.helius.dev/

### ❌ "Failed to deserialize pool state"
**解决**: 
- 池地址可能不是 Raydium AMM V4
- 使用 Raydium 官方池地址

### ⚠️ 更新频率过低（< 0.3/sec）
**原因**: 池不活跃
**解决**: 订阅更活跃的池（如 SOL/USDC）

---

## 📚 详细文档

- **完整文档**: `rust-pool-cache/README.md`
- **快速启动**: `rust-pool-cache/QUICK_START.md`
- **实施报告**: `rust-pool-cache/IMPLEMENTATION_COMPLETE.md`
- **技术规格**: `docs/architecture/LOCAL_POOL_CACHE_TECHNICAL_SPEC.md`

---

## 🛣️ 下一步计划

### ✅ 当前阶段：原型验证
- [x] WebSocket 订阅 ✓
- [x] Borsh 反序列化 ✓
- [x] 延迟测量 ✓
- [ ] 性能测试（待用户执行）

### 📦 Phase 2: MVP（如果验证成功）
- 内存缓存（DashMap）
- HTTP API (`GET /price/:pool`)
- 扩展到 100 个池
- Prometheus 指标

### 🚀 Phase 3: 生产就绪
- 多 DEX 支持（Orca, Meteora）
- 动态池管理
- Docker 容器化
- Grafana 仪表板

---

## 🎓 技术亮点

1. **异步架构**: Tokio 异步运行时，非阻塞 I/O
2. **精确测量**: 微秒级延迟跟踪，P95/P99 统计
3. **正确反序列化**: Borsh 字段顺序与链上完全一致
4. **自动重连**: WebSocket 断连后自动恢复
5. **可扩展**: 配置驱动，模块化设计

---

## 📞 获取帮助

1. **查看文档**: `README.md`, `QUICK_START.md`
2. **运行测试**: `cargo test`
3. **检查日志**: 观察终端输出
4. **联系团队**: 创建 GitHub Issue

---

## 🏆 成功标准

**原型验证通过的标志**:

✅ 延迟 < 5ms  
✅ 更新频率 0.5-2/sec  
✅ 价格准确（与外部源匹配）  
✅ 稳定运行 > 10 分钟  
✅ 无内存泄漏或崩溃  

**如果达到以上标准** → 🎉 **验证成功！可以进入 MVP 阶段**

---

**创建**: 2025-10-26  
**状态**: ✅ 实施完成，等待性能测试  
**作者**: Solana Arbitrage Team

🦀🚀 **Let's validate the prototype!**




