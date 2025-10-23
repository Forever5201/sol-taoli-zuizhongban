# 桥接代币环形套利系统

## 📊 概述

本系统实现了真正的环形套利策略，通过**双向查询**（去程 + 回程）来发现套利机会。

### 核心逻辑

```
起始: 100 SOL
  ↓ (去程查询: SOL → USDC)
中间: 2000 USDC
  ↓ (回程查询: USDC → SOL)
结束: 100.05 SOL
  ↓
利润: 0.05 SOL
```

## 🔧 配置文件（零硬编码）

### 1. 初始代币配置

**文件: `mints-simple.txt`**

定义要监控的起始代币：

```
So11111111111111111111111111111111111111112
JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

### 2. 桥接代币配置

**文件: `bridge-tokens.json`**

定义可用的桥接代币：

```json
[
  {
    "symbol": "USDC",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "decimals": 6,
    "priority": 1,
    "enabled": true,
    "description": "USD Coin - 稳定币，流动性最好"
  },
  {
    "symbol": "USDT",
    "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "decimals": 6,
    "priority": 2,
    "enabled": true,
    "description": "Tether USD - 稳定币，第二选择"
  }
]
```

**字段说明：**
- `symbol`: 代币符号（用于日志显示）
- `mint`: 代币地址
- `decimals`: 代币精度
- `priority`: 优先级（1最高，数字越小越优先）
- `enabled`: 是否启用（`false` 可临时禁用）

## 🎯 套利路径计算

系统会自动组合所有可能的路径：

```
初始代币: [SOL, JUP, BONK]  (3个，来自 mints-simple.txt)
桥接代币: [USDC, USDT]      (2个，来自 bridge-tokens.json，enabled=true)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
总路径数: 3 × 2 = 6 条

具体路径:
1. SOL → USDC → SOL
2. SOL → USDT → SOL
3. JUP → USDC → JUP
4. JUP → USDT → JUP
5. BONK → USDC → BONK
6. BONK → USDT → BONK
```

## 🚀 使用方法

### 启动测试

```bash
pnpm start:flashloan -- --config=configs/flashloan-dryrun.toml
```

### 预期日志

```
Worker 0 loaded 3 bridge tokens from config
Worker 0 started with 3 initial tokens × 3 bridge tokens
Worker 0 will monitor 9 arbitrage paths

🎯 [Worker 0] Opportunity #1:
   Path: So11... → USDC → So11...
   Profit: 0.003000 SOL (3.00%)
   Query time: 245ms
```

## ⚙️ 配置调整

### 添加桥接代币

编辑 `bridge-tokens.json`：

```json
{
  "symbol": "RAY",
  "mint": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  "decimals": 6,
  "priority": 3,
  "enabled": true,
  "description": "Raydium DEX代币"
}
```

### 临时禁用桥接代币

将 `enabled` 设为 `false`：

```json
{
  "symbol": "BONK",
  "enabled": false
}
```

### 调整查询频率

编辑 `configs/flashloan-dryrun.toml`：

```toml
[opportunity_finder]
query_interval_ms = 1000  # 增加到1秒避免限流
```

## 📊 性能考量

### API 调用频率

```
查询频率 = Worker数量 × 初始代币 × 桥接代币 × 2（双向） / 间隔时间

示例:
2 Workers × 3 初始代币 × 3 桥接代币 × 2 / 0.5秒 = 72 次/秒
```

**注意：** 过高的查询频率可能触发 Jupiter API 限流！

### 建议配置

| 场景 | Workers | 初始代币 | 桥接代币 | 间隔(ms) | 频率 |
|------|---------|----------|----------|----------|------|
| 测试 | 2 | 3 | 2 | 1000 | 24/秒 |
| 生产 | 4 | 5 | 3 | 500 | 240/秒 |

## 💰 费用计算

每次环形套利包含两次 swap：

```
去程 Gas: ~0.001-0.003 SOL
回程 Gas: ~0.001-0.003 SOL
总 Gas:   ~0.002-0.006 SOL
Jito Tip: ~0.001 SOL
闪电贷费: 0.09% of borrowed
━━━━━━━━━━━━━━━━━━━━
总成本: ~0.003-0.010 SOL

建议最小利润阈值: 0.01 SOL (10,000,000 lamports)
```

## 🔍 故障排查

### Workers 崩溃

检查 `bridge-tokens.json` 是否存在且格式正确。

### 没有发现机会

1. 检查桥接代币是否启用（`enabled: true`）
2. 降低最小利润阈值
3. 增加桥接代币数量

### API 限流（429 错误）

1. 增加 `query_interval_ms`
2. 减少 Worker 数量
3. 减少桥接代币数量

## 📝 代码位置

- `bridge-tokens.json` - 桥接代币配置
- `mints-simple.txt` - 初始代币配置
- `packages/jupiter-bot/src/workers/query-worker.ts` - Worker 查询逻辑
- `packages/jupiter-bot/src/opportunity-finder.ts` - 机会处理接口
- `configs/flashloan-dryrun.toml` - 系统配置

## ✅ 核心特性

- ✅ 零硬编码：所有代币从配置文件加载
- ✅ 灵活配置：可随时添加/禁用代币
- ✅ 双向查询：真正的环形套利逻辑
- ✅ 详细日志：显示完整的桥接路径
- ✅ 性能优化：并发查询 + 智能过滤



