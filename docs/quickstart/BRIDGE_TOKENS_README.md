# 桥接代币管理指南

## 概述

桥接代币（Bridge Tokens）是环形套利策略中的**中间折返点**。机器人会查询：

```
初始代币 → 桥接代币 → 初始代币
```

例如：`SOL → USDC → SOL`

每个桥接代币会产生2次API调用（去程 + 回程），Jupiter会自动优化每段路径的内部路由。

---

## 如何添加新的桥接代币

### 步骤1：找到代币地址

访问 [Solscan](https://solscan.io/) 或 [Jupiter Token List](https://token.jup.ag/) 查找代币的 Mint 地址。

### 步骤2：编辑配置文件

在 `bridge-tokens.json` 中添加新代币：

```json
{
  "symbol": "mSOL",
  "mint": "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  "decimals": 9,
  "priority": 6,
  "enabled": true,
  "description": "Marinade Staked SOL - Liquid Staking代币"
}
```

### 字段说明

- `symbol`: 代币符号（显示用）
- `mint`: 代币地址（必填，用于API查询）
- `decimals`: 小数位数（通常在代币文档中查找）
- `priority`: 优先级（数字越小越优先，影响查询顺序）
- `enabled`: `true` 启用 / `false` 禁用
- `description`: 说明（可选）

### 步骤3：重启机器人

修改配置后，重启机器人即可生效：

```bash
.\start-flashloan-dryrun.bat
```

---

## 如何启用/禁用桥接代币

直接修改配置文件中的 `enabled` 字段：

```json
{
  "symbol": "RAY",
  "enabled": false  // 禁用 RAY
}
```

保存后重启机器人。

---

## 推荐的桥接代币

### 当前已配置（5个）

| 代币 | 地址 | 流动性 | 状态 |
|------|------|--------|------|
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 极高 | ✅ 启用 |
| SOL | So11111111111111111111111111111111111111112 | 极高 | ✅ 启用 |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | 高 | ✅ 启用 |
| JUP | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN | 高 | ✅ 启用 |
| RAY | 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R | 中-高 | ✅ 启用 |

### 建议添加的代币

**Liquid Staking（流动性质押）**：
- mSOL: `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So`
- jitoSOL: `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn`
- bSOL: `bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1`

**跨链资产（Wormhole）**：
- ETH: `7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs`
- WBTC: `3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh`

**其他DEX代币**：
- ORCA: `orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE`

---

## 性能影响

### API请求计算

```
每轮API请求数 = 初始代币数 × 桥接代币数 × 2

当前配置：
1个初始代币（SOL） × 5个桥接代币 × 2 = 10次请求/轮
（减去1个自循环 SOL→SOL→SOL = 8次）

实际速率：
8次请求 / 1500ms间隔 ≈ 1.3 RPS（远低于5 RPS限制）✅
```

### 建议

- **5-8个桥接代币**：平衡覆盖率和API限速
- **优先选择高流动性代币**：成功率更高
- **避免Meme币**：波动大、滑点高、成功率低

---

## 故障排除

### 问题1：仍然出现429限流

**原因**：桥接代币太多或间隔太短

**解决方案**：
1. 减少启用的桥接代币数量
2. 增加 `query_interval_ms` 到 2000-3000
3. 检查是否有其他程序同时使用API Key

### 问题2：找不到套利机会

**原因**：桥接代币流动性不足或市场波动小

**解决方案**：
1. 启用更多高流动性代币（USDC, USDT, mSOL等）
2. 降低 `min_profit_lamports` 阈值
3. 等待市场波动增加

### 问题3：代币地址错误

**症状**：日志显示 404 Not Found

**解决方案**：
1. 检查代币地址是否正确（访问 Solscan 验证）
2. 确认代币在 Jupiter 上有流动性
3. 检查 `decimals` 字段是否正确

---

## 查看当前配置

运行机器人时，日志会显示加载的桥接代币：

```
Worker 0 loaded 5 bridge tokens from config
Worker 0 started with 1 initial tokens × 5 bridge tokens
Worker 0 will monitor 4 arbitrage paths
```

---

## 高级技巧

### 动态调整优先级

根据市场情况调整 `priority` 字段：

```json
// 稳定币波动大时，提高稳定币优先级
{"symbol": "USDC", "priority": 1},
{"symbol": "USDT", "priority": 2},

// DeFi代币波动大时，提高DeFi代币优先级
{"symbol": "JUP", "priority": 1},
{"symbol": "RAY", "priority": 2},
```

### 临时测试新代币

添加新代币时先设置 `enabled: false`，然后在低流量时段启用测试。

---

## 更新日志

- **2025-10-21**: 初始版本，启用5个桥接代币（USDC, SOL, USDT, JUP, RAY）



