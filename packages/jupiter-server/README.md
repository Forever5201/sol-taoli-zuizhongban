# Jupiter Server Manager

**自动化管理本地Jupiter v6 API实例**，为高性能套利提供极低延迟的价格发现服务。

---

## 🎯 为什么需要Jupiter Server？

### **问题：使用公共Jupiter API的局限**

```
公共API的限制:
├─ 🚫 速率限制: 每秒请求受限
├─ 🚫 网络延迟: 100-300ms往返
├─ 🚫 无法定制: 不能启用环形套利
├─ 🚫 共享资源: 与其他用户竞争
└─ 🚫 竞争劣势: 机会被其他人抢先
```

### **解决方案：自托管私有Jupiter API**

```
自托管的优势:
├─ ✅ 无速率限制: 随意查询
├─ ✅ 本地延迟: 1-5ms（快100倍！）
├─ ✅ 完全控制: 启用环形套利
├─ ✅ 独占资源: 专属计算资源
└─ ✅ 竞争优势: 更快发现机会
```

---

## 📦 核心功能

```
✅ 自动下载 Jupiter CLI
✅ 一键启动/停止/重启
✅ 智能健康检查
✅ 自动崩溃恢复
✅ 环境变量注入
✅ 完整日志记录
✅ TypeScript类型支持
```

---

## 🚀 快速开始

### **1. 初始化配置**

```bash
cd packages/jupiter-server
npm run init
```

这会创建 `configs/jupiter-server.toml` 配置文件。

### **2. 修改配置**

编辑 `configs/jupiter-server.toml`：

```toml
[jupiter-server]
# 设置您的RPC URL（必需）
rpc_url = "https://your-high-performance-rpc.com"

# 启用环形套利（必需）
allow_circular_arbitrage = true

# 其他配置使用默认值即可
```

### **3. 启动服务器**

```bash
npm run start
```

输出示例：
```
╔═══════════════════════════════════════╗
║   Jupiter Server Manager v1.0        ║
╚═══════════════════════════════════════╝

[INFO] Loading config from: configs/jupiter-server.toml
[INFO] Using existing binary: bin/jupiter-cli
[INFO] Starting Jupiter Server...
[INFO] ✅ Jupiter Server started successfully
[INFO] Waiting for server to become healthy...
[INFO] ✅ Server is healthy

╔═══════════════════════════════════════╗
║   ✅ Jupiter Server is ready!         ║
╚═══════════════════════════════════════╝
API URL: http://127.0.0.1:8080
```

### **4. 测试API**

```bash
# 健康检查
curl http://127.0.0.1:8080/health

# 获取报价
curl "http://127.0.0.1:8080/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000"
```

---

## 💻 编程API

### **基础用法**

```typescript
import { JupiterServerManager, createFromConfig } from '@solana-arb-bot/jupiter-server';

// 方式1：从配置文件创建
const manager = await createFromConfig('./configs/jupiter-server.toml');

// 启动服务器
await manager.start();

// 获取状态
const info = manager.getInfo();
console.log(`Server status: ${info.status}`);
console.log(`PID: ${info.pid}`);
console.log(`Uptime: ${info.uptime}s`);

// 执行健康检查
const health = await manager.healthCheck();
console.log(`Healthy: ${health.healthy}`);

// 停止服务器
await manager.stop();
```

### **高级用法：事件回调**

```typescript
const manager = await createFromConfig('./configs/jupiter-server.toml', {
  onStart: () => {
    console.log('🚀 Server started');
  },
  
  onStop: () => {
    console.log('🛑 Server stopped');
  },
  
  onRestart: (count) => {
    console.log(`🔄 Server restarted (attempt ${count})`);
  },
  
  onError: (error) => {
    console.error(`❌ Error: ${error.message}`);
  },
  
  onHealthCheckFailed: (result) => {
    console.warn(`⚠️  Health check failed: ${result.error}`);
  },
  
  onHealthCheckSuccess: (result) => {
    console.log(`✅ Health check passed (${result.responseTime}ms)`);
  },
});

await manager.start();
```

### **手动下载Jupiter CLI**

```typescript
import { JupiterDownloader } from '@solana-arb-bot/jupiter-server';

const binaryPath = await JupiterDownloader.download({
  version: 'latest', // 或指定版本如 'v6.0.0'
  targetPath: './bin',
  forceDownload: false, // 如果已存在则跳过
  onProgress: (progress) => {
    const percent = progress.percent.toFixed(1);
    const speed = (progress.speed / 1024 / 1024).toFixed(2);
    console.log(`Download: ${percent}% (${speed} MB/s)`);
  },
});

console.log(`Binary downloaded to: ${binaryPath}`);
```

---

## 📋 CLI命令

### **启动服务器**

```bash
# 使用默认配置
npm run start

# 使用自定义配置
npm run start ./my-config.toml
```

### **初始化配置**

```bash
# 创建默认配置
npm run init

# 创建到指定路径
npm run init ./custom-config.toml
```

### **下载CLI**

```bash
# 下载Jupiter CLI二进制文件
npm run download
```

### **查看版本**

```bash
npm run version
```

### **帮助**

```bash
npm run help
```

---

## ⚙️ 配置详解

### **必需配置**

```toml
[jupiter-server]
# RPC URL（必需）
rpc_url = "https://your-rpc-url.com"
```

### **服务器配置**

```toml
# 监听端口（默认8080）
port = 8080

# 绑定地址（默认127.0.0.1）
host = "127.0.0.1"
```

### **Jupiter配置**

```toml
# 启用环形套利（默认true）
allow_circular_arbitrage = true

# Jupiter版本（默认latest）
jupiter_version = "latest"

# Worker线程数（默认4）
worker_threads = 4

# 缓存大小（默认1000）
cache_size = 1000
```

### **自动化管理**

```toml
# 自动下载（默认true）
auto_download = true

# 自动重启（默认true）
auto_restart = true

# 最大重启次数（默认3）
max_restart_attempts = 3

# 重启延迟（毫秒，默认5000）
restart_delay_ms = 5000
```

### **健康检查**

```toml
# 启用健康检查（默认true）
health_check_enabled = true

# 检查间隔（毫秒，默认10000）
health_check_interval_ms = 10000

# 检查超时（毫秒，默认5000）
health_check_timeout_ms = 5000
```

### **日志配置**

```toml
# 日志级别: trace, debug, info, warn, error
log_level = "info"

# 日志文件（可选）
log_file = "./logs/jupiter-server.log"
```

---

## 🔗 与Jupiter Bot集成

```typescript
// jupiter-bot配置
[jupiter-bot]
# 使用本地Jupiter API
jupiter_api_url = "http://127.0.0.1:8080"

# 高频查询
query_interval_ms = 10  # 每10ms查询一次

# 并行查询
worker_threads = 8
```

**工作流程：**

```
1. Jupiter Server启动
   ↓ 监听 127.0.0.1:8080
   
2. Jupiter Bot启动
   ↓ 连接本地API
   ↓ 高频查询套利机会
   
3. 发现机会
   ↓ 获取swap交易
   ↓ 执行交易（Jito/Spam）
   
4. 记录结果
   ↓ 更新统计
```

---

## 📊 性能对比

### **延迟对比**

| 方式 | 平均延迟 | 说明 |
|------|---------|------|
| **公共API** | 100-300ms | 网络往返 + 队列等待 |
| **本地API** | 1-5ms | 进程间通信 |
| **提升** | **50-300倍** | 显著优势！|

### **查询速率**

| 方式 | QPS | 限制 |
|------|-----|------|
| **公共API** | 5-10 | 速率限制 |
| **本地API** | 100-200 | 仅受CPU限制 |

### **实际影响**

```
套利机会发现:
├─ 公共API: 每秒5次查询 = 5个机会检测
├─ 本地API: 每秒100次查询 = 100个机会检测
└─ 结果: 发现机会的概率提升20倍！
```

---

## 🛡️ 最佳实践

### **1. RPC选择至关重要**

```toml
# ✅ 推荐：付费高性能RPC
rpc_url = "https://your-premium-rpc.com"

# ❌ 不推荐：公共RPC（慢且不稳定）
rpc_url = "https://api.mainnet-beta.solana.com"
```

**RPC性能要求：**
- 延迟 < 50ms
- 稳定性 > 99.9%
- 支持高QPS（>100）

### **2. 资源配置**

```toml
# Worker线程 = CPU核心数
worker_threads = 8

# 缓存适度增加
cache_size = 2000
```

### **3. 健康检查**

```toml
# 间隔不要太短（避免开销）
health_check_interval_ms = 10000  # 10秒

# 超时要合理
health_check_timeout_ms = 5000  # 5秒
```

### **4. 生产部署**

```bash
# 1. 使用进程管理器
pm2 start npm --name jupiter-server -- run start

# 2. 设置自动重启
pm2 startup

# 3. 监控日志
pm2 logs jupiter-server

# 4. 保存配置
pm2 save
```

---

## 🐛 故障排查

### **启动失败**

**问题：** `Cannot start: binary not found`

**解决：**
```bash
# 手动下载二进制文件
npm run download

# 或在配置中启用自动下载
auto_download = true
```

---

**问题：** `RPC connection failed`

**解决：**
```toml
# 检查RPC URL是否正确
rpc_url = "https://your-rpc-url.com"

# 测试RPC连接
curl -X POST https://your-rpc-url.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

---

### **健康检查失败**

**问题：** `Health check failed: Connection refused`

**解决：**
1. 等待服务器完全启动（约10-15秒）
2. 检查端口是否被占用
3. 查看详细日志

```bash
# 检查端口占用
netstat -an | grep 8080

# 查看详细日志
log_level = "debug"
```

---

### **性能问题**

**问题：** 查询速度慢

**解决：**
1. 增加Worker线程
2. 使用更快的RPC
3. 增加缓存大小

```toml
worker_threads = 8
cache_size = 2000
```

---

### **频繁重启**

**问题：** 服务器不断重启

**解决：**
1. 检查RPC稳定性
2. 增加重启延迟
3. 查看错误日志

```toml
restart_delay_ms = 10000  # 增加到10秒
max_restart_attempts = 5  # 增加重试次数
```

---

## 📚 API端点

Jupiter Server提供以下API端点：

### **GET /health**

健康检查端点

**响应：**
```json
{
  "status": "ok",
  "version": "6.0.0",
  "timestamp": 1234567890
}
```

### **GET /quote**

获取交易报价

**参数：**
- `inputMint`: 输入代币mint地址
- `outputMint`: 输出代币mint地址
- `amount`: 输入金额（最小单位）
- `slippageBps`: 滑点（基点，可选）

**示例：**
```bash
curl "http://127.0.0.1:8080/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50"
```

### **POST /swap**

获取交易数据

**请求体：**
```json
{
  "quoteResponse": {...},
  "userPublicKey": "...",
  "wrapUnwrapSOL": true
}
```

---

## 🔐 安全建议

### **1. 仅本地访问**

```toml
# ✅ 安全：仅本地
host = "127.0.0.1"

# ❌ 危险：暴露到外网
host = "0.0.0.0"
```

### **2. 防火墙配置**

```bash
# 确保端口不对外开放
sudo ufw deny 8080
```

### **3. RPC密钥保护**

```toml
# 不要在配置文件中硬编码RPC密钥
# 使用环境变量
rpc_url = "${RPC_URL}"
```

---

## 📈 监控指标

### **关键指标**

```
✅ 运行时间（uptime）
✅ 重启次数（restart_count）
✅ 健康检查状态（healthy）
✅ 响应时间（response_time）
✅ 错误率（error_rate）
```

### **监控代码**

```typescript
const manager = await createFromConfig('./config.toml');

// 定期获取指标
setInterval(() => {
  const info = manager.getInfo();
  
  console.log({
    status: info.status,
    uptime: info.uptime,
    restartCount: info.restartCount,
    healthy: info.healthy,
  });
}, 10000); // 每10秒
```

---

## 🚀 生产部署检查清单

```
✅ 1. 使用付费高性能RPC
✅ 2. 配置自动重启
✅ 3. 启用健康检查
✅ 4. 设置日志文件
✅ 5. 使用PM2管理进程
✅ 6. 配置监控告警
✅ 7. 定期备份配置
✅ 8. 设置防火墙规则
✅ 9. 测试故障恢复
✅ 10. 准备回滚方案
```

---

## 🤝 与其他模块集成

### **与Jupiter Bot配套使用**

```
完整套利系统架构:
─────────────────────────────────────
Jupiter Server (本模块)
    ↓ 提供API
    ↓ http://127.0.0.1:8080
    ↓
Jupiter Bot
    ↓ 发现机会
    ↓
Transaction Builder
    ↓ 构建交易
    ↓
Jito Executor / Spam Executor
    ↓ 执行交易
    ↓
成功！
```

---

## 📝 总结

**Jupiter Server Manager是套利系统的核心基础设施**，它：

```
✅ 提供极低延迟的价格发现
✅ 自动化所有管理任务
✅ 确保服务高可用性
✅ 支持生产级部署
```

**这是从"手动配置"到"一键启动"的质的飞跃！** 🚀

---

## 📄 许可证

MIT License
