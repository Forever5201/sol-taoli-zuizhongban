# 🐛 Ultra API Bug 根本原因分析

## 问题现象

```
[API_DEBUG] swap1Result status: 404
[API_DEBUG] swap1Result full response: "<html><head><title>404 Not Found</title></head>..."
Built 0 instructions with 0 ALTs (quote_age=3ms)
RPC simulation failed: No arbitrage instructions provided
```

---

## 🔍 根本原因

**主线程试图用 Ultra API 的 quote 调用一个不存在的端点：`/swap-instructions`**

### API 架构差异

#### **Ultra API** (`https://api.jup.ag/ultra`)
```
GET  /v1/order      → 返回 base64 编码的未签名交易（完整交易，不是指令）
POST /v1/execute    → 执行已签名的交易
❌ 没有 /swap-instructions 端点！
```

#### **Legacy Swap API** (`https://lite-api.jup.ag/swap/v1`)
```
GET  /quote               → 返回报价对象
POST /swap-instructions   → 返回交换指令数组
POST /swap                → 返回完整交易
```

---

## 🔬 代码追踪

### 1. Worker (正确使用 Ultra API)

**文件**: `packages/jupiter-bot/src/workers/query-worker.ts`

```typescript
// Line 278-287: 去程查询
const response = await axios.get(
  `https://api.jup.ag/ultra/v1/order?${paramsOut}`,  // ✅ 正确的 Ultra API 端点
  {
    headers: { 'X-API-Key': config.apiKey || '' }
  }
);

// 返回的 quoteOut 包含：
// - transaction: base64 编码的未签名交易（完整的 VersionedTransaction）
// - routePlan: 路由计划
// - inAmount, outAmount: 金额
// - priceImpactPct: 价格影响
// - 等等...
```

**Worker 缓存的数据**:
```typescript
return {
  // ...
  outboundQuote: quoteOut,   // Ultra API 的 /v1/order 响应
  returnQuote: quoteBack,    // Ultra API 的 /v1/order 响应
  // ...
};
```

### 2. 主线程 (错误使用 Ultra API)

**文件**: `packages/jupiter-bot/src/flashloan-bot.ts`

```typescript
// Line 206-224: 创建 Jupiter Swap 客户端
private createJupiterSwapClient(): AxiosInstance {
  const baseURL = this.config.jupiterApi?.endpoint || 'https://api.jup.ag/ultra';
  // ⚠️ jupiterSwapAxios 的 baseURL 是 Ultra API
  return axios.create({ baseURL, ... });
}

// Line 1769-1785: 构建交易时（BUG 所在！）
const [swap1Result, swap2Result] = await Promise.all([
  this.jupiterSwapAxios.post('/swap-instructions', {  // ❌ Ultra API 没有这个端点！
    quoteResponse: opportunity.outboundQuote,  // Ultra 的 quote 格式
    userPublicKey: this.keypair.publicKey.toBase58(),
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
  }, { timeout: 3000 }),
  // ...
]);

// 结果：
// - 请求 https://api.jup.ag/ultra/swap-instructions
// - 返回 404 Not Found
// - swapInstruction 字段不存在
// - 构建 0 条指令
```

---

## 💡 Ultra API 的正确用法

根据 Jupiter 官方文档 (`llms-full.txt` line 9006-9110):

### 步骤 1: 获取订单（Worker 已完成）
```typescript
const orderResponse = await fetch(
  'https://api.jup.ag/ultra/v1/order?inputMint=...&outputMint=...&amount=...',
  { headers: { 'X-API-Key': apiKey } }
).then(r => r.json());

// orderResponse 包含:
// {
//   transaction: "base64-encoded-unsigned-transaction",  // ✅ 直接使用这个！
//   requestId: "uuid",
//   routePlan: [...],
//   inAmount: "...",
//   outAmount: "...",
//   ...
// }
```

### 步骤 2: 反序列化并签名交易
```typescript
import { VersionedTransaction } from '@solana/web3.js';

// ✅ 直接从 orderResponse.transaction 反序列化
const transaction = VersionedTransaction.deserialize(
  Buffer.from(orderResponse.transaction, 'base64')
);

// 签名
transaction.sign([wallet]);

// 序列化为 base64
const signedTransaction = Buffer.from(transaction.serialize()).toString('base64');
```

### 步骤 3: 提交执行（可选）
```typescript
const executeResponse = await fetch(
  'https://lite-api.jup.ag/ultra/v1/execute',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signedTransaction,
      requestId: orderResponse.requestId,
    }),
  }
).then(r => r.json());
```

---

## 🛠️ 修复方案

### 方案 A: 使用 Ultra API 的 transaction 字段（推荐）

**优点**:
- ✅ 完全兼容 Worker 缓存的 quote
- ✅ 无需额外 API 调用
- ✅ 最低延迟

**实现**:
```typescript
private async buildTransactionFromCachedQuote(
  opportunity: ArbitrageOpportunity,
  opportunityId?: bigint
): Promise<...> {
  // 1. 检查 Ultra API 返回的 transaction 字段
  if (!opportunity.outboundQuote?.transaction || !opportunity.returnQuote?.transaction) {
    logger.error('❌ No transaction in cached quote');
    return null;
  }

  // 2. 反序列化两个交易
  const tx1 = VersionedTransaction.deserialize(
    Buffer.from(opportunity.outboundQuote.transaction, 'base64')
  );
  const tx2 = VersionedTransaction.deserialize(
    Buffer.from(opportunity.returnQuote.transaction, 'base64')
  );

  // 3. 提取指令和 ALT
  const swap1Instructions = tx1.message.compiledInstructions.map(ix => /* ... */);
  const swap2Instructions = tx2.message.compiledInstructions.map(ix => /* ... */);
  const lookupTableAccounts = await this.loadAddressLookupTables([
    ...tx1.message.addressTableLookups,
    ...tx2.message.addressTableLookups,
  ]);

  // 4. 继续构建闪电贷交易...
}
```

### 方案 B: 改用 Legacy API 的 /swap-instructions（备选）

**缺点**:
- ❌ Ultra quote 可能与 Legacy API 不兼容
- ❌ 需要重新查询（增加延迟）
- ❌ 失去 Ultra API 的路由优势

**实现**:
```typescript
// 改用 jupiterLegacyAxios
const [swap1Result, swap2Result] = await Promise.all([
  this.jupiterLegacyAxios.post('/swap-instructions', {
    quoteResponse: /* 需要用 Legacy API 重新获取 quote */,
    ...
  }),
  ...
]);
```

---

## ⚠️ 注意事项

### Ultra API 的 transaction 字段特性

1. **完整性**: `transaction` 已经是完整的、可执行的 `VersionedTransaction`
2. **指令提取**: 需要从 `compiledInstructions` 中提取，而不是直接获取 `TransactionInstruction[]`
3. **ALT 处理**: `addressTableLookups` 需要从链上加载为 `AddressLookupTableAccount[]`
4. **账户映射**: `compiledInstructions.accountKeyIndexes` 需要映射到 `message.staticAccountKeys` 和 ALT

### 闪电贷集成

Ultra API 的交易只包含 swap 指令，需要：
1. 提取 swap 指令
2. 添加闪电贷借款指令（前置）
3. 添加闪电贷还款指令（后置）
4. 合并所有 ALT
5. 重新编译为 `VersionedTransaction`

---

## 📊 影响分析

### 当前影响
- ❌ **所有深度模拟失败**: `Built 0 instructions`
- ❌ **无法验证交易构建流程**
- ❌ **无法测试 Jito Bundle 准备**

### 修复后预期
- ✅ **成功提取 swap 指令**: `Built N instructions with M ALTs`
- ✅ **RPC 模拟通过**: 验证交易可行性
- ✅ **完整的端到端测试**: 从机会发现到 Bundle 构建

---

## 📝 后续步骤

1. **立即修复**: 实现方案 A（使用 Ultra transaction 字段）
2. **测试验证**: 运行深度模拟模式，确认能提取指令
3. **性能监控**: 对比优化前后的延迟
4. **文档更新**: 记录 Ultra API 的正确用法

---

## 🔗 参考资料

- Jupiter Ultra API 文档: `llms-full.txt` line 808-842
- Execute Order 文档: `llms-full.txt` line 9006-9110
- Worker 实现: `packages/jupiter-bot/src/workers/query-worker.ts` line 214-400
- 主线程构建: `packages/jupiter-bot/src/flashloan-bot.ts` line 1704-1850

