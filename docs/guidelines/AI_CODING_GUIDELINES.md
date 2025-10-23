# 🤖 AI辅助Jupiter开发行为规范

> **版本**: 1.0  
> **生效日期**: 2025-10-22  
> **适用范围**: 所有使用AI辅助进行Jupiter相关开发的场景

---

## 核心原则（3条铁律）

### 1. 文档优先原则（Documentation First）

**规则**：遇到Jupiter相关问题 → 必须先查询官方文档 → 再编写代码

**错误做法** ❌：
```
用户："如何使用Ultra API？"
AI："你可以这样用..." [直接给出代码，未查询文档]
```

**正确做法** ✅：
```
用户："如何使用Ultra API？"
AI：[调用 mcp_Jupiter_SearchJupiter 查询官方文档]
AI："根据官方文档 https://dev.jup.ag/docs/ultra/get-order，
    Ultra API的特性是..."
```

**原因**：Jupiter API持续更新，只有官方文档最准确、最新。避免因信息过时导致的错误。

---

### 2. 直接对话原则（Direct Communication）

**规则**：禁止生成Markdown报告文档，必须直接在对话框中回复用户

**错误做法** ❌：
```
"我已经为您生成了详细的分析报告 ANALYSIS_REPORT.md，
请查看该文件了解详情..."
```

**正确做法** ✅：
```
"根据您的代码分析，问题出在第140行的800ms延迟。

问题原因：
Ultra API使用10秒滑动窗口限流，不是瞬时限流，
这个延迟没有必要且严重降低吞吐量。

解决方案：
将 await sleep(800) 改为 await sleep(50)

预期效果：
扫描速度提升2.3倍，API利用率从28.6%提升到60%"
```

**原因**：提高沟通效率，用户无需切换文件即可获得答案。

---

### 3. 透视本质原则（See Through the Surface）

**规则**：不要只看表象，要透过问题看本质

**案例对比**：

| 表象问题 | 本质分析 |
|---------|---------|
| "找不到套利机会" | API利用率28.6%，路径覆盖0.5%，存在800ms人为延迟 |
| "担心API限流" | Ultra API是10秒滑动窗口总计50次，不是每次请求间隔限制 |
| "查询延迟425ms很慢" | 实际是300ms API延迟+800ms人为延迟+串行架构问题 |
| "需要付费API" | 免费Ultra API有5 RPS，当前只用了1.43 RPS，利用率28.6% |

**分析方法**：
1. 定位具体代码行
2. 查询官方文档验证
3. 计算实际数据（不要猜测）
4. 找出根本原因（技术债、架构缺陷、配置错误）

---

## 开发工作流（5步标准流程）

### Step 1: 理解需求（Understand）

**检查清单**：
- [ ] 用户真正想解决什么问题？
- [ ] 是API使用问题 or 业务逻辑问题？
- [ ] 是配置错误 or 架构设计缺陷？
- [ ] 用户的技术背景和理解程度如何？

**示例**：
```
用户问："为什么找不到套利机会？"

错误理解：市场没有套利机会
正确理解：可能是配置问题、代码缺陷或参数设置不当
```

---

### Step 2: 查询文档（Query Documentation）

**使用MCP工具查询Jupiter官方文档**

**必须查询的场景**：
- ✅ API端点使用方法
- ✅ 限速规则和配额
- ✅ 请求/响应格式
- ✅ 错误码含义
- ✅ 最佳实践建议
- ✅ API版本差异（V1/V2/V3）
- ✅ 费用和定价
- ✅ Beta功能的限制

**查询示例**：
```typescript
// 查询API限速
mcp_Jupiter_SearchJupiter({
  query: "Ultra API rate limit sliding window dynamic"
})

// 查询错误处理
mcp_Jupiter_SearchJupiter({
  query: "common errors 429 404 response codes"
})

// 查询API对比
mcp_Jupiter_SearchJupiter({
  query: "Ultra API vs Legacy Swap API differences"
})
```

**查询策略**：
```
✅ 使用准确的关键词（而非模糊描述）
✅ 优先查询最新版本API（V3 > V2 > V1）
✅ 注意Deprecated（已废弃）标记
✅ 关注Beta功能的限制和注意事项
✅ 查看官方代码示例

❌ 不要猜测API行为
❌ 不要使用过时文档
❌ 不要忽略官方警告
❌ 不要跳过文档直接写代码
```

---

### Step 3: 分析代码（Analyze Code）

**分析步骤**：
1. 通读用户现有代码
2. 定位具体问题行（精确到行号）
3. 理解业务逻辑上下文
4. 结合官方文档验证实现
5. 计算实际数据（延迟、频率、利用率等）

**分析清单**：
- [ ] 代码是否符合官方示例？
- [ ] API调用参数是否正确？
- [ ] 错误处理是否完善？
- [ ] 性能瓶颈在哪里？
- [ ] 是否有不必要的延迟或等待？
- [ ] 配置参数是否合理？

**示例**：
```typescript
// 用户代码第140行
await sleep(800); // 在去程和回程查询之间添加延迟，避免突发流量触发API限流

分析：
1. 查询官方文档：Ultra API限流是10秒滑动窗口，计算总请求数
2. 计算影响：每路径1400ms → 可优化到600ms
3. 根本问题：对限流机制的误解
4. 改进方案：将800ms改为50ms或去除
```

---

### Step 4: 给出方案（Provide Solution）

**方案结构**（标准格式）：

```markdown
## 问题根源
[1-2句话说明本质问题]

## 官方文档依据
[Jupiter官方文档链接或MCP查询结果]

## 解决方案

### 方案A：保守优化（推荐先用）
[具体代码修改 + 配置调整]

预期效果：
- 指标1: 提升XX%
- 指标2: 从XX降低到XX

### 方案B：激进优化（测试后使用）
[更大改动的优化方案]

预期效果：
- 指标1: 提升XX倍
- 风险: [说明可能的副作用]

## 实施步骤
1. [Step 1]
2. [Step 2]
3. [验证结果]

## 风险提示
- [风险1]
- [风险2]
```

**示例**：
```markdown
## 问题根源
第140行的800ms延迟是对Ultra API限流机制的误解。Ultra API使用10秒滑动窗口，
计算的是总请求数（≤50次），而非单次请求间隔。

## 官方文档依据
根据 https://dev.jup.ag/docs/ultra/rate-limit：
"Rate limits are defined over 10-second windows using sliding window method."

## 解决方案

### 方案A：保守优化
修改 packages/jupiter-bot/src/workers/query-worker.ts 第140行：
```typescript
await sleep(50); // 从800ms改为50ms
```

预期效果：
- 单路径扫描时间: 1400ms → 700ms（快2倍）
- API利用率: 28.6% → 60%

### 方案B：激进优化
完全去除延迟：
```typescript
// await sleep(800); // 已优化：Ultra API滑动窗口限流无需延迟
```

预期效果：
- 单路径扫描时间: 1400ms → 600ms（快2.3倍）
- API利用率: 28.6% → 66.6%

## 实施步骤
1. 修改query-worker.ts第140行
2. 修改配置文件query_interval_ms为1000
3. 重启测试，观察15分钟
4. 监控429错误率，应<1%

## 风险提示
- 可能偶尔触发429错误（已有重试机制）
- 建议先用方案A测试1小时，无问题再用方案B
```

---

### Step 5: 验证可行性（Validate）

**验证清单**：
- [ ] 方案是否符合官方最佳实践？
- [ ] 是否引用了官方文档依据？
- [ ] 是否有副作用或风险？
- [ ] 是否需要用户测试验证？
- [ ] 预期效果是否量化？
- [ ] 是否给出了实施步骤？

---

## Jupiter特定规范

### 📋 API文档查询规范

**强制查询场景**：

| 场景 | 必须查询内容 | 示例查询 |
|------|------------|---------|
| 用户问API用法 | 端点、参数、响应格式 | "Ultra API order endpoint parameters" |
| 遇到错误码 | 错误含义、处理方法 | "response codes 429 rate limit" |
| 性能优化 | 限速、延迟、最佳实践 | "Ultra API rate limit best practices" |
| 费用计算 | 定价、手续费 | "Ultra API fees pricing" |
| API选择 | 不同API对比 | "Ultra vs Legacy Swap API" |
| 新功能集成 | Beta标记、限制 | "Ultra API Beta features" |

**Jupiter文档资源**：
- llms.txt: 简明文档索引
- llms-full.txt: 完整文档内容（含代码示例）
- dev.jup.ag: 官方开发者文档
- portal.jup.ag: API Key管理和监控

---

### 🔍 常见问题速查表

| 问题类型 | 优先查询文档路径 | 关键信息 |
|---------|----------------|---------|
| **API限速** | Rate Limit, Portal | 滑动窗口、配额、动态限速 |
| **错误码** | Common Errors, Response Codes | 429/404/500含义及处理 |
| **API对比** | Ultra vs Legacy Swap | 功能差异、性能对比 |
| **费用计算** | Pricing, Fees | 手续费率、免费/付费区别 |
| **最佳实践** | Best Practices | 官方推荐配置 |
| **版本差异** | API Reference V1/V2/V3 | Deprecated标记、迁移指南 |

---

### 🎯 API版本选择指南

**优先级**：
```
1. Ultra API (推荐) - 最新、最快、功能最全
   ├─ 免费（仅收swap fee 5-10 bps）
   ├─ 动态限速（基于交易量）
   ├─ Juno引擎（Iris + RTSE + 预测执行）
   └─ RPC-less架构

2. Legacy Swap API - 需要高度定制时使用
   ├─ 支持CPI调用
   ├─ 可选择特定DEX
   └─ 需要自己管理RPC、手续费等

3. Pro API - 付费高频场景
   └─ 100-5000 req/10s（分层定价）
```

**决策树**：
```
需要自定义交易指令？
  ├─ 是 → Legacy Swap API
  └─ 否 → 需要高频查询（>5 RPS）？
         ├─ 是 → Pro API
         └─ 否 → Ultra API（免费，推荐）
```

---

## 代码质量规范

### ✅ 必须遵守

#### 1. 引用官方示例

**正确** ✅：
```typescript
// 来源：https://dev.jup.ag/docs/ultra/get-order
const orderResponse = await (
  await fetch(
    'https://api.jup.ag/ultra/v1/order' +
    '?inputMint=So11111111111111111111111111111111111111112' +
    '&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' +
    '&amount=100000000' +
    '&taker=YOUR_WALLET_ADDRESS',
    {
      headers: {
        'X-API-Key': 'YOUR_API_KEY'
      }
    }
  )
).json();
```

**错误** ❌：
```typescript
// 自己编造的API端点和参数
const response = await fetch('/jup/swap', {
  method: 'POST',
  body: JSON.stringify({ from: 'SOL', to: 'USDC' })
});
```

---

#### 2. 保持类型安全

**正确** ✅：
```typescript
// 根据官方文档定义接口
interface UltraOrderResponse {
  transaction: string;
  requestId: string;
  estimatedOut: number;
  slippageBps: number;
  feeBps: number;
  routePlan: RoutePlanStep[];
}

interface RoutePlanStep {
  swapInfo: {
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
  };
}

const response: UltraOrderResponse = await orderResponse.json();
```

**错误** ❌：
```typescript
// 使用any类型
const data: any = await response.json();
const amount = data.amount; // 不知道类型
```

---

#### 3. 完善错误处理

**正确** ✅：
```typescript
// 根据官方文档处理特定错误码
try {
  const response = await axios.get(apiUrl);
  return response.data;
} catch (error: any) {
  // 429: 限流错误 - 等待后重试
  if (error.response?.status === 429) {
    console.warn('Rate limited, retrying in 2s...');
    await sleep(2000);
    return queryWithRetry(apiUrl);
  }
  
  // 404: 无路由 - 正常情况，返回null
  if (error.response?.status === 404) {
    return null;
  }
  
  // 502: 暂时性错误 - 记录但不报警
  if (error.response?.status === 502) {
    console.warn('Temporary gateway error');
    return null;
  }
  
  // 其他错误 - 记录并抛出
  console.error('API error:', error.message);
  throw error;
}
```

**错误** ❌：
```typescript
// 笼统catch，不区分错误类型
try {
  const response = await axios.get(apiUrl);
  return response.data;
} catch (e) {
  console.log(e);
  return null; // 所有错误都返回null，无法诊断问题
}
```

---

#### 4. API调用优化

**正确** ✅：
```typescript
// 理解限流机制后的优化
async function queryBridgeArbitrage(inputMint: string, bridgeMint: string) {
  // Ultra API: 10秒滑动窗口，50次请求限制
  // 无需在两次请求间人为延迟
  
  const outQuote = await fetchOrder(inputMint, bridgeMint);
  // ✅ 直接发送第二次请求，无延迟
  const backQuote = await fetchOrder(bridgeMint, inputMint);
  
  return { outQuote, backQuote };
}
```

**错误** ❌：
```typescript
async function queryBridgeArbitrage(inputMint: string, bridgeMint: string) {
  const outQuote = await fetchOrder(inputMint, bridgeMint);
  // ❌ 不必要的延迟（基于对限流机制的误解）
  await sleep(800);
  const backQuote = await fetchOrder(bridgeMint, inputMint);
  
  return { outQuote, backQuote };
}
```

---

### 🎯 性能优化检查清单

每次编写API调用代码时，检查：

- [ ] **API调用是否批量化？**
  - 能并发的不要串行
  - 能批量的不要单个

- [ ] **是否有不必要的延迟？**
  - 检查所有`sleep()`调用
  - 验证延迟的必要性

- [ ] **限流配额是否充分利用？**
  - 计算实际RPS
  - 对比API限额
  - 利用率应>60%

- [ ] **并发控制是否合理？**
  - 避免过度并发导致429
  - 实现指数退避重试

- [ ] **是否缓存了可缓存数据？**
  - 代币元数据
  - 路由信息
  - 价格数据（短期缓存）

---

## 回复用户规范

### 📝 标准回复模板

#### 模板1：问题诊断型

```markdown
根据您的代码分析：

## 问题根源
[1-2句话说明本质问题，定位到具体代码行]

## 官方文档依据
[Jupiter官方文档链接或关键引用]
根据官方文档：[关键信息]

## 解决方案

### 立即修改（5分钟实施）
**修改文件**: [文件路径]
**具体改动**: 
```[language]
// 修改前
[原代码]

// 修改后
[新代码]
```

**预期效果**：
- [量化指标1]: XX → XX（提升XX%）
- [量化指标2]: XX → XX

### 后续优化（可选）
[更深入的优化建议]

## 风险提示
- [风险1及规避方法]
- [风险2及规避方法]
```

**实例**：
```markdown
根据您的代码分析：

## 问题根源
packages/jupiter-bot/src/workers/query-worker.ts 第140行的 await sleep(800) 
是对Ultra API限流机制的误解。Ultra API使用10秒滑动窗口限流，计算的是总请求数
（≤50次），而非单次请求间隔。

## 官方文档依据
https://dev.jup.ag/docs/ultra/rate-limit
"Rate limits are defined over 10-second windows using sliding window method.
Dynamic Rate Limits: Base Quota 50 + Added Quota (based on swap volume)"

## 解决方案

### 立即修改（5分钟实施）
**修改文件**: packages/jupiter-bot/src/workers/query-worker.ts
**具体改动**: 
```typescript
// 修改前（第140行）
await sleep(800); // 在去程和回程查询之间添加延迟，避免突发流量触发API限流

// 修改后
await sleep(50); // 优化：Ultra API滑动窗口限流，只需极小延迟避免网络拥堵
```

**预期效果**：
- 单路径扫描时间: 1400ms → 700ms（快2倍）
- API利用率: 28.6% → 60%
- 机会发现延迟: 降低50%

### 后续优化（可选）
完全去除延迟并增加并发查询，可将API利用率提升到90%+

## 风险提示
- 可能偶尔触发429错误（代码已有重试机制）
- 建议先测试1小时，观察429错误频率
```

---

#### 模板2：技术咨询型

```markdown
根据Jupiter官方文档：

## API特性
[官方文档描述或MCP查询结果]

## 使用示例
```[language]
[官方代码示例]
```

## 参数说明
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| [参数1] | [类型] | ✅/❌ | [说明] |

## 注意事项
- [官方警告1]
- [官方限制2]
- [最佳实践3]

## 相关资源
- 官方文档: [链接]
- 代码示例: [链接]
```

---

#### 模板3：性能优化型

```markdown
## 当前性能分析

**实测数据**：
- [指标1]: [当前值]
- [指标2]: [当前值]
- API利用率: XX%

**瓶颈定位**：
1. [瓶颈1 + 具体代码行]
2. [瓶颈2 + 具体代码行]

## 优化方案对比

| 方案 | 实施难度 | 提升幅度 | 风险 | 推荐度 |
|------|---------|---------|------|--------|
| 方案A | 低 | 2倍 | 低 | ⭐⭐⭐⭐⭐ |
| 方案B | 中 | 5倍 | 中 | ⭐⭐⭐⭐ |
| 方案C | 高 | 10倍 | 高 | ⭐⭐⭐ |

## 推荐实施路径
1. [先实施低风险方案A]
2. [观察效果1小时]
3. [无问题再实施方案B]

## 预期最终效果
[量化的性能提升数据]
```

---

### ⚠️ 禁止事项

#### 严格禁止

| ❌ 禁止行为 | 原因 | 正确做法 |
|-----------|------|---------|
| 生成独立的Markdown报告文档 | 降低沟通效率 | 直接在对话框回复 |
| 不查询文档就回答Jupiter API问题 | 可能信息过时或错误 | 先用MCP查询官方文档 |
| 使用过时的API版本（V1/V2） | 功能缺失、性能差 | 优先使用最新版（V3） |
| 忽略"Deprecated"标记 | 未来可能移除 | 建议用户迁移到新API |
| 猜测API限速或费用 | 误导用户 | 查询官方Portal文档 |
| 只给建议不给代码 | 用户难以实施 | 给出可直接运行的代码 |
| 使用模糊的优化效果描述 | 无法评估价值 | 量化数据（如"快2.3倍"） |

---

### ✅ 提倡事项

#### 强烈推荐

| ✅ 推荐行为 | 原因 | 示例 |
|-----------|------|------|
| 引用官方文档原文 | 权威、准确 | "根据官方文档...[引用]" |
| 给出可直接运行的代码 | 降低实施门槛 | 完整的代码片段（非伪代码） |
| 量化优化效果 | 便于决策 | "快2.3倍"、"从28.6%提升到60%" |
| 说明风险和副作用 | 避免意外 | "可能触发429，需实现重试" |
| 分阶段给出方案 | 降低风险 | "保守方案→测试→激进方案" |
| 提供实施步骤 | 可操作性强 | "Step 1: ... Step 2: ..." |
| 引用代码行号 | 精确定位 | "第140行的 await sleep(800)" |

---

## 实战案例参考

### 案例1：API限速问题

**用户问**："我的Ultra API老是被限流怎么办？"

#### ❌ 错误做法

```
AI: "你的请求太频繁了，建议降低请求频率，每次请求间隔2秒以上。"

问题：
1. 未查询官方文档
2. 未分析用户代码
3. 建议可能不准确（Ultra API不是按间隔限流）
```

#### ✅ 正确做法

```
AI: 让我先查询Ultra API的官方限流规则...

[调用 mcp_Jupiter_SearchJupiter 查询 "Ultra API rate limit"]

根据官方文档 https://dev.jup.ag/docs/ultra/rate-limit：

Ultra API使用动态限流：
- 基础配额：50 requests / 10秒（滑动窗口）
- 动态配额：基于您的交易量增长

请分享您的代码，我帮您分析实际请求频率。

[用户分享代码后]

分析您的代码：
- 当前请求频率：10请求 / 7秒 ≈ 1.43 RPS
- API限额：50请求 / 10秒 = 5 RPS
- 利用率：28.6%

您远未达到限流阈值。触发429可能是：
1. 瞬时突发（代码中的并发问题）
2. 网络问题导致请求重试
3. 其他程序共用API Key

解决方案：
[具体代码修改]
```

---

### 案例2：代码延迟问题

**用户问**："为什么我的扫描这么慢？"

#### ❌ 错误做法

```
AI: "你的代码需要优化一下，建议改进算法效率。"

问题：
1. 没有分析具体代码
2. 没有定位瓶颈
3. 建议过于笼统，无法实施
```

#### ✅ 正确做法

```
AI: 让我分析您的代码找出瓶颈...

[阅读用户代码]

瓶颈定位：
packages/jupiter-bot/src/workers/query-worker.ts 第140行

```typescript
await sleep(800); // 在去程和回程查询之间添加延迟
```

问题根源：
这800ms延迟是对API限流机制的误解。

[查询官方文档]
根据官方文档，Ultra API限流是"10秒滑动窗口"，计算的是窗口内总请求数，
不是每次请求的间隔。这个延迟没有必要。

计算影响：
- 单路径时间：300ms(去程) + 800ms(延迟) + 300ms(回程) = 1400ms
- 5条路径：7秒/轮
- 如果去掉延迟：3秒/轮（快2.3倍）

解决方案：
将第140行改为：
```typescript
await sleep(50); // 优化：只需极小延迟避免网络拥堵
```

预期效果：
- 扫描速度：7秒/轮 → 3秒/轮（快2.3倍）
- 机会发现延迟：降低57%
```

---

### 案例3：API选择问题

**用户问**："我应该用Ultra API还是Legacy Swap API？"

#### ❌ 错误做法

```
AI: "建议用Ultra API，它更快。"

问题：
1. 没有了解用户需求
2. 没有说明两者区别
3. 没有给出决策依据
```

#### ✅ 正确做法

```
AI: 让我查询官方文档对比这两个API...

[调用 mcp_Jupiter_SearchJupiter]

根据官方文档对比：

Ultra API：
✅ 免费（仅收swap fee 5-10 bps）
✅ Juno路由引擎（最快最新）
✅ RPC-less架构（Jupiter管理）
✅ 95%交易<2秒执行
✅ 动态限速（基于交易量）
❌ 不支持自定义指令
❌ 不支持CPI调用

Legacy Swap API：
✅ 支持自定义指令
✅ 支持CPI调用
✅ 可选择特定DEX
❌ 需要自己管理RPC
❌ 需要自己优化手续费
❌ 需要自己处理交易广播

决策建议：

您的需求是什么？

1. 如果是普通swap/套利 → Ultra API（推荐）
2. 如果需要在程序中调用（CPI） → Legacy Swap API
3. 如果需要自定义交易指令 → Legacy Swap API

对于您的闪电贷套利场景，推荐Ultra API，因为：
- 速度更快（关键）
- 无需管理RPC
- 成本更低
```

---

## 质量自检清单

**每次回复用户前，必须确认**：

### 📋 基础检查（必须全部✅）

- [ ] **文档查询**：是否查询了Jupiter官方文档？
- [ ] **文档引用**：是否给出了官方文档依据或链接？
- [ ] **对话回复**：是否直接在对话框回复（未生成独立报告）？
- [ ] **本质分析**：是否透视到问题本质（非表象）？
- [ ] **代码实施**：是否提供了可直接运行的代码？
- [ ] **量化效果**：是否量化了优化效果（数据）？
- [ ] **风险说明**：是否说明了风险和限制？

### 🎯 高质量检查（推荐全部✅）

- [ ] **代码定位**：是否精确到文件路径和行号？
- [ ] **数据计算**：是否计算了实际数据（而非估算）？
- [ ] **分阶段方案**：是否提供了保守→激进的多个方案？
- [ ] **实施步骤**：是否给出了清晰的实施步骤？
- [ ] **官方示例**：代码是否基于官方示例（而非自创）？
- [ ] **类型安全**：TypeScript代码是否有类型定义？
- [ ] **错误处理**：是否处理了常见错误码（429/404）？

### 🚀 卓越检查（加分项）

- [ ] **性能对比**：是否给出了优化前后的对比数据？
- [ ] **API利用率**：是否计算了API配额利用率？
- [ ] **案例参考**：是否引用了类似的官方案例？
- [ ] **测试建议**：是否建议了验证方法？
- [ ] **监控指标**：是否建议了需要监控的指标？

---

## 常见错误及纠正

### 错误1：跳过文档直接给答案

**错误示例** ❌：
```
用户："Ultra API限流是多少？"
AI："Ultra API限速是每秒5次请求。"
```

**正确示例** ✅：
```
用户："Ultra API限流是多少？"
AI：[调用 mcp_Jupiter_SearchJupiter 查询 "Ultra API rate limit"]

根据官方文档 https://dev.jup.ag/docs/ultra/rate-limit：

Ultra API使用动态限流机制：
- 基础配额：50 requests / 10秒（滑动窗口）= 5 RPS
- 动态配额：基于交易量自动增长
  - $0交易量：50 req/10s
  - $10,000：51 req/10s
  - $100,000：61 req/10s
  - $1,000,000：165 req/10s

注意是10秒滑动窗口，不是固定1秒间隔。
```

---

### 错误2：生成报告文档

**错误示例** ❌：
```
用户："分析我的系统配置"
AI："我已为您生成详细分析报告：SYSTEM_ANALYSIS.md，请查看..."
```

**正确示例** ✅：
```
用户："分析我的系统配置"
AI："根据您的配置分析：

当前配置：
- 初始代币：1个（SOL）
- 桥接代币：5个
- 总路径：5条

问题：
路径覆盖严重不足（仅0.5%市场），建议增加到10个初始代币。

优化方案：
修改 configs/flashloan-dryrun.toml：
```toml
mints_file = "mints-high-liquidity.txt"  # 改用完整列表
```

预期效果：路径数从5条增加到65条（13倍提升）"
```

---

### 错误3：只看表象不分析本质

**错误示例** ❌：
```
用户："找不到套利机会"
AI："可能是市场波动小，建议等待市场波动增加。"
```

**正确示例** ✅：
```
用户："找不到套利机会"
AI："让我分析您的系统配置...

表象问题：找不到套利机会
本质原因：
1. 路径覆盖不足：仅监控5条路径（市场0.5%）
2. 扫描延迟：每轮7秒（机会存活时间通常<3秒）
3. 利润阈值过高：0.005 SOL（过滤掉70%真实机会）

这不是市场问题，是系统配置问题。

解决方案：
[具体配置修改]

预期效果：机会发现率提升20-50倍"
```

---

### 错误4：给建议不给代码

**错误示例** ❌：
```
用户："如何优化查询速度？"
AI："建议去掉不必要的延迟，优化并发控制，提升API利用率。"
```

**正确示例** ✅：
```
用户："如何优化查询速度？"
AI："具体优化方案：

修改 packages/jupiter-bot/src/workers/query-worker.ts：

```typescript
// 第140行 - 修改前
await sleep(800);

// 修改后
await sleep(50); // 优化：Ultra API滑动窗口限流
```

修改 configs/flashloan-dryrun.toml：

```toml
# 第106行
query_interval_ms = 1000  # 从4000改为1000
```

重启测试：
```bash
.\start-flashloan-dryrun.bat
```

预期效果：
- 扫描速度：快2.3倍
- API利用率：28.6% → 60%
"
```

---

## 附录

### A. Jupiter API快速参考

| API | URL | 费用 | 限速 | 用途 |
|-----|-----|------|------|------|
| Ultra | api.jup.ag/ultra | 免费+swap fee | 50/10s动态 | 推荐用于swap |
| Legacy Swap | api.jup.ag/swap | 免费 | 视订阅 | 自定义交易 |
| Pro | api.jup.ag | 付费 | 100-5000/10s | 高频场景 |
| Lite | lite-api.jup.ag | 完全免费 | 60/60s | 测试开发 |

### B. MCP工具使用示例

```typescript
// 查询API文档
mcp_Jupiter_SearchJupiter({
  query: "Ultra API rate limit dynamic quota"
})

// 查询错误处理
mcp_Jupiter_SearchJupiter({
  query: "common errors 429 404 500 response codes"
})

// 查询最佳实践
mcp_Jupiter_SearchJupiter({
  query: "best practices swap arbitrage"
})

// 查询API对比
mcp_Jupiter_SearchJupiter({
  query: "Ultra API vs Legacy Swap API differences features"
})
```

### C. 常用官方文档链接

- **Ultra API**: https://dev.jup.ag/docs/ultra/
- **Rate Limit**: https://dev.jup.ag/docs/ultra/rate-limit
- **Legacy Swap**: https://dev.jup.ag/docs/swap/
- **API Reference**: https://dev.jup.ag/api-reference/
- **Portal**: https://portal.jup.ag/
- **Best Practices**: https://dev.jup.ag/docs/*/best-practices

### D. 错误码快速参考

| 错误码 | 含义 | 处理方法 |
|-------|------|---------|
| 429 | 限流 | 等待2秒后重试 |
| 404 | 无路由 | 正常情况，返回null |
| 500 | 服务器错误 | 记录日志，重试 |
| 502 | 网关错误 | 暂时性错误，重试 |

---

## 总结

### 核心精神（牢记于心）

1. **文档为王**：先查官方文档，再动手编码
2. **直接沟通**：对话框回复，禁止生成报告
3. **透视本质**：不看表象，深挖根因
4. **实战导向**：给代码不给建议，给数据不给感觉
5. **用户至上**：降低理解成本，提供可直接执行的方案

### 一句话口诀

> **"查文档、析代码、透本质、给方案、验效果"**

### Jupiter开发黄金法则

> **"当不确定时，永远相信官方文档；**  
> **当有疑问时，用MCP工具查询验证；**  
> **当给方案时，直接对话不写报告。"**

---

**版本历史**：
- v1.0 (2025-10-22): 初始版本

**维护者**: AI Development Team  
**更新频率**: 随Jupiter API更新而更新



