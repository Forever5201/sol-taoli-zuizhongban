# Jupiter Server Manager

自托管 Jupiter API Server 的管理器，为 Solana 套利机器人提供本地、私有的 Jupiter 路由服务。

## 🎯 核心功能

- ✅ **自动下载** jupiter-cli 二进制文件
- ✅ **进程管理** 启动/停止/重启
- ✅ **健康监控** 定期健康检查和自动恢复
- ✅ **环形套利** 支持环形套利查询（关键功能）
- ✅ **跨平台** 支持 Windows/Linux/macOS

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置

复制配置示例：

```bash
cd packages/jupiter-server
cp config.example.toml config.toml
```

编辑 `config.toml`，设置您的 RPC URL：

```toml
[server]
rpc_url = "https://your-rpc-endpoint.com"  # 替换为您的 RPC
port = 8080

[features]
enable_circular_arbitrage = true  # 必须为 true
```

### 3. 测试运行

```bash
# Windows
.\scripts\start-jupiter-server.bat

# Linux/Mac
pnpm tsx scripts/test-jupiter-server.ts
```

预期输出：

```
🚀 Starting Jupiter Server Test...

📦 Step 1: Starting Jupiter Server...
Downloading Jupiter CLI v6.0.35...
✅ Server started

🏥 Step 2: Health Check...
✅ Server is healthy

🔄 Step 3: Testing Circular Arbitrage Query...
   Query: SOL → SOL (0.1 SOL)
   Result:
   - Input: 0.1 SOL
   - Output: 0.1005 SOL
   - Profit: 0.0005 SOL (0.50% ROI)
   ✅ Opportunity found! (环形套利可行)
```

## 📖 API 使用

### 基础使用

```typescript
import { JupiterServerManager } from '@solana-arb-bot/jupiter-server';

const manager = new JupiterServerManager({
  rpcUrl: 'YOUR_RPC_URL',
  port: 8080,
  enableCircularArbitrage: true,
});

// 启动服务
await manager.start();

// 健康检查
const healthy = await manager.healthCheck();

// 测试查询
const result = await manager.testQuery(
  'So11111111111111111111111111111111111111112', // SOL
  'So11111111111111111111111111111111111111112', // SOL
  100_000_000 // 0.1 SOL
);

// 停止服务
await manager.stop();
```

### 集成到 Jupiter Bot

```typescript
import { JupiterBot } from '@solana-arb-bot/jupiter-bot';
import { JupiterServerManager } from '@solana-arb-bot/jupiter-server';

class MyArbitrageBot {
  private serverManager: JupiterServerManager;
  private jupiterBot: JupiterBot;

  async initialize() {
    // 1. 启动 Jupiter Server
    this.serverManager = new JupiterServerManager(config);
    await this.serverManager.start();
    
    // 2. 初始化 Jupiter Bot (使用本地 API)
    this.jupiterBot = new JupiterBot({
      jupiterApiUrl: 'http://127.0.0.1:8080',
      // ... 其他配置
    });
    
    await this.jupiterBot.start();
  }

  async shutdown() {
    await this.jupiterBot.stop();
    await this.serverManager.stop();
  }
}
```

## 🔧 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `rpcUrl` | string | - | Solana RPC URL（必需） |
| `port` | number | 8080 | 服务端口 |
| `version` | string | v6.0.35 | Jupiter CLI 版本 |
| `binaryPath` | string | ./bin/jupiter-cli | 二进制文件路径 |
| `enableCircularArbitrage` | boolean | true | 启用环形套利（关键） |
| `maxRoutes` | number | 3 | 最大路由数 |
| `onlyDirectRoutes` | boolean | false | 只使用直接路由 |
| `timeout` | number | 30000 | 请求超时时间（毫秒） |

## 🚨 注意事项

### 1. 环形套利必须启用

```typescript
// ✅ 正确
enableCircularArbitrage: true

// ❌ 错误 - 无法查询环形路由
enableCircularArbitrage: false
```

### 2. RPC 选择

- ✅ **推荐**：使用付费 RPC（QuickNode/Helius/Triton）
- ⚠️ **可用**：公共 RPC（会有速率限制）
- ❌ **不推荐**：免费 RPC（延迟高、不稳定）

### 3. 端口冲突

如果 8080 端口被占用，修改配置：

```toml
port = 8081  # 或其他可用端口
```

### 4. 二进制文件位置

第一次运行会自动下载到 `./bin/jupiter-cli`，确保有写入权限。

## 📊 状态监控

```typescript
const status = manager.getStatus();

console.log(status);
// {
//   running: true,
//   port: 8080,
//   startTime: 1234567890,
//   uptime: 60000,  // 60 秒
//   restartCount: 0,
// }
```

## 🐛 故障排查

### 问题 1: 下载失败

```
Error: Failed to download Jupiter CLI
```

**解决**：
1. 检查网络连接
2. 检查 GitHub 访问
3. 手动下载并放到 `./bin/jupiter-cli`

### 问题 2: 启动超时

```
Error: Jupiter Server failed to start within 30 seconds
```

**解决**：
1. 检查 RPC URL 是否有效
2. 检查端口是否被占用
3. 查看日志文件

### 问题 3: 健康检查失败

```
Warning: Health check failed
```

**解决**：
1. 确认服务正在运行
2. 检查端口配置
3. 重启服务

## 📝 日志

日志输出示例：

```
[JupiterManager] Jupiter Server Manager initialized { port: 8080, version: 'v6.0.35' }
[JupiterManager] Starting Jupiter Server... { port: 8080, rpc: 'https://...' }
[JupiterManager] Jupiter CLI already exists at ./bin/jupiter-cli
[JupiterManager] Jupiter Server is ready (attempt 3/30)
[JupiterManager] ✅ Jupiter Server started successfully at http://127.0.0.1:8080
```

## 🚀 下一步

成功运行 Jupiter Server 后：

1. ✅ 集成到 Jupiter Bot
2. ✅ 实施机会发现器
3. ✅ 添加 Jito 执行器
4. ✅ 开始套利交易

## 📞 支持

如有问题，请检查：
- 日志文件
- 配置文件
- RPC 连接

---

**祝您套利成功！** 🚀💰
