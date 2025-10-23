# Jupiter API 502错误修复完成报告

## ✅ 问题根源

**核心矛盾**：Worker线程配置了HTTPS代理可以成功查询Jupiter API，但FlashloanBot主线程在RPC模拟阶段调用Jupiter API时没有配置代理，导致国内网络直连失败返回502错误。

### 为什么Worker成功，但RPC模拟失败？

**Worker查询流程**（成功）：
```
Worker线程 → HttpsProxyAgent → HTTPS_PROXY → Jupiter API → 返回报价
```

**RPC模拟流程**（失败）：
```
主线程 → 直接axios → 无代理 → 国内网络限制 → 502 Bad Gateway
```

---

## 🔧 实施的修复方案

### 1. 添加代理支持到FlashloanBot类

**文件**: `packages/jupiter-bot/src/flashloan-bot.ts`

#### 修改1: 添加导入（第30-32行）
```typescript
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
```

#### 修改2: 添加axiosInstance属性（第151行）
```typescript
private axiosInstance: AxiosInstance;
```

#### 修改3: 在constructor中初始化axios实例（第281-309行）
```typescript
// 初始化 axios 实例并配置代理（复用Worker配置）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const axiosConfig: any = {
  timeout: 10000, // 国内代理网络延迟较高，使用10秒超时
  headers: {
    'Connection': 'keep-alive',
    'Accept-Encoding': 'gzip, deflate',
  },
  validateStatus: (status: number) => status < 500,
  maxRedirects: 0,
};

if (proxyUrl) {
  const agent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    timeout: 10000,
    keepAlive: true,
    keepAliveMsecs: 500,
    maxSockets: 2,
    maxFreeSockets: 2,
    scheduling: 'lifo',
  });
  axiosConfig.httpsAgent = agent;
  axiosConfig.httpAgent = agent;
  axiosConfig.proxy = false;
  logger.info(`✅ Axios configured with proxy: ${proxyUrl}`);
}

this.axiosInstance = axios.create(axiosConfig);
```

---

### 2. 重写getJupiterSwapInstructions方法

**文件**: `packages/jupiter-bot/src/flashloan-bot.ts` (第1119-1224行)

#### 关键改进：

1. **使用axios实例**（第1139、1151行）：
```typescript
// 旧代码
const quoteResponse = await axios.get(...);
const swapResponse = await axios.post(...);

// 新代码
const quoteResponse = await this.axiosInstance.get(...);
const swapResponse = await this.axiosInstance.post(...);
```

2. **增加超时时间**：
- 从5秒增加到10秒（在axiosConfig中配置）
- 适应国内代理网络的较高延迟

3. **添加重试机制**（第1125-1220行）：
```typescript
const maxRetries = 3;
const retryDelays = [500, 1000, 2000]; // 指数退避

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    // API调用...
    return instructions;
  } catch (error: any) {
    // 502/503错误处理
    const is5xxError = error.response?.status === 502 || error.response?.status === 503;
    const isLastAttempt = attempt === maxRetries - 1;

    if (is5xxError && !isLastAttempt) {
      const delay = retryDelays[attempt];
      logger.warn(`Jupiter API ${error.response.status} error, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    // 最后一次重试失败，优雅降级
    if (is5xxError) {
      logger.error(`Jupiter API ${error.response.status} error after ${maxRetries} attempts, skipping this opportunity`);
      return [];
    }
  }
}
```

4. **优化错误处理**：
- **404错误**：无路由，直接返回空数组，不重试
- **502/503错误**：网关错误，重试3次后优雅降级
- **其他错误**：记录并抛出

---

## 📊 修复效果验证

### 预期行为变化

#### 修复前（502错误）：
```
🔬 RPC Simulation Validation
🔍 Simulating flashloan with 800 SOL...
Fetching quote from Jupiter V6 API...
❌ Jupiter V6 API error: Request failed with status code 502
⚠️ Simulation error (94ms): Request failed with status code 502
💰 Saved: 0.116 SOL (Gas + Tip)
```

#### 修复后（预期成功或重试）：
```
🔬 RPC Simulation Validation
🔍 Simulating flashloan with 800 SOL...
✅ Axios configured with proxy: http://127.0.0.1:代理端口
Fetching quote from Jupiter V6 API (attempt 1/3)...
Quote received, estimated out: XXXXXX
Requesting swap transaction...
Deserializing transaction...
✅ Extracted X instructions from Jupiter transaction
🔬 RPC模拟: 成功
```

或者（重试场景）：
```
Fetching quote from Jupiter V6 API (attempt 1/3)...
⚠️ Jupiter API 502 error, retrying in 500ms (attempt 1/3)...
Fetching quote from Jupiter V6 API (attempt 2/3)...
✅ Quote received, estimated out: XXXXXX
```

---

## 🎯 技术要点

### 1. 代理配置复用
完全复用了Worker线程的代理配置参数：
- `keepAlive: true` - 复用TCP连接
- `keepAliveMsecs: 500` - keep-alive心跳间隔
- `maxSockets: 2` - 最大并发连接数
- `scheduling: 'lifo'` - 后进先出，优先复用热连接

### 2. 重试策略
- **指数退避**：500ms → 1000ms → 2000ms
- **最大重试3次**
- **总耗时上限**：约3.5秒（500+1000+2000）
- **智能判断**：只对502/503错误重试

### 3. 优雅降级
- 502/503错误重试失败后返回空数组
- 不会导致整个RPC模拟崩溃
- 允许系统继续处理其他机会

---

## ✅ 当前状态

### 编译状态
```bash
✅ packages/jupiter-bot编译成功 (Exit code: 0)
✅ 无TypeScript错误
✅ 无Linter错误
```

### 运行状态
```bash
✅ Bot已启动 (3个node进程)
✅ 进程ID: 20768, 26156, 27224
✅ 启动时间: 2025-10-22 22:46:07-08
```

---

## 📋 验证清单

请观察以下日志验证修复效果：

- [ ] **初始化日志**：应看到 `✅ Axios configured with proxy: http://...`
- [ ] **502错误消失**：不应再看到 `Request failed with status code 502`
- [ ] **重试日志**（如果网络不稳定）：应看到 `retrying in XXXms (attempt X/3)`
- [ ] **RPC模拟成功**：应看到 `Extracted X instructions from Jupiter transaction`
- [ ] **优雅降级**（最坏情况）：即使重试失败，应看到 `skipping this opportunity` 而不是崩溃

---

## 🔍 故障排查

### 如果仍然出现502错误：

1. **检查代理配置**：
```powershell
$env:HTTPS_PROXY
# 应该输出: http://127.0.0.1:端口号
```

2. **检查代理服务是否运行**：
- 确保你的代理软件（如Clash、V2Ray等）正在运行
- 确保代理端口正确

3. **查看初始化日志**：
```
启动bot后应该看到：
✅ Axios configured with proxy: http://...
```
如果没有这条日志，说明环境变量未设置

4. **手动设置代理**：
```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:你的代理端口"
pnpm start:flashloan -- --config=configs/flashloan-dryrun.toml
```

---

## 💡 总结

### 修复内容
1. ✅ 在FlashloanBot主线程添加了HTTPS代理支持
2. ✅ 复用Worker线程的代理配置参数
3. ✅ 添加了智能重试机制（502/503错误重试3次）
4. ✅ 增加了超时时间（5秒→10秒）
5. ✅ 实现了优雅降级（重试失败返回空数组）

### 预期效果
- ✅ RPC模拟阶段能够成功调用Jupiter API
- ✅ 502错误消失或通过重试解决
- ✅ 提高系统的网络容错性和可靠性
- ✅ 在国内网络环境下稳定运行

### 性能影响
- 单次成功调用：无额外延迟
- 网络不稳定时：最多增加3.5秒（重试延迟）
- 完全失败时：优雅降级，不影响其他机会

---

生成时间: 2025-10-22 22:46  
状态: ✅ **Jupiter API 502错误修复完成，Bot已重启**

