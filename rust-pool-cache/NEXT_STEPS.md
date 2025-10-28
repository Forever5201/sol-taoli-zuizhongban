# 🚀 Rust Pool Cache - 继续实施指南

## ✅ 已完成的工作

### 1. 基础设施 (100%)
- ✅ HTTP CONNECT 代理支持（通过 Clash）
- ✅ WebSocket 连接到 Solana RPC
- ✅ Raydium AMM V4 池状态反序列化（752 字节）
- ✅ SPL Token 账户反序列化器（用于 Vault）
- ✅ 价格缓存模块（`price_cache.rs`）
- ✅ 套利检测模块（`arbitrage.rs`）
- ✅ 基础监控和统计

### 2. DEX 优先级确定 (100%)
基于 Solana 生态系统分析：
1. 🔥 **P0**: Raydium, Orca
2. ⚡ **P1**: Meteora, Phoenix
3. 💡 **P2**: Lifinity, Openbook, Drift, Invariant

## 🚧 下一步：订阅 Vault 账户并实现价格计算

### 步骤 1：获取 Raydium 池的 Vault 地址

需要从链上读取 Raydium 池信息来获取 Vault 地址。

**示例代码**（在 `main.rs` 中添加）：

```rust
use solana_client::rpc_client::RpcClient;

async fn get_pool_vaults(
    rpc_url: &str,
    pool_address: &str
) -> Result<(Pubkey, Pubkey), anyhow::Error> {
    let client = RpcClient::new(rpc_url.to_string());
    let pool_pubkey = Pubkey::from_str(pool_address)?;
    
    // 读取池账户数据
    let account_data = client.get_account_data(&pool_pubkey)?;
    
    // 反序列化为 RaydiumAmmInfo
    let pool_info = RaydiumAmmInfo::try_from_slice(&account_data)?;
    
    Ok((pool_info.coin_vault, pool_info.pc_vault))
}
```

### 步骤 2：更新配置文件

修改 `config.toml`：

```toml
[websocket]
url = "wss://api.mainnet-beta.solana.com"

[proxy]
enabled = true
host = "127.0.0.1"
port = 7890

# Raydium SOL/USDC Pool
[[pools]]
pair = "SOL/USDC"
dex = "Raydium"
pool_address = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"
# 这些地址需要从链上读取
base_vault = "36c6YqAwyGKQG66XEp2dJc5JqjaBNv7sVghEtJv4c7u6"
quote_vault = "3ApsmAUQJjto1B2b4gT11B24c2aJPMo2M3Fn51hLR7i"
base_decimals = 9  # SOL
quote_decimals = 6 # USDC

# Orca SOL/USDC Pool (Whirlpool)
[[pools]]
pair = "SOL/USDC"
dex = "Orca"
pool_address = "HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ"
base_vault = "..." # 需要获取
quote_vault = "..." # 需要获取
base_decimals = 9
quote_decimals = 6
```

### 步骤 3：修改 `websocket.rs` 订阅 Vault

```rust
// 在 connect_and_process 中修改订阅逻辑

// 订阅 Vault 账户而不是池账户
for (idx, pool) in pools.iter().enumerate() {
    // 订阅 base vault
    let subscribe_base = json!({
        "jsonrpc": "2.0",
        "id": idx * 2 + 1,
        "method": "accountSubscribe",
        "params": [
            pool.base_vault,  // 从配置中读取
            {
                "encoding": "base64",
                "commitment": "confirmed"
            }
        ]
    });
    
    write.send(Message::Text(subscribe_base.to_string())).await?;
    
    // 订阅 quote vault
    let subscribe_quote = json!({
        "jsonrpc": "2.0",
        "id": idx * 2 + 2,
        "method": "accountSubscribe",
        "params": [
            pool.quote_vault,
            {
                "encoding": "base64",
                "commitment": "confirmed"
            }
        ]
    });
    
    write.send(Message::Text(subscribe_quote.to_string())).await?;
    
    println!("📡 Subscribed to {} {} vaults", pool.dex, pool.pair);
}
```

### 步骤 4：处理 Vault 更新并计算价格

```rust
// 在 handle_account_notification 中

use crate::deserializers::TokenAccount;
use crate::price_cache::{PoolPrice, PriceCache};

async fn handle_vault_update(
    &self,
    vault_address: &str,
    data: &[u8],
    pool_config: &PoolConfig,
    price_cache: &PriceCache,
) -> Result<()> {
    // 反序列化 SPL Token 账户
    let token_account = TokenAccount::try_from_slice(data)?;
    
    // 更新缓存中的储备量
    // 这里需要跟踪哪个 vault 是 base，哪个是 quote
    
    // 计算新价格
    let price = PoolPrice::calculate_price(
        base_reserve,
        quote_reserve,
        pool_config.base_decimals,
        pool_config.quote_decimals,
    );
    
    // 更新价格缓存
    price_cache.update_price(PoolPrice {
        pool_id: format!("{}_{}", pool_config.dex, pool_config.pair),
        dex_name: pool_config.dex.clone(),
        pair: pool_config.pair.clone(),
        base_reserve,
        quote_reserve,
        base_decimals: pool_config.base_decimals,
        quote_decimals: pool_config.quote_decimals,
        price,
        last_update: Instant::now(),
    });
    
    println!("💰 {} {} Price: ${:.4}", pool_config.dex, pool_config.pair, price);
    
    Ok(())
}
```

### 步骤 5：添加套利检测

```rust
// 在 main.rs 中添加套利扫描任务

use crate::arbitrage::{scan_for_arbitrage, format_opportunity};
use crate::price_cache::PriceCache;

// 在 main 函数中
let price_cache = Arc::new(PriceCache::new());

// 启动套利扫描任务
let price_cache_clone = price_cache.clone();
let arb_handle = tokio::spawn(async move {
    let mut ticker = interval(Duration::from_millis(500)); // 每500ms扫描一次
    
    loop {
        ticker.tick().await;
        
        // 扫描套利机会（阈值 0.5%）
        let opportunities = scan_for_arbitrage(&price_cache_clone, 0.5);
        
        for opp in opportunities {
            println!("{}", format_opportunity(&opp));
        }
    }
});
```

## 📋 完整实施计划

### 阶段 1：基础功能（今天，2-3 小时）
- [ ] 从链上读取 Raydium SOL/USDC 的 Vault 地址
- [ ] 更新配置文件添加 Vault 地址
- [ ] 修改 WebSocket 订阅逻辑订阅 Vault
- [ ] 实现 Vault 更新处理和价格计算
- [ ] 添加套利检测任务
- [ ] **测试：看到第一个套利机会！**

### 阶段 2：双 DEX 支持（明天，4-6 小时）
- [ ] 添加 Orca SOL/USDC 池配置
- [ ] 从链上获取 Orca Vault 地址
- [ ] 测试 Raydium vs Orca 套利检测
- [ ] 性能优化和日志改进

### 阶段 3：扩展池数量（本周，1-2 天）
- [ ] 添加 Raydium SOL/USDT
- [ ] 添加 Raydium USDC/USDT
- [ ] 添加 Orca 对应池子
- [ ] 实现多对套利检测

### 阶段 4：更多 DEX（下周）
- [ ] 接入 Meteora
- [ ] 接入 Phoenix
- [ ] 统一接口和配置框架

## 🛠️ 实用工具脚本

### 获取池的 Vault 地址

创建 `tools/get-pool-vaults.ts`：

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

async function getVaults(poolAddress: string) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const pubkey = new PublicKey(poolAddress);
  
  const accountInfo = await connection.getAccountInfo(pubkey);
  if (!accountInfo) {
    throw new Error('Pool not found');
  }
  
  // Raydium AMM V4 offsets
  const coinVaultOffset = 16 * 8 + 12 * 32; // Skip u64s and first Pubkeys
  const pcVaultOffset = coinVaultOffset + 64; // +2 Pubkeys
  
  const coinVault = new PublicKey(accountInfo.data.slice(coinVaultOffset, coinVaultOffset + 32));
  const pcVault = new PublicKey(accountInfo.data.slice(pcVaultOffset, pcVaultOffset + 32));
  
  console.log('Base Vault:', coinVault.toBase58());
  console.log('Quote Vault:', pcVault.toBase58());
}

// 使用
getVaults('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2');
```

## 🎯 成功指标

完成阶段 1 后，您应该看到：

```
💰 Raydium SOL/USDC Price: $185.2345
💰 Orca SOL/USDC Price: $185.7821
🔥 ARBITRAGE: SOL/USDC | Raydium $185.2345 vs Orca $185.7821 | Diff: 0.30% | Est. Profit: -0.20%
```

（虽然这个例子利润为负，但说明检测系统正在工作）

## 📚 参考资料

- [Raydium AMM V4 Program](https://github.com/raydium-io/raydium-amm)
- [Orca Whirlpool Program](https://github.com/orca-so/whirlpool)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana WebSocket API](https://docs.solana.com/api/websocket)

---

**准备好了吗？开始实施步骤 1！** 🚀

运行 `tools/get-pool-vaults.ts` 获取 Vault 地址，然后更新配置并修改代码。



