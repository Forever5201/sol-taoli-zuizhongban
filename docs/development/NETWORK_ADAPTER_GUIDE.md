# 🌐 网络适配器使用指南

## 📌 核心原则

**本系统采用统一的网络适配器架构，确保所有网络请求使用一致的配置。**

### 为什么需要统一的网络适配器？

❌ **之前的问题**：
- Worker 线程单独配置代理
- 主线程单独配置代理
- 部分代码使用代理，部分代码不使用
- 配置分散，难以维护
- 无法保证"要么全用代理，要么全不用"

✅ **现在的解决方案**：
- **唯一配置源**：`NetworkAdapter` 单例
- **自动注入**：新代码自动使用系统配置
- **零配置**：开发者无需关心代理细节
- **一致性保证**：要么所有请求都用代理，要么都不用

---

## 🚀 快速开始

### 1. 配置环境变量

在项目根目录的 `.env` 文件中设置：

```bash
# 如果需要使用代理（国内环境）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890

# 可选配置
WS_PROXY=http://127.0.0.1:7890          # WebSocket 代理
NO_PROXY=localhost,127.0.0.1            # 不使用代理的地址
NETWORK_TIMEOUT=10000                    # 超时时间（毫秒）
ENABLE_CONNECTION_POOLING=true           # 是否启用连接池
```

如果不需要代理（海外环境），直接留空或删除这些配置。

### 2. 在代码中使用

#### 方式一：使用全局 axios 实例（推荐）

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// 发送 HTTP 请求
const response = await NetworkAdapter.axios.get('https://quote-api.jup.ag/v6/quote', {
  params: { inputMint: '...', outputMint: '...', amount: 1000000 }
});

const data = response.data;
```

#### 方式二：创建 Solana Connection

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// 创建 RPC 连接（自动应用代理配置）
const connection = NetworkAdapter.createConnection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// 使用 connection
const balance = await connection.getBalance(publicKey);
```

#### 方式三：创建自定义 axios 实例

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// 创建自定义配置的 axios（会自动合并代理配置）
const customAxios = NetworkAdapter.createAxios({
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'value'
  }
});

await customAxios.post('https://api.example.com', { data: '...' });
```

---

## 📚 完整 API 参考

### NetworkAdapter.axios

全局预配置的 axios 实例，推荐在大多数场景使用。

```typescript
// GET 请求
const response = await NetworkAdapter.axios.get(url, { params });

// POST 请求
const response = await NetworkAdapter.axios.post(url, data, { headers });

// 所有 axios 方法都可用
```

### NetworkAdapter.createAxios(config)

创建自定义配置的 axios 实例，自动合并代理配置。

```typescript
const axios = NetworkAdapter.createAxios({
  timeout: 3000,          // 自定义超时
  headers: { ... },       // 自定义请求头
  // 其他 axios 配置
});
```

### NetworkAdapter.createConnection(endpoint, commitment)

创建 Solana Connection，自动应用代理配置。

```typescript
const connection = NetworkAdapter.createConnection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'  // 或 'processed', 'finalized'
);

// 或传入完整配置
const connection = NetworkAdapter.createConnection(
  'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
  }
);
```

### NetworkAdapter.getWebSocketAgent(url)

获取 WebSocket 代理 Agent（用于 ws 库）。

```typescript
import WebSocket from 'ws';

const ws = new WebSocket(url, {
  agent: NetworkAdapter.getWebSocketAgent(url)
});
```

### NetworkAdapter.isProxyEnabled()

检查是否启用了代理。

```typescript
if (NetworkAdapter.isProxyEnabled()) {
  console.log('使用代理:', NetworkAdapter.getProxyUrl());
} else {
  console.log('直连模式');
}
```

---

## 🔧 Worker 线程使用

Worker 线程无法直接使用主线程的 Agent 实例，需要特殊处理。

### 主线程：传递配置给 Worker

```typescript
import { Worker } from 'worker_threads';
import { NetworkAdapter } from '@solana-arb-bot/core';

const worker = new Worker('./worker.js', {
  workerData: {
    // 传递可序列化的配置
    networkConfig: NetworkAdapter.getSerializableConfig(),
    // 其他 workerData...
  }
});
```

### Worker 线程：使用配置

```typescript
import { parentPort, workerData } from 'worker_threads';
import { UnifiedNetworkAdapter } from '@solana-arb-bot/core';
import axios from 'axios';

// 从主线程接收配置
const { networkConfig } = workerData;

// 创建 Worker 专用的 axios 配置
const axiosConfig = UnifiedNetworkAdapter.createWorkerAxiosConfig({
  proxyUrl: networkConfig.proxyUrl,
  timeout: networkConfig.timeout,
  enablePooling: networkConfig.enablePooling,
});

// 创建 axios 实例
const axiosInstance = axios.create(axiosConfig);

// 使用 axios
const response = await axiosInstance.get('https://quote-api.jup.ag/v6/quote');
```

---

## ⚠️ 常见错误和最佳实践

### ❌ 错误用法

```typescript
// 错误1: 直接使用 axios.create 而不经过 NetworkAdapter
import axios from 'axios';
const instance = axios.create({ timeout: 5000 });  // ❌ 不会应用代理配置

// 错误2: 直接使用 new Connection
import { Connection } from '@solana/web3.js';
const connection = new Connection(endpoint);  // ❌ 不会应用代理配置

// 错误3: 手动创建 HttpsProxyAgent
import { HttpsProxyAgent } from 'https-proxy-agent';
const agent = new HttpsProxyAgent(proxyUrl);  // ❌ 配置分散，难以维护
```

### ✅ 正确用法

```typescript
// 正确1: 使用 NetworkAdapter.createAxios
import { NetworkAdapter } from '@solana-arb-bot/core';
const instance = NetworkAdapter.createAxios({ timeout: 5000 });  // ✅ 自动应用代理

// 正确2: 使用 NetworkAdapter.createConnection
import { NetworkAdapter } from '@solana-arb-bot/core';
const connection = NetworkAdapter.createConnection(endpoint);  // ✅ 自动应用代理

// 正确3: 直接使用全局实例（推荐）
import { NetworkAdapter } from '@solana-arb-bot/core';
await NetworkAdapter.axios.get(url);  // ✅ 最简单、最推荐
```

---

## 🔍 代码检测工具

我们提供了工具来检测项目中是否有代码没有使用 NetworkAdapter：

```typescript
import { detectDirectNetworkUsage } from '@solana-arb-bot/core';

const warnings = detectDirectNetworkUsage(filePath, fileContent);
if (warnings.length > 0) {
  console.warn('发现未使用 NetworkAdapter 的代码：');
  warnings.forEach(w => console.warn(w));
}
```

可以在 CI/CD 流程中运行这个检测工具，确保代码质量。

---

## 📋 迁移指南

### 从旧代码迁移到 NetworkAdapter

#### 场景1: axios 实例

**旧代码**：
```typescript
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = process.env.HTTPS_PROXY;
const agent = new HttpsProxyAgent(proxyUrl);
const instance = axios.create({
  httpsAgent: agent,
  httpAgent: agent,
  proxy: false,
});
```

**新代码**：
```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

const instance = NetworkAdapter.axios;  // 使用全局实例
// 或
const instance = NetworkAdapter.createAxios();  // 创建新实例
```

#### 场景2: Solana Connection

**旧代码**：
```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection(endpoint, 'confirmed');
```

**新代码**：
```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

const connection = NetworkAdapter.createConnection(endpoint, 'confirmed');
```

#### 场景3: Worker 线程

**旧代码**：
```typescript
// worker.ts
const proxyUrl = process.env.HTTPS_PROXY;
const agent = new HttpsProxyAgent(proxyUrl, {
  keepAlive: true,
  maxSockets: 20,
});
const axios = axios.create({ httpsAgent: agent });
```

**新代码**：
```typescript
// main.ts
import { NetworkAdapter } from '@solana-arb-bot/core';

const worker = new Worker('./worker.js', {
  workerData: {
    networkConfig: NetworkAdapter.getSerializableConfig(),
  }
});

// worker.ts
import { UnifiedNetworkAdapter } from '@solana-arb-bot/core';

const axiosConfig = UnifiedNetworkAdapter.createWorkerAxiosConfig(
  workerData.networkConfig
);
const axios = axios.create(axiosConfig);
```

---

## 🎯 设计原则

1. **单一配置源**：所有网络配置从环境变量统一读取
2. **自动注入**：NetworkAdapter 自动处理代理、连接池等配置
3. **零配置**：开发者只需使用 NetworkAdapter API，无需关心底层细节
4. **一致性**：要么所有请求都用代理，要么都不用，绝不混用
5. **可测试**：提供代码检测工具，确保代码质量

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

### Q: Worker 线程为什么需要特殊处理？

A: Worker 线程运行在独立的上下文中，无法共享主线程的 Agent 实例。但我们提供了 `createWorkerAxiosConfig` 方法来简化配置。

### Q: 如何禁用代理？

A: 删除或注释掉 `.env` 中的 `HTTP_PROXY` 和 `HTTPS_PROXY` 配置即可。系统会自动切换到直连模式。

### Q: 如何为特定域名禁用代理？

A: 使用 `NO_PROXY` 环境变量：

```bash
NO_PROXY=localhost,127.0.0.1,*.internal.com
```

---

## 📞 支持

如果在使用 NetworkAdapter 时遇到问题，请检查：

1. 环境变量是否正确配置
2. 是否使用了 `NetworkAdapter` 的 API（而不是直接使用 axios 或 Connection）
3. Worker 线程是否正确接收和使用了网络配置

启动时会看到配置日志：

```
🌐 [NetworkAdapter] 代理配置已启用
   ├─ HTTP:  http://127.0.0.1:7890
   ├─ HTTPS: http://127.0.0.1:7890
   ├─ WS:    http://127.0.0.1:7890
   ├─ 连接池: 已启用
   └─ 超时:  10000ms
```

如果看到这个日志，说明配置成功。



