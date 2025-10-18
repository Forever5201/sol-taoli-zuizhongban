# 代理配置指南

## 概述

本系统已完整集成代理支持，可为所有网络请求配置HTTP/HTTPS/SOCKS代理，包括：
- **HTTP/HTTPS请求** (axios) - Jupiter API、Jito API等
- **WebSocket连接** - Jito实时数据流
- **Solana RPC连接** - 区块链数据读取和交易发送

---

## 快速开始

### 1. 设置环境变量

在项目根目录创建或编辑 `.env` 文件：

```bash
# HTTP/HTTPS代理
HTTP_PROXY=http://127.0.0.1:7980

# HTTPS代理（可选，不设置则使用HTTP_PROXY）
HTTPS_PROXY=http://127.0.0.1:7980

# WebSocket代理（可选，不设置则使用HTTP_PROXY）
WS_PROXY=http://127.0.0.1:7980

# 不使用代理的地址（可选）
NO_PROXY=localhost,127.0.0.1
```

### 2. 安装依赖

```bash
npm install
```

新增的代理相关依赖：
- `https-proxy-agent` - HTTP/HTTPS代理支持
- `socks-proxy-agent` - SOCKS代理支持

### 3. 运行系统

```bash
# 开发模式
npm run dev

# 或运行套利机器人
npm run start:onchain-bot

# 或监控Jito小费
npm run jito-monitor
```

系统启动时会自动加载代理配置，日志中会显示代理信息。

---

## 支持的代理类型

### HTTP代理
```bash
HTTP_PROXY=http://127.0.0.1:7980
```

### HTTPS代理
```bash
HTTPS_PROXY=https://127.0.0.1:7980
```

### SOCKS5代理
```bash
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080
```

### 带认证的代理
```bash
HTTP_PROXY=http://username:password@proxy.example.com:8080
```

---

## 配置详解

### 环境变量说明

| 变量名 | 说明 | 示例 | 必需 |
|--------|------|------|------|
| `HTTP_PROXY` | HTTP请求代理 | `http://127.0.0.1:7980` | 否 |
| `HTTPS_PROXY` | HTTPS请求代理 | `http://127.0.0.1:7980` | 否 |
| `WS_PROXY` | WebSocket代理 | `http://127.0.0.1:7980` | 否 |
| `NO_PROXY` | 绕过代理的地址列表 | `localhost,127.0.0.1` | 否 |

### 智能降级

- 如果未设置 `HTTPS_PROXY`，自动使用 `HTTP_PROXY`
- 如果未设置 `WS_PROXY`，自动使用 `HTTP_PROXY`
- 如果未设置任何代理，系统直接连接（不使用代理）

### NO_PROXY 规则

支持以下匹配模式：
- **精确匹配**: `localhost` 匹配 `localhost`
- **域名匹配**: `example.com` 匹配 `example.com` 及所有子域
- **通配符**: `*.example.com` 匹配所有 `example.com` 子域

示例：
```bash
NO_PROXY=localhost,127.0.0.1,*.internal.com,api.local
```

---

## 架构说明

### 代理管理器 (`ProxyManager`)

核心代理配置管理器，提供统一的代理配置接口：

```typescript
import { getProxyManager } from '@solana-arb-bot/core';

const proxyManager = getProxyManager();

// 检查是否启用代理
if (proxyManager.isProxyEnabled()) {
  console.log('代理已启用');
}

// 获取当前配置
const config = proxyManager.getConfig();
console.log('HTTP代理:', config.httpProxy);
```

### 各模块代理支持

#### 1. Axios (HTTP/HTTPS请求)

**Jupiter API** (`jupiter-swap.ts`) 和 **Jito API** (`jito-tip-optimizer.ts`) 自动使用代理：

```typescript
import axios from 'axios';
import { getAxiosProxyConfig } from '@solana-arb-bot/core';

const response = await axios.get('https://api.example.com', {
  ...getAxiosProxyConfig('https://api.example.com'),
});
```

#### 2. WebSocket连接

**Jito监控** (`jito-monitor/index.ts`) 自动使用WebSocket代理：

```typescript
import WebSocket from 'ws';
import { getWebSocketProxyAgent } from '@solana-arb-bot/core';

const ws = new WebSocket('wss://example.com', {
  agent: getWebSocketProxyAgent('wss://example.com'),
});
```

#### 3. Solana Connection

**RPC连接池** (`connection.ts`) 自动为所有Solana RPC连接配置代理：

```typescript
import { Connection } from '@solana/web3.js';
import { getSolanaProxyConfig } from '@solana-arb-bot/core';

const connection = new Connection('https://api.mainnet-beta.solana.com', {
  commitment: 'confirmed',
  fetch: getSolanaProxyConfig(),
});
```

---

## 测试代理配置

### 测试HTTP代理

```bash
# 设置代理
export HTTP_PROXY=http://127.0.0.1:7980

# 运行Jupiter测试
npm run test-jupiter
```

### 测试WebSocket代理

```bash
# 设置代理
export WS_PROXY=http://127.0.0.1:7980

# 运行Jito监控
npm run jito-monitor
```

### 查看代理日志

系统启动时会在日志中显示代理配置：

```
[ProxyConfig] 代理配置已加载 {
  http: 'http://127.0.0.1:7980',
  https: 'http://127.0.0.1:7980',
  ws: 'http://127.0.0.1:7980'
}
```

---

## 常见问题

### 1. 代理连接失败

**症状**: 看到 `ECONNREFUSED` 或超时错误

**解决方案**:
- 确认代理服务器正在运行
- 检查代理地址和端口是否正确
- 测试代理: `curl -x http://127.0.0.1:7980 https://www.google.com`

### 2. WebSocket无法通过代理

**症状**: WebSocket连接失败，但HTTP请求正常

**解决方案**:
- 确认代理服务器支持WebSocket (CONNECT method)
- 某些HTTP代理不支持WebSocket，需使用SOCKS5代理
- 设置: `WS_PROXY=socks5://127.0.0.1:1080`

### 3. 代理认证失败

**症状**: 返回 407 Proxy Authentication Required

**解决方案**:
```bash
# 在代理URL中包含用户名和密码
HTTP_PROXY=http://username:password@127.0.0.1:7980
```

### 4. 某些请求需要绕过代理

**解决方案**:
```bash
# 添加到NO_PROXY列表
NO_PROXY=localhost,127.0.0.1,internal.example.com
```

### 5. 性能问题

**症状**: 通过代理访问速度慢

**优化建议**:
- 使用本地代理服务器而非远程代理
- 考虑为本地服务配置NO_PROXY绕过代理
- 检查代理服务器性能和带宽

---

## 安全建议

### 1. 不要在代码中硬编码代理配置

❌ **错误做法**:
```typescript
const proxy = 'http://127.0.0.1:7980'; // 硬编码
```

✅ **正确做法**:
```bash
# .env文件中配置
HTTP_PROXY=http://127.0.0.1:7980
```

### 2. 保护代理凭据

如果代理需要认证：
```bash
# .env文件 (不要提交到Git)
HTTP_PROXY=http://username:password@proxy.example.com:8080
```

确保 `.env` 文件在 `.gitignore` 中：
```
.env
.env.local
```

### 3. 限制代理访问

使用 `NO_PROXY` 确保敏感的本地服务不经过代理：
```bash
NO_PROXY=localhost,127.0.0.1,*.internal,192.168.*
```

---

## 高级用法

### 编程方式更新代理配置

```typescript
import { getProxyManager } from '@solana-arb-bot/core';

const proxyManager = getProxyManager();

// 运行时更新配置
proxyManager.updateConfig({
  httpProxy: 'http://new-proxy.com:8080',
  noProxy: ['localhost', '*.internal.com'],
});
```

### 条件代理

根据环境启用不同代理：

```bash
# .env.development
HTTP_PROXY=http://dev-proxy:8080

# .env.production
HTTP_PROXY=http://prod-proxy:8080
```

### 监控代理使用

```typescript
import { getProxyManager } from '@solana-arb-bot/core';

const proxyManager = getProxyManager();
const config = proxyManager.getConfig();

console.log('代理状态:', {
  enabled: proxyManager.isProxyEnabled(),
  http: config.httpProxy,
  https: config.httpsProxy,
  noProxy: config.noProxy,
});
```

---

## 生产环境部署

### Docker环境

在 `docker-compose.yml` 中配置：

```yaml
services:
  solana-bot:
    environment:
      - HTTP_PROXY=http://proxy.internal:8080
      - HTTPS_PROXY=http://proxy.internal:8080
      - NO_PROXY=localhost,127.0.0.1
```

### Kubernetes环境

在部署配置中：

```yaml
env:
  - name: HTTP_PROXY
    value: "http://proxy.internal:8080"
  - name: HTTPS_PROXY
    value: "http://proxy.internal:8080"
  - name: NO_PROXY
    value: "localhost,127.0.0.1,.svc.cluster.local"
```

---

## 技术支持

如果遇到代理相关问题：

1. **检查日志** - 查看 `[ProxyConfig]` 模块的日志输出
2. **验证配置** - 确认环境变量正确设置
3. **测试代理** - 使用 `curl` 等工具测试代理可用性
4. **查看文档** - 参考本文档和代理服务器文档

---

## 相关文件

- **代理配置模块**: `packages/core/src/config/proxy-config.ts`
- **Jupiter集成**: `packages/core/src/solana/jupiter-swap.ts`
- **Jito优化器**: `packages/core/src/economics/jito-tip-optimizer.ts`
- **连接池**: `packages/core/src/solana/connection.ts`
- **Jito监控**: `tools/jito-monitor/index.ts`
- **环境变量示例**: `.env.example`
