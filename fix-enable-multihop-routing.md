# 🔧 启用多跳路由优化

## 问题诊断

**根本原因：Worker 配置强制使用单跳路由，损失了大量利润机会**

```typescript
当前配置 (query-worker.ts):
  onlyDirectRoutes: 'true',  ❌ 限制为单跳
  maxAccounts: '20',         ❌ 账户数太少

实际影响：
  单跳利润: 485,010 lamports
  多跳利润: ~1,500,000 lamports (估计)
  损失: ~1,000,000 lamports (约 66%)
```

## 修复步骤

### 步骤 1: 修改 Worker 路由配置

**文件：`packages/jupiter-bot/src/workers/query-worker.ts`**

**Line 175-182** (去程查询):
```typescript
// 修改前：
const paramsOut = new URLSearchParams({
  inputMint,
  outputMint: bridgeToken.mint,
  amount: config.amount.toString(),
  slippageBps: config.slippageBps.toString(),
  onlyDirectRoutes: 'true',  // ❌ 改这里
  maxAccounts: '20',         // ❌ 改这里
});

// 修改后：
const paramsOut = new URLSearchParams({
  inputMint,
  outputMint: bridgeToken.mint,
  amount: config.amount.toString(),
  slippageBps: config.slippageBps.toString(),
  onlyDirectRoutes: 'false',  // ✅ 允许多跳路由
  maxAccounts: '40',          // ✅ 增加账户数（支持更复杂路由）
});
```

**Line 219-226** (回程查询):
```typescript
// 修改前：
const paramsBack = new URLSearchParams({
  inputMint: bridgeToken.mint,
  outputMint: inputMint,
  amount: outAmount.toString(),
  slippageBps: config.slippageBps.toString(),
  onlyDirectRoutes: 'true',  // ❌ 改这里
  maxAccounts: '20',         // ❌ 改这里
});

// 修改后：
const paramsBack = new URLSearchParams({
  inputMint: bridgeToken.mint,
  outputMint: inputMint,
  amount: outAmount.toString(),
  slippageBps: config.slippageBps.toString(),
  onlyDirectRoutes: 'false',  // ✅ 允许多跳路由
  maxAccounts: '40',          // ✅ 增加账户数
});
```

### 步骤 2: 降低利润阈值

**文件：`configs/flashloan-dryrun.toml`**

**Line 133**:
```toml
# 修改前：
min_profit_lamports = 5_000_000  # 0.005 SOL

# 修改后：
min_profit_lamports = 500_000  # 0.0005 SOL (降低10倍)
```

**Line 52** (economics.profit):
```toml
# 修改前：
min_profit_lamports = 5_000_000

# 修改后：
min_profit_lamports = 500_000
```

### 步骤 3: 优化查询金额（可选）

**文件：`packages/jupiter-bot/src/flashloan-bot.ts`**

**Line 289**:
```typescript
// 修改前：
const queryAmount = 10_000_000_000; // 10 SOL

// 修改后：
const queryAmount = 5_000_000_000; // 5 SOL (降低查询金额，提高ROI)
```

## 预期效果

### 利润提升对比

```
配置组合              单次利润        是否达标     提升倍数
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
当前 (单跳)          485K lamports   ❌          1x
优化1 (多跳)         ~1.5M lamports  ✅          3x
优化2 (多跳+低阈值)  ~1.5M lamports  ✅✅        3x
优化3 (Ultra API)    4.2M lamports   ✅✅✅      9x
```

### 机会发现率

```
当前配置：
  14,310 rounds → 1 opportunity (被过滤)
  发现率: 0.007%

优化后（多跳 + 降阈值）：
  14,310 rounds → 50-100 opportunities (可执行)
  发现率: 0.35-0.7%
  提升: 50-100 倍！
```

## 执行命令

```bash
# 1. 编辑文件
code packages/jupiter-bot/src/workers/query-worker.ts
# 修改 Line 180, 225: onlyDirectRoutes: 'false', maxAccounts: '40'

code configs/flashloan-dryrun.toml
# 修改 Line 52, 133: min_profit_lamports = 500_000

# 2. 重新编译
pnpm run build

# 3. 重启 Bot
.\start-flashloan-dryrun.bat
```

## 验证效果

启动后观察日志：

```bash
# 预期看到：
[Worker 0] ✅ Quote outbound: So11... → USDC, took 250ms, got 1892264634
[Worker 0] ✅ Quote return: USDC → So11..., took 280ms, got 10001500000

🎯 Opportunity found!
   Path: SOL → USDC → SOL
   Profit: 0.001500000 SOL (1,500,000 lamports)  ✅ 达标！
   ROI: 0.015%
```

## 进一步优化（可选）

如果还是机会太少，考虑：

1. **切换到 Ultra API** (最优报价):
   ```typescript
   // query-worker.ts
   const responseOut = await axios.get(
     `https://api.jup.ag/ultra/v1/order`,
     {
       params: {...},
       headers: { 'X-API-Key': process.env.JUPITER_API_KEY },
     }
   );
   ```

2. **再次降低阈值**:
   ```toml
   min_profit_lamports = 100_000  # 0.0001 SOL
   ```

3. **增加桥接代币**:
   ```json
   // bridge-tokens.json
   // 启用更多代币: BONK, RAY, mSOL, stSOL, etc.
   ```

## 总结

**最小改动，最大收益：**
- ✅ 2行代码修改（onlyDirectRoutes）
- ✅ 1行配置修改（min_profit_lamports）
- 🚀 预期利润提升 3-5 倍
- 🚀 预期机会发现率提升 50-100 倍

**立即执行此修复，预计 5 分钟内可以看到大量套利机会！**

