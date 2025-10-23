# 🔬 Jupiter API 速率限制深度分析与优化方案

## 📋 当前使用的API

### 确认信息

**API端点**: `https://lite-api.jup.ag/swap/v1/quote`

**代码位置**: `packages/jupiter-bot/src/workers/query-worker.ts:244,337`

```typescript
// 去程查询
responseOut = await axios.get(
  `https://lite-api.jup.ag/swap/v1/quote?${paramsOut}`,
  axiosConfig
);

// 回程查询
responseBack = await axios.get(
  `https://lite-api.jup.ag/swap/v1/quote?${paramsBack}`,
  axiosConfig
);
```

---

## 📊 Jupiter Lite API 官方速率限制

### 固定速率限制（Fixed Rate Limit）

根据Jupiter官方文档（`llms-full.txt:11597`）：

| API类型 | 每分钟请求数 | 每周期请求数 | 滑动窗口周期 | 需要API Key |
|---------|-------------|-------------|-------------|------------|
| **Lite** | **60** | **60** | **60秒** | ❌ 不需要 |
| Pro I | ~600 | 100 | 10秒 | ✅ 需要 |
| Pro II | ~3,000 | 500 | 10秒 | ✅ 需要 |
| Pro III | ~6,000 | 1,000 | 10秒 | ✅ 需要 |
| Pro IV | ~30,000 | 5,000 | 10秒 | ✅ 需要 |

### Lite API 限制详情

```
速率限制: 60 requests / 60 seconds
计算方式: 滑动窗口 (Sliding Window)
限制级别: 每个IP地址
响应码: 429 (超过限制时)
```

**关键点**:
- 🔴 Lite API是**最严格的限制**
- 🔴 60秒窗口内只能60次请求
- 🔴 不区分不同的endpoint（`/quote`, `/price`等共享额度）
- ⚠️ 超过限制会返回 `429 Too Many Requests`

---

## 🧮 您当前的查询频率计算

### 优化前配置（已修改）

```
Worker数量: 3
查询间隔: 80ms
桥接代币: 4个 (USDC, USDT, JUP, RAY)

每轮查询次数:
  - 每个Worker: 4个桥接代币 × 2方向 = 8次API调用
  - 3个Worker: 8 × 3 = 24次API调用/轮

查询频率:
  - 每80ms一轮
  - 1000ms / 80ms = 12.5 轮/秒
  - 24次 × 12.5轮 = 300次API调用/秒
  - 300次/秒 × 60秒 = 18,000次/分钟 ❌

与限制对比:
  18,000次/分钟 vs 60次/分钟 = 超限 300倍！🔴
```

**这就是为什么96%查询失败的根本原因！**

---

### 优化后配置（当前）

```
Worker数量: 1 ✅
查询间隔: 200ms ✅
桥接代币: 2个 (USDC, USDT) ✅

每轮查询次数:
  - 1个Worker: 2个桥接代币 × 2方向 = 4次API调用

查询频率:
  - 每200ms一轮
  - 1000ms / 200ms = 5 轮/秒
  - 4次 × 5轮 = 20次API调用/秒
  - 20次/秒 × 60秒 = 1,200次/分钟 ❌

与限制对比:
  1,200次/分钟 vs 60次/分钟 = 仍超限 20倍！🔴
```

**当前配置仍然超过Lite API限制20倍！**

---

## 🎯 正确的速率限制计算

### 安全限制计算

为了保持在Lite API限制内，需要：

```
限制: 60次 / 60秒 = 1次/秒

安全余量（留20%缓冲）:
  60 × 0.8 = 48次/分钟 = 0.8次/秒

每轮查询次数: 4次（1 Worker × 2代币 × 2方向）

最大查询频率:
  0.8次/秒 ÷ 4次/轮 = 0.2 轮/秒
  
最小查询间隔:
  1秒 / 0.2轮 = 5秒/轮 = 5000ms
```

### 推荐配置

#### 方案A: 安全保守（推荐）⭐⭐⭐⭐⭐

```toml
# configs/flashloan-dryrun.toml
[opportunity_finder]
worker_count = 1
query_interval_ms = 5000  # 5秒/轮

# 实际速率
每轮: 4次API调用
频率: 0.2轮/秒
总QPS: 0.8次/秒
每分钟: 48次 ✅ (低于60次限制)
成功率预期: 95-99%
```

**优点**:
- ✅ 100%不会触发速率限制
- ✅ 极高成功率
- ✅ 系统稳定

**缺点**:
- ⚠️ 机会发现延迟较高（每5秒一轮）
- ⚠️ 可能错过短暂的套利机会

---

#### 方案B: 激进优化（测试边界）⭐⭐⭐

```toml
[opportunity_finder]
worker_count = 1
query_interval_ms = 4000  # 4秒/轮

# 实际速率
每轮: 4次API调用
频率: 0.25轮/秒
总QPS: 1.0次/秒
每分钟: 60次 ⚠️ (刚好达到限制)
成功率预期: 70-90%
```

**优点**:
- ✅ 最大化使用Lite API额度
- ✅ 更快发现机会

**缺点**:
- ⚠️ 可能偶尔触发429
- ⚠️ 需要实现重试机制

---

#### 方案C: 减少查询次数（创新方案）⭐⭐⭐⭐

```toml
[opportunity_finder]
worker_count = 1
query_interval_ms = 2000  # 2秒/轮

# 但只查询单向（去程或回程）
# 修改代码逻辑，先去程，下一轮回程
```

**修改**: 改为交替查询去程和回程

```typescript
// 伪代码
let roundType = 'outbound'; // or 'return'

if (roundType === 'outbound') {
  // 只查询 SOL → Bridge
  roundType = 'return';
} else {
  // 只查询 Bridge → SOL
  roundType = 'outbound';
}

// 每轮: 2次API调用
// 频率: 0.5轮/秒
// 总QPS: 1.0次/秒
// 每分钟: 60次 (刚好限制)
```

**优点**:
- ✅ 降低每轮API调用数
- ✅ 可以缩短查询间隔到2秒
- ✅ 充分利用API额度

**缺点**:
- ⚠️ 需要修改代码逻辑
- ⚠️ 完整套利机会发现需要两轮（4秒）

---

## 🚀 最终推荐方案

### 立即实施: 方案A（5秒间隔）

**修改**:
```toml
# configs/flashloan-dryrun.toml
query_interval_ms = 5000  # 从200改为5000
```

**预期效果**:
- ✅ 成功率: 95-99%（从当前的3%提升）
- ✅ 不会触发429
- ✅ 系统极其稳定
- ⚠️ 每小时约720次查询（可发现10-50个机会）

---

### 中期升级: 切换到Pro API ⭐⭐⭐⭐⭐

**您已有Pro API Key**: `3cf45ad3-8dfe-4c2d-86b2-11e45a4a275b`

#### Pro I 方案

```
速率限制: 600次/分钟 = 10次/秒
您的API Key等级: 需要确认（可能是Pro I或更高）

使用Pro I的配置:
worker_count = 1
query_interval_ms = 400  # 0.4秒/轮

每轮: 4次API调用
频率: 2.5轮/秒
总QPS: 10次/秒
每分钟: 600次 ✅ (刚好Pro I限制)
成功率预期: 90-95%
```

**修改代码**:
```typescript
// packages/jupiter-bot/src/workers/query-worker.ts
responseOut = await axios.get(
  `https://api.jup.ag/swap/v1/quote?${paramsOut}`,  // 改为api.jup.ag
  {
    ...axiosConfig,
    headers: {
      ...axiosConfig.headers,
      'X-API-Key': config.apiKey,  // 添加API Key
    }
  }
);
```

**优势**:
- ✅ 速率限制提升10倍（60→600/分钟）
- ✅ 查询间隔可缩短到400ms
- ✅ 机会发现速度提升12.5倍
- ✅ 成功率仍然很高

---

### 长期方案: Ultra API（终极解决方案）

```
API: https://lite-api.jup.ag/ultra/v1/order
速率限制: 50次/10秒（基础） + 动态扩展
特点: 
  - 免费使用（Lite版本无需API Key）
  - 测试显示100%成功率
  - 使用iris路由器（更先进）
```

**配置**:
```toml
worker_count = 1
query_interval_ms = 2000  # 2秒/轮

每轮: 4次API调用
频率: 0.5轮/秒
总QPS: 2次/秒
每10秒: 20次 ✅ (低于50次基础限制)
```

---

## 📊 方案对比表

| 方案 | 间隔 | QPS | 每分钟 | vs限制 | 成功率 | 机会/小时 | 推荐度 |
|------|------|-----|--------|--------|--------|----------|--------|
| **当前配置** | 200ms | 20 | 1200 | 超限20倍 | 3% | 0-5 | ❌ |
| **方案A (Lite 5s)** | 5000ms | 0.8 | 48 | 安全 | 95-99% | 10-50 | ⭐⭐⭐⭐⭐ |
| **方案B (Lite 4s)** | 4000ms | 1.0 | 60 | 临界 | 70-90% | 20-80 | ⭐⭐⭐ |
| **Pro I (400ms)** | 400ms | 10 | 600 | 安全 | 90-95% | 100-500 | ⭐⭐⭐⭐⭐ |
| **Ultra (2s)** | 2000ms | 2 | 120 | 安全 | 95-99% | 50-200 | ⭐⭐⭐⭐⭐ |

---

## 🎯 立即行动建议

### 步骤1: 修改为5秒间隔（立即）

```toml
# configs/flashloan-dryrun.toml
[opportunity_finder]
worker_count = 1
query_interval_ms = 5000  # 🔥 关键修改
```

### 步骤2: 重新编译并测试

```bash
pnpm run build
pnpm run flashloan-dryrun
```

### 步骤3: 观察统计（10轮后）

**预期看到**:
```
Success Rate: 95-99% (从3%大幅提升)
No Route Rate: 1-5% (从96%大幅降低)
Opportunities found: 10-30
```

### 步骤4: 考虑升级到Pro API

如果5秒间隔太慢，可以：
1. 确认您的Pro API Key等级
2. 切换到`api.jup.ag`
3. 缩短间隔到400ms（Pro I）或更短

---

## 📝 技术细节

### 滑动窗口机制

```
Lite API: 60秒滑动窗口

时间轴示例:
0s ────┬────────────────────────────────┬──> 60s
       │   可用: 60次                    │
       │                                 │
       └─────────────────────────────────┘
       滑动窗口（任意60秒内不超过60次）

示例:
  0-10s:  20次 ✅
  10-20s: 20次 ✅
  20-30s: 21次 ❌ (0-30s内已41次，超限)
```

### 429错误处理

当前代码已实现基本错误处理，但需要添加重试逻辑：

```typescript
// 建议添加的重试逻辑
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'] || 60;
  console.log(`Rate limited, waiting ${retryAfter}s`);
  await new Promise(r => setTimeout(r, retryAfter * 1000));
  // 重试请求
}
```

---

## ✅ 总结

### 根本原因

**您的查询频率超过Lite API限制20倍！**

```
当前: 1,200次/分钟
限制: 60次/分钟
超限: 20倍 🔴
```

### 解决方案

**立即**: 改为5秒间隔 → 成功率95%+  
**中期**: 升级到Pro API → 查询间隔400ms  
**长期**: 切换Ultra API → 最优性能

### 预期效果

| 指标 | 当前 | 优化后(5s) | 提升 |
|------|------|-----------|------|
| 成功率 | 3% | 95-99% | **30倍** |
| 机会/小时 | 0-5 | 10-50 | **5-10倍** |
| 429错误 | 频繁 | 极少 | **消除** |

---

**创建时间**: 2025-10-23 23:58  
**紧急程度**: 🔴 高（当前配置仍超限20倍）  
**建议行动**: 立即修改为5000ms间隔

