# 🚀 网络适配器 - 快速开始

## 🎯 你的需求已实现！

> "能不能让我的系统内部，以后新集成的代码和功能，自动的使用我系统的网络适配器？？？"

**答案：现在可以了！** ✅

---

## ⚡ 2 分钟快速上手

### 1️⃣ 环境配置（可选）

如果需要代理，在 `.env` 文件中添加：

```bash
# 如果你在国内，需要使用代理
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890

# 如果在海外，留空或删除这些配置即可
```

### 2️⃣ 在代码中使用

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// ✅ 就这么简单！自动使用系统配置
const response = await NetworkAdapter.axios.get('https://quote-api.jup.ag/v6/quote');
const connection = NetworkAdapter.createConnection(rpcUrl, 'confirmed');
```

**就是这么简单！代理配置会自动应用，无需手动配置。**

---

## 📋 完整示例

### HTTP 请求

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// 方式1: 使用全局 axios 实例（最简单）
const response = await NetworkAdapter.axios.get('https://quote-api.jup.ag/v6/quote', {
  params: {
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: 1000000,
  }
});

// 方式2: 创建自定义 axios（如果需要不同配置）
const customAxios = NetworkAdapter.createAxios({
  timeout: 5000,
  headers: { 'X-Custom': 'value' },
});
```

### Solana RPC 连接

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';
import { PublicKey } from '@solana/web3.js';

// 创建 Connection（自动应用代理）
const connection = NetworkAdapter.createConnection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// 正常使用
const balance = await connection.getBalance(publicKey);
const accountInfo = await connection.getAccountInfo(publicKey);
```

---

## ✅ 系统一致性保证

### 启用代理时

```
你的 .env 文件：
  HTTPS_PROXY=http://127.0.0.1:7890

系统行为：
  ✅ 所有 HTTP/HTTPS 请求 → 通过代理
  ✅ 所有 Solana RPC 连接 → 通过代理
  ✅ 所有 Worker 线程请求 → 通过代理
  ✅ 所有 WebSocket 连接 → 通过代理
  
  🎯 100% 一致！要么全用代理，要么全不用
```

### 禁用代理时

```
你的 .env 文件：
  # HTTPS_PROXY=（留空或注释）

系统行为：
  ✅ 所有网络请求 → 直连
  
  🎯 100% 一致！全部直连
```

---

## 🎓 为什么要这样做？

### ❌ 之前的问题

```typescript
// 问题1: Worker 线程单独配置
const agent = new HttpsProxyAgent(proxyUrl, { ... });

// 问题2: 主线程单独配置
const axios = axios.create({ httpsAgent: ... });

// 问题3: 有的代码用代理，有的不用
const connection = new Connection(endpoint);  // 这个没用代理！
```

**结果**：配置分散，难以维护，容易出错

### ✅ 现在的方案

```typescript
// 所有代码统一使用 NetworkAdapter
import { NetworkAdapter } from '@solana-arb-bot/core';

const axios = NetworkAdapter.axios;  // 自动配置
const connection = NetworkAdapter.createConnection(endpoint);  // 自动配置
```

**结果**：
- 🎯 配置统一：只在 `.env` 中配置一次
- 🎯 自动应用：所有代码自动使用
- 🎯 零出错：不可能出现配置不一致

---

## 📚 深入学习

### 基础文档

- **使用指南**：[docs/development/NETWORK_ADAPTER_GUIDE.md](docs/development/NETWORK_ADAPTER_GUIDE.md)
  - 完整 API 参考
  - 常见问题 FAQ
  - 最佳实践

- **代码模板**：[docs/development/CODE_TEMPLATES.md](docs/development/CODE_TEMPLATES.md)
  - 标准写法
  - 错误示例
  - 完整示例

### 架构文档

- **实施报告**：[docs/architecture/UNIFIED_NETWORK_ADAPTER_IMPLEMENTATION.md](docs/architecture/UNIFIED_NETWORK_ADAPTER_IMPLEMENTATION.md)
  - 设计思路
  - 架构详解
  - 性能优化

---

## ❌ 禁止的写法

以后**永远不要**这样写：

```typescript
// ❌ 错误1: 直接使用 axios.create
import axios from 'axios';
const instance = axios.create({ ... });

// ❌ 错误2: 直接使用 new Connection
import { Connection } from '@solana/web3.js';
const connection = new Connection(endpoint);

// ❌ 错误3: 手动创建 HttpsProxyAgent
import { HttpsProxyAgent } from 'https-proxy-agent';
const agent = new HttpsProxyAgent(proxyUrl);
```

**正确写法**：

```typescript
// ✅ 总是使用 NetworkAdapter
import { NetworkAdapter } from '@solana-arb-bot/core';

const axios = NetworkAdapter.createAxios({ ... });
const connection = NetworkAdapter.createConnection(endpoint);
// 代理自动配置，无需手动创建 agent
```

---

## 🔧 Worker 线程特殊处理

Worker 线程无法共享主线程的 Agent，需要特殊处理：

### 主线程

```typescript
import { Worker } from 'worker_threads';
import { NetworkAdapter } from '@solana-arb-bot/core';

const worker = new Worker('./worker.js', {
  workerData: {
    // 传递网络配置
    networkConfig: NetworkAdapter.getSerializableConfig(),
    // 其他配置...
  },
});
```

### Worker 线程

```typescript
import { workerData } from 'worker_threads';
import { UnifiedNetworkAdapter } from '@solana-arb-bot/core';
import axios from 'axios';

// 使用主线程传递的配置
const { networkConfig } = workerData;

// 创建 Worker 专用的 axios 配置
const axiosConfig = UnifiedNetworkAdapter.createWorkerAxiosConfig({
  proxyUrl: networkConfig.proxyUrl,
  timeout: networkConfig.timeout,
  enablePooling: networkConfig.enablePooling,
});

// 创建 axios 实例
const axiosInstance = axios.create(axiosConfig);
```

---

## 🎯 启动日志

启动时会看到以下日志：

### 启用代理时

```
🌐 [NetworkAdapter] 代理配置已启用
   ├─ HTTP:  http://127.0.0.1:7890
   ├─ HTTPS: http://127.0.0.1:7890
   ├─ WS:    http://127.0.0.1:7890
   ├─ 连接池: 已启用
   └─ 超时:  10000ms
```

### 未启用代理时

```
🌐 [NetworkAdapter] 直连模式（无代理）
   ├─ 连接池: 已启用
   └─ 超时:  10000ms
```

如果看到这些日志，说明配置成功！

---

## 🆘 常见问题

### Q: 我需要在每个文件中都导入 NetworkAdapter 吗？

A: 是的，但这很简单：

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';
```

然后直接使用 `NetworkAdapter.axios` 或 `NetworkAdapter.createConnection()`。

### Q: 如果我需要不同的超时配置怎么办？

A: 使用 `createAxios` 创建自定义实例：

```typescript
const fastAxios = NetworkAdapter.createAxios({ timeout: 1000 });
const slowAxios = NetworkAdapter.createAxios({ timeout: 30000 });
```

代理配置会自动继承。

### Q: 如何禁用代理？

A: 删除或注释掉 `.env` 中的 `HTTP_PROXY` 和 `HTTPS_PROXY` 配置即可。系统会自动切换到直连模式。

### Q: Worker 线程为什么需要特殊处理？

A: Worker 线程运行在独立的上下文中，无法共享主线程的 Agent 实例。但我们提供了 `createWorkerAxiosConfig` 方法来简化配置。

---

## ✨ 总结

🎉 **恭喜！你的系统现在有了统一的网络适配器！**

**未来所有新集成的代码和功能，只要使用 `NetworkAdapter`，就会自动使用系统的网络配置！**

### 记住这 3 条规则：

1. ✅ **总是使用** `NetworkAdapter`
2. ❌ **永远不要** 直接使用 `axios.create()` 或 `new Connection()`
3. 🎯 **配置一次** 在 `.env` 中配置，所有代码自动生效

---

**开始编码吧！** 🚀



