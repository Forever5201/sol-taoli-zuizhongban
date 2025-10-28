# 🚀 Rust Pool Cache 实施路线图

## 总体目标

建立基于 WebSocket 的实时 Solana DEX 价格监控系统，实现本地低延迟套利机会发现。

## 实施策略

### ✅ 已完成
1. ✅ HTTP CONNECT 代理支持（通过 Clash）
2. ✅ WebSocket 连接到 Solana RPC
3. ✅ Raydium AMM V4 池状态反序列化
4. ✅ 基础框架和监控

### 🎯 阶段 1：基础套利机会识别（1-2 天）

**目标**：让系统能够识别到第一个套利机会

#### 任务 1.1：切换到 Vault 账户订阅
**时间**：2-3 小时

**当前问题**：
- 当前订阅的是 Pool 账户（AMM Info）
- 这些账户更新频率较低（只在流动性变化时更新）

**解决方案**：
- 订阅 Vault 代币账户（每次 swap 都会更新）
- Vault账户是 SPL Token 账户，更新更频繁
- 反序列化 `spl_token::state::Account` 结构（简单！）

**技术细节**：
```rust
// 从 Raydium Pool Info 提取 Vault 地址
let sol_usdc_pool = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

// Vault 账户地址（需要从链上读取）
// coin_vault: base token（如 SOL）的储备
// pc_vault: quote token（如 USDC）的储备

// 订阅这两个 Vault 账户
accountSubscribe(coin_vault_address)
accountSubscribe(pc_vault_address)

// 反序列化 SPL Token Account（简单！）
pub struct TokenAccount {
    pub mint: Pubkey,          // 32 bytes
    pub owner: Pubkey,         // 32 bytes
    pub amount: u64,           // 8 bytes - 关键！
    pub delegate: Option<Pubkey>,
    pub state: AccountState,
    pub is_native: Option<u64>,
    pub delegated_amount: u64,
    pub close_authority: Option<Pubkey>,
}
```

#### 任务 1.2：实现本地价格计算
**时间**：1-2 小时

```rust
// 实时计算价格
fn calculate_pool_price(
    base_amount: u64,
    quote_amount: u64,
    base_decimals: u8,
    quote_decimals: u8
) -> f64 {
    let base = base_amount as f64 / 10f64.powi(base_decimals as i32);
    let quote = quote_amount as f64 / 10f64.powi(quote_decimals as i32);
    quote / base
}

// 实时更新价格缓存
struct PriceCache {
    prices: DashMap<String, PoolPrice>,
}

struct PoolPrice {
    pool_id: String,
    base_reserve: u64,
    quote_reserve: u64,
    price: f64,
    last_update: Instant,
}
```

#### 任务 1.3：双池套利机会识别
**时间**：2-3 小时

```rust
// 简单的两池套利检测
fn detect_arbitrage(
    pool_a: &PoolPrice,  // 如 Raydium SOL/USDC
    pool_b: &PoolPrice,  // 如 Orca SOL/USDC
) -> Option<ArbitrageOpportunity> {
    let price_diff = (pool_a.price - pool_b.price).abs();
    let price_diff_pct = price_diff / pool_a.price.min(pool_b.price);
    
    // 阈值：0.5% 价差
    if price_diff_pct > 0.005 {
        Some(ArbitrageOpportunity {
            pool_a: pool_a.pool_id.clone(),
            pool_b: pool_b.pool_id.clone(),
            price_a: pool_a.price,
            price_b: pool_b.price,
            price_diff_pct,
            estimated_profit: calculate_profit(...),
        })
    } else {
        None
    }
}
```

### 🎯 阶段 2：DEX 优先级接入（基于数据）

**策略**：从数据库查询历史套利机会，按DEX组合频率排序

#### 数据库查询
```sql
-- 查询最活跃的 DEX 组合
SELECT 
    dex_a, 
    dex_b, 
    COUNT(*) as count,
    AVG(profit_lamports) as avg_profit
FROM arbitrage_opportunities
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY dex_a, dex_b
ORDER BY count DESC
LIMIT 10;
```

#### 预期结果（示例）
```
排名 | DEX A       | DEX B       | 机会数 | 平均利润
1    | Raydium     | Orca        | 15,234 | 0.05 SOL
2    | Raydium     | Meteora     |  8,921 | 0.08 SOL
3    | Orca        | Meteora     |  5,432 | 0.06 SOL
4    | Raydium     | Lifinity    |  3,210 | 0.12 SOL
5    | Orca        | Phoenix     |  1,987 | 0.15 SOL
```

#### 接入顺序
1. **第1批（高优先级）**：Raydium ↔ Orca（预计覆盖 60% 机会）
2. **第2批**：Meteora（预计新增 25% 机会）
3. **第3批**：Lifinity, Phoenix（预计新增 10% 机会）
4. **第4批**：其他长尾 DEX

### 🎯 阶段 3：多 DEX 支持框架（3-5 天）

#### 任务 3.1：统一池状态接口
```rust
trait PoolState {
    fn get_reserves(&self) -> (u64, u64);
    fn get_decimals(&self) -> (u8, u8);
    fn calculate_price(&self) -> f64;
    fn get_vault_addresses(&self) -> (Pubkey, Pubkey);
}

// 实现不同 DEX
impl PoolState for RaydiumPool { ... }
impl PoolState for OrcaPool { ... }
impl PoolState for MeteoraPool { ... }
```

#### 任务 3.2：配置化 DEX 接入
```toml
# config.toml
[[dex]]
name = "Raydium"
enabled = true
priority = 1

  [[dex.pools]]
  pair = "SOL/USDC"
  pool_address = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"
  coin_vault = "..."
  pc_vault = "..."

[[dex]]
name = "Orca"
enabled = true
priority = 2

  [[dex.pools]]
  pair = "SOL/USDC"
  pool_address = "..."
```

#### 任务 3.3：跨 DEX 套利检测
```rust
fn detect_cross_dex_arbitrage(
    price_cache: &PriceCache
) -> Vec<ArbitrageOpportunity> {
    let mut opportunities = Vec::new();
    
    // 遍历所有相同交易对的池子
    for pair in ["SOL/USDC", "SOL/USDT", "USDC/USDT"] {
        let pools = price_cache.get_pools_by_pair(pair);
        
        // 两两比较
        for i in 0..pools.len() {
            for j in (i+1)..pools.len() {
                if let Some(opp) = detect_arbitrage(&pools[i], &pools[j]) {
                    opportunities.push(opp);
                }
            }
        }
    }
    
    opportunities
}
```

### 🎯 阶段 4：与主系统集成（5-7 天）

#### 方案 A：Rust 模块直接集成（推荐）
```typescript
// TypeScript 调用 Rust
import { PriceCache } from './rust-pool-cache/binding';

const priceCache = new PriceCache();
await priceCache.start();

// 获取实时价格
const price = await priceCache.getPrice('SOL/USDC', 'Raydium');

// 获取套利机会
const opportunities = await priceCache.getArbitrageOpportunities();
```

#### 方案 B：WebSocket/HTTP API（更灵活）
```rust
// Rust 提供 API 服务
#[tokio::main]
async fn main() {
    // WebSocket 服务器
    let ws_server = spawn_websocket_server(3001);
    
    // 推送价格更新
    ws_server.broadcast(PriceUpdate {
        pool: "Raydium_SOL_USDC",
        price: 185.23,
        timestamp: now(),
    });
    
    // 推送套利机会
    ws_server.broadcast(ArbitrageOpportunity { ... });
}
```

## 时间估算

| 阶段 | 任务 | 时间 | 优先级 |
|------|------|------|--------|
| 1 | Vault 订阅 + 价格计算 | 3-5 小时 | 🔥 P0 |
| 1 | 双池套利识别 | 2-3 小时 | 🔥 P0 |
| 2 | 查询数据库确定 DEX 优先级 | 30 分钟 | 🔥 P0 |
| 2 | 接入 Raydium + Orca | 1 天 | 🔥 P0 |
| 2 | 接入 Meteora | 0.5 天 | ⚡ P1 |
| 2 | 接入其他 DEX | 1-2 天 | 💡 P2 |
| 3 | 统一框架和配置 | 2-3 天 | ⚡ P1 |
| 4 | 系统集成 | 3-5 天 | ⚡ P1 |

**总计**：7-14 天（全职工作）

## 性能目标

| 指标 | 目标 | 当前 |
|------|------|------|
| 价格更新延迟 | < 10ms | ✅ 5-8ms |
| 套利机会发现延迟 | < 50ms | 🚧 待测试 |
| 支持 DEX 数量 | 5-10 个 | ✅ 1 (Raydium) |
| 支持池数量 | 50-100 个 | ✅ 3 |
| 内存占用 | < 100MB | ✅ ~5MB |
| CPU 占用 | < 5% | ✅ ~1% |

## 风险与缓解

### 风险 1：不同 DEX 的池结构差异大
**缓解**：
- 使用 trait 统一接口
- 每个 DEX 独立实现
- 逐个接入，充分测试

### 风险 2：RPC 速率限制
**缓解**：
- 使用付费 RPC（Helius Pro）
- 批量订阅多个账户
- 实现智能重连

### 风险 3：数据同步延迟
**缓解**：
- WebSocket 实时推送
- 本地缓存最新状态
- 时间戳验证

## 下一步行动

### 立即开始（今天）
1. ✅ **查询数据库** - 确定 DEX 优先级
2. 🚧 **修改订阅** - 从 Pool 改为 Vault 账户
3. 🚧 **价格计算** - 实现实时价格更新
4. 🚧 **套利检测** - 识别第一个机会

### 本周完成
- 实现 Raydium + Orca 双池套利检测
- 验证套利机会准确性
- 性能测试和优化

### 下周完成
- 接入 Meteora
- 实现跨 DEX 套利检测
- 与主系统初步集成

---

**文档版本**: v1.0
**最后更新**: 2025-10-26
**负责人**: AI Assistant + User



