# 📝 代码模板 - 网络请求标准写法

本文档提供使用 `NetworkAdapter` 的标准代码模板，确保所有新代码自动使用统一的网络配置。

---

## 🎯 基本原则

✅ **总是使用** `NetworkAdapter`  
❌ **永远不要** 直接使用 `axios.create()` 或 `new HttpsProxyAgent()`  
❌ **永远不要** 直接使用 `new Connection()`

---

## 📋 标准模板

### 1. HTTP 请求（最常用）

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// ✅ 使用全局 axios 实例（推荐）
const response = await NetworkAdapter.axios.get('https://api.example.com/data', {
  params: { key: 'value' }
});

const data = response.data;
```

### 2. Solana RPC 连接

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';
import { PublicKey } from '@solana/web3.js';

// ✅ 创建 Connection
const connection = NetworkAdapter.createConnection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// 使用 connection
const balance = await connection.getBalance(publicKey);
const accountInfo = await connection.getAccountInfo(publicKey);
```

### 3. 自定义 axios 实例

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// ✅ 创建自定义配置的 axios（自动应用代理）
const customAxios = NetworkAdapter.createAxios({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'value',
    'Authorization': `Bearer ${apiKey}`,
  },
  validateStatus: (status) => status < 500,
});

// 使用
const response = await customAxios.post('/endpoint', { data: '...' });
```

### 4. WebSocket 连接

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';
import WebSocket from 'ws';

// ✅ 创建 WebSocket（自动应用代理）
const ws = new WebSocket(url, {
  agent: NetworkAdapter.getWebSocketAgent(url),
  headers: {
    'User-Agent': 'My-Bot/1.0',
  },
});

ws.on('open', () => {
  console.log('WebSocket connected');
});

ws.on('message', (data) => {
  console.log('Received:', data);
});
```

### 5. Worker 线程网络请求

#### 主线程：传递配置

```typescript
import { Worker } from 'worker_threads';
import { NetworkAdapter } from '@solana-arb-bot/core';

const worker = new Worker('./worker.js', {
  workerData: {
    // ✅ 传递网络配置
    networkConfig: NetworkAdapter.getSerializableConfig(),
    // 其他配置...
    mintsToQuery: ['...', '...'],
  },
});
```

#### Worker 线程：使用配置

```typescript
import { workerData } from 'worker_threads';
import { UnifiedNetworkAdapter } from '@solana-arb-bot/core';
import axios from 'axios';

// ✅ 从主线程接收配置
const { networkConfig } = workerData;

// ✅ 创建 Worker 专用的 axios 配置
const axiosConfig = UnifiedNetworkAdapter.createWorkerAxiosConfig({
  proxyUrl: networkConfig.proxyUrl,
  timeout: networkConfig.timeout,
  enablePooling: networkConfig.enablePooling,
});

// 创建 axios 实例
const axiosInstance = axios.create({
  ...axiosConfig,
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 使用
const response = await axiosInstance.get('/endpoint');
```

---

## 🔧 高级场景

### 场景 1: 需要不同超时配置

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// 快速请求（1秒超时）
const fastAxios = NetworkAdapter.createAxios({ timeout: 1000 });

// 慢速请求（30秒超时）
const slowAxios = NetworkAdapter.createAxios({ timeout: 30000 });

// 代理配置自动继承，无需手动处理
```

### 场景 2: 需要自定义拦截器

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

const axios = NetworkAdapter.createAxios({
  baseURL: 'https://api.example.com',
});

// 添加请求拦截器
axios.interceptors.request.use(
  (config) => {
    console.log('Request:', config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// 添加响应拦截器
axios.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status);
    return response;
  },
  (error) => {
    console.error('Error:', error.message);
    return Promise.reject(error);
  }
);
```

### 场景 3: 条件性代理（特殊需求）

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

// 检查是否启用代理
if (NetworkAdapter.isProxyEnabled()) {
  console.log('使用代理:', NetworkAdapter.getProxyUrl());
  // 执行需要代理的逻辑
} else {
  console.log('直连模式');
  // 执行直连逻辑
}
```

### 场景 4: 批量请求

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';

const axios = NetworkAdapter.axios;

// 并行请求
const results = await Promise.all([
  axios.get('/endpoint1'),
  axios.get('/endpoint2'),
  axios.get('/endpoint3'),
]);

// 处理结果
const [data1, data2, data3] = results.map(r => r.data);
```

---

## ❌ 错误示例（禁止使用）

### 错误 1: 直接使用 axios.create

```typescript
// ❌ 错误：不会应用代理配置
import axios from 'axios';
const instance = axios.create({ timeout: 5000 });
```

**正确写法**：
```typescript
// ✅ 正确
import { NetworkAdapter } from '@solana-arb-bot/core';
const instance = NetworkAdapter.createAxios({ timeout: 5000 });
```

### 错误 2: 直接使用 new Connection

```typescript
// ❌ 错误：不会应用代理配置
import { Connection } from '@solana/web3.js';
const connection = new Connection(endpoint);
```

**正确写法**：
```typescript
// ✅ 正确
import { NetworkAdapter } from '@solana-arb-bot/core';
const connection = NetworkAdapter.createConnection(endpoint);
```

### 错误 3: 手动创建 HttpsProxyAgent

```typescript
// ❌ 错误：配置分散，难以维护
import { HttpsProxyAgent } from 'https-proxy-agent';
const proxyUrl = process.env.HTTPS_PROXY;
const agent = new HttpsProxyAgent(proxyUrl);
```

**正确写法**：
```typescript
// ✅ 正确：NetworkAdapter 自动处理
import { NetworkAdapter } from '@solana-arb-bot/core';
const axios = NetworkAdapter.createAxios();
// 代理自动配置，无需手动创建 agent
```

### 错误 4: Worker 中重复创建 Agent

```typescript
// ❌ 错误：Worker 中手动配置代理
import { HttpsProxyAgent } from 'https-proxy-agent';
const proxyUrl = process.env.HTTPS_PROXY;
const agent = new HttpsProxyAgent(proxyUrl, { ... });
```

**正确写法**：
```typescript
// ✅ 正确：使用 NetworkAdapter 的 Worker 配置方法
import { UnifiedNetworkAdapter } from '@solana-arb-bot/core';
const axiosConfig = UnifiedNetworkAdapter.createWorkerAxiosConfig({
  proxyUrl: networkConfig.proxyUrl,
  timeout: 1500,
});
```

---

## 📚 完整示例

### 完整的服务类示例

```typescript
import { NetworkAdapter } from '@solana-arb-bot/core';
import { PublicKey } from '@solana/web3.js';
import { AxiosInstance } from 'axios';

/**
 * Jupiter API 客户端服务
 * 
 * 展示如何在服务类中使用 NetworkAdapter
 */
export class JupiterApiService {
  private axios: AxiosInstance;
  private connection: any;

  constructor(private apiKey?: string) {
    // ✅ 使用 NetworkAdapter 创建 axios 实例
    this.axios = NetworkAdapter.createAxios({
      baseURL: 'https://quote-api.jup.ag/v6',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey }),
      },
    });

    // ✅ 使用 NetworkAdapter 创建 Connection
    this.connection = NetworkAdapter.createConnection(
      process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  /**
   * 获取路由报价
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
  }) {
    const response = await this.axios.get('/quote', {
      params: {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 50,
      },
    });

    return response.data;
  }

  /**
   * 获取账户余额
   */
  async getBalance(publicKey: PublicKey) {
    const balance = await this.connection.getBalance(publicKey);
    return balance / 1e9; // 转换为 SOL
  }

  /**
   * 检查网络状态
   */
  isProxyEnabled(): boolean {
    return NetworkAdapter.isProxyEnabled();
  }
}

// 使用示例
const service = new JupiterApiService(process.env.JUPITER_API_KEY);

const quote = await service.getQuote({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: 1000000,
  slippageBps: 50,
});

console.log('Quote:', quote);
```

---

## 🎓 最佳实践总结

1. **永远使用 NetworkAdapter**：确保所有网络请求使用统一配置
2. **优先使用全局实例**：`NetworkAdapter.axios` 足以应对大多数场景
3. **需要自定义时创建新实例**：使用 `NetworkAdapter.createAxios()`
4. **Worker 线程使用专用方法**：使用 `UnifiedNetworkAdapter.createWorkerAxiosConfig()`
5. **检查代理状态**：使用 `NetworkAdapter.isProxyEnabled()` 进行条件判断
6. **不要手动管理代理**：让 NetworkAdapter 自动处理所有代理配置

---

## 🔍 代码审查清单

在提交代码前，检查以下项目：

- [ ] 所有 HTTP 请求都使用 `NetworkAdapter.axios` 或 `NetworkAdapter.createAxios()`
- [ ] 所有 Solana Connection 都使用 `NetworkAdapter.createConnection()`
- [ ] Worker 线程使用 `UnifiedNetworkAdapter.createWorkerAxiosConfig()`
- [ ] 没有直接导入和使用 `HttpsProxyAgent`
- [ ] 没有直接使用 `axios.create()`（除非在 NetworkAdapter 内部）
- [ ] 没有直接使用 `new Connection()`

---

## 📞 需要帮助？

如果遇到以下情况：
- 不确定如何使用 NetworkAdapter
- 发现 NetworkAdapter 无法满足特殊需求
- 需要添加新的网络适配器功能

请参考 `docs/development/NETWORK_ADAPTER_GUIDE.md` 或联系团队。



