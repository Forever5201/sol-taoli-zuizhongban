# GoonFi 和 SolFi V2 Vault 读取解决方案

## 📌 问题背景

GoonFi 和 SolFi V2 的储备量（reserves）不直接存储在池子账户中，而是存储在单独的 vault 账户中。

### 当前状态

- **GoonFi**: 已实现反序列化器，但在 config.toml 中被禁用
- **SolFi V2**: 已实现反序列化器，但在 config.toml 中被禁用

### 为什么重要

- **SolFi V2**: 占 37% 的套利机会（最重要！）
- **GoonFi**: 占 6% 的套利机会

总计：**43% 的套利机会被禁用**

---

## 🔍 技术分析

### 传统 AMM 模式（Raydium V4, AlphaQ）

```
Pool Account:
├─ token_a_mint
├─ token_b_mint
├─ reserve_a: u64  ← 直接存储在池子账户中
└─ reserve_b: u64  ← 直接存储在池子账户中
```

### Vault 模式（GoonFi, SolFi V2）

```
Pool Account:
├─ token_a_mint
├─ token_b_mint
├─ token_a_vault: Pubkey  ← 指向 vault 账户
└─ token_b_vault: Pubkey  ← 指向 vault 账户

Vault A Account (SPL Token Account):
└─ amount: u64  ← 实际储备量在这里

Vault B Account (SPL Token Account):
└─ amount: u64  ← 实际储备量在这里
```

---

## 💡 解决方案

### 方案 1: 多账户订阅（推荐）✅

修改 `rust-pool-cache` 的 WebSocket 订阅逻辑，同时订阅池子账户和 vault 账户。

#### 实施步骤

1. **修改池子配置结构**

```rust
// rust-pool-cache/src/config.rs

pub struct PoolConfig {
    pub address: String,
    pub name: String,
    pub pool_type: String,
    
    // 🆕 新增字段
    pub vault_accounts: Option<Vec<String>>,  // vault 账户地址列表
    pub requires_vault_reading: bool,          // 是否需要读取 vault
}
```

2. **修改 config.toml 格式**

```toml
[[pools]]
address = "65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc"
name = "USDC/USDT (SolFi V2)"
pool_type = "solfi_v2"
requires_vault_reading = true
vault_accounts = [
    "VaultAccountA...",  # Token A vault
    "VaultAccountB..."   # Token B vault
]
```

3. **修改 WebSocket 订阅逻辑**

```rust
// rust-pool-cache/src/websocket.rs

async fn subscribe_to_pools(&mut self) -> Result<()> {
    for pool in &self.config.pools {
        // 订阅池子账户
        self.subscribe_account(&pool.address).await?;
        
        // 🆕 如果需要读取 vault，订阅 vault 账户
        if pool.requires_vault_reading {
            if let Some(vaults) = &pool.vault_accounts {
                for vault in vaults {
                    self.subscribe_account(vault).await?;
                    println!("📦 Subscribed to vault: {}", vault);
                }
            }
        }
    }
    Ok(())
}
```

4. **修改数据处理逻辑**

```rust
// rust-pool-cache/src/pool_cache.rs

pub struct PoolState {
    pub pool_data: Vec<u8>,
    pub vault_data: HashMap<String, TokenAccount>,  // 🆕 vault 数据缓存
    pub last_updated: u64,
}

impl PoolCache {
    fn handle_account_update(&mut self, pubkey: &str, data: &[u8]) {
        // 检查是否是 vault 账户
        if self.is_vault_account(pubkey) {
            // 解析为 SPL Token Account
            if let Ok(token_account) = TokenAccount::unpack(data) {
                self.update_vault_data(pubkey, token_account);
                
                // 触发关联池子的价格更新
                self.recalculate_pool_price_with_vault(pubkey);
            }
        } else {
            // 处理池子账户更新（原有逻辑）
            self.handle_pool_update(pubkey, data);
        }
    }
    
    fn recalculate_pool_price_with_vault(&mut self, vault_pubkey: &str) {
        // 找到关联的池子
        if let Some(pool_address) = self.find_pool_by_vault(vault_pubkey) {
            if let Some(pool_state) = self.pools.get(pool_address) {
                // 从 vault 读取实际储备量
                let (reserve_a, reserve_b) = self.get_reserves_from_vaults(pool_address);
                
                // 重新计算价格
                let price = reserve_b as f64 / reserve_a as f64;
                
                // 更新缓存
                // ...
            }
        }
    }
}
```

---

### 方案 2: 批量 RPC 查询（备选）

定期通过 RPC 批量查询 vault 账户余额。

#### 优点
- 实现简单
- 不需要修改 WebSocket 逻辑

#### 缺点
- 延迟较高（5-10秒更新一次）
- 消耗更多 RPC 请求

#### 实施

```rust
// rust-pool-cache/src/vault_reader.rs

pub struct VaultReader {
    rpc_client: RpcClient,
    vault_addresses: Vec<Pubkey>,
}

impl VaultReader {
    pub async fn read_vaults_batch(&self) -> Result<HashMap<Pubkey, u64>> {
        let mut reserves = HashMap::new();
        
        // 批量查询账户（最多100个一次）
        for chunk in self.vault_addresses.chunks(100) {
            let accounts = self.rpc_client
                .get_multiple_accounts(chunk)
                .await?;
            
            for (pubkey, account) in chunk.iter().zip(accounts.iter()) {
                if let Some(account) = account {
                    if let Ok(token_account) = TokenAccount::unpack(&account.data) {
                        reserves.insert(*pubkey, token_account.amount);
                    }
                }
            }
        }
        
        Ok(reserves)
    }
    
    // 定期更新（每5秒一次）
    pub async fn start_polling(&self) {
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        
        loop {
            interval.tick().await;
            
            if let Ok(reserves) = self.read_vaults_batch().await {
                // 更新缓存
                self.update_cache(reserves);
            }
        }
    }
}
```

---

## 🚀 实施优先级

### 阶段 1: 快速激活（方案 2）⏱️ 2小时

使用 RPC 批量查询快速激活 SolFi V2 和 GoonFi：

1. 实现 `VaultReader` 模块
2. 在 `config.toml` 中添加 vault 地址
3. 启用 SolFi V2 和 GoonFi 池子
4. 测试价格更新

**收益**: 立即获得 43% 的套利机会覆盖

### 阶段 2: 优化升级（方案 1）⏱️ 1天

实现 WebSocket 多账户订阅：

1. 修改配置结构
2. 修改 WebSocket 订阅逻辑
3. 修改数据处理逻辑
4. 全面测试

**收益**: 实时更新，零延迟

---

## 📋 所需 Vault 地址

### SolFi V2

**池子 1**: `65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc` (USDC/USDT)
- 需要查询池子账户，找到 `token_a_vault` 和 `token_b_vault` 字段
- 使用 `solana account` 命令或 RPC 查询

**池子 2**: `FkEB6uvyzuoaGpgs4yRtFtxC4WJxhejNFbUkj5R6wR32` (USDC/USDT #2)
- 同上

### GoonFi

**池子**: `4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K` (USDC/SOL)
- 需要查询池子账户

---

## 🔧 查询 Vault 地址的方法

### 方法 1: 使用 Solana CLI

```bash
# 1. 查询池子账户
solana account 65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc --output json

# 2. 解析 data 字段，找到 vault pubkeys
# 通常在固定偏移量位置（例如：offset 40-72, 72-104）
```

### 方法 2: 使用 Anchor/Solana Explorer

1. 打开 [Solana Explorer](https://explorer.solana.com/)
2. 搜索池子地址
3. 查看 "Account Data" 部分
4. 找到类型为 `TokenAccount` 的 pubkey

### 方法 3: 使用 RPC 查询

```rust
let account = rpc_client.get_account_data(&pool_pubkey).await?;
let pool = SolFiV2PoolState::try_from_slice(&account)?;

println!("Token A Vault: {}", pool.token_a_vault);
println!("Token B Vault: {}", pool.token_b_vault);
```

---

## 📊 预期收益

### 激活后的套利机会覆盖率

| DEX | 机会占比 | 状态 |
|-----|---------|------|
| SolFi V2 | 37% | ⚠️ 待激活 → ✅ 激活 |
| AlphaQ | 18% | ✅ 已激活 |
| HumidiFi | 14% | ✅ 已激活 |
| TesseraV | 9.35% | ✅ 已激活 |
| GoonFi | 6% | ⚠️ 待激活 → ✅ 激活 |
| Lifinity V2 | 4.24% | ✅ 已激活 |
| **总计** | **88.59%** | **完全激活后** |

---

## 🎯 下一步行动

1. ✅ 确认需要实施（用户决定）
2. ⏱️ 选择实施方案（推荐先方案2，后方案1）
3. 🔍 查询 vault 地址
4. 💻 实施代码
5. ✅ 测试验证
6. 🚀 部署激活

---

## 📝 备注

- GoonFi 和 SolFi V2 的反序列化器已经完整实现
- 只需要添加 vault 读取逻辑即可激活
- 建议优先激活 SolFi V2（37% 机会，最重要）
- 可以先用方案2快速上线，然后用方案1优化

**实施完成后，系统将覆盖近 90% 的套利机会！** 🎉



