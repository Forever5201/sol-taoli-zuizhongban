# Token Vault 读取实施计划

## 🎯 目标

为 SolFi V2 和 GoonFi 实现从 Token Vault 账户读取真实储备量的功能。

---

## 🔍 问题根因分析

### 发现

经过详细测试和代码分析，确认：

**SolFi V2**:
- ❌ 池子账户数据中 **不包含** 真实储备量
- ❌ config_fields 中所有值都 < 100M
- ❌ 找到的值 (3000, 10000) 是配置参数，不是储备
- ✅ Vault 地址存在: pubkey_4 (token A vault), pubkey_5 (token B vault)

**GoonFi**:
- ❌ 池子账户数据中 **不包含** 真实储备量
- ❌ config_fields 中所有值都 < 100M
- ❌ 找到的值 (200, 1.5) 是配置参数
- ✅ Vault 地址应该也在 pubkey 字段中

**对比: AlphaQ** (成功案例):
- ✅ 储备量直接存储在池子账户中
- ✅ 在 offset 432 和 440 位置
- ✅ 值为 ~1M，合理且准确

### 结论

**不同的 AMM 设计哲学**:
1. **AlphaQ**: 储备量缓存在池子账户（快速查询）
2. **SolFi V2 / GoonFi**: 储备量只在 vault 账户（更安全但查询慢）

---

## 📋 实施方案

### 方案 A: WebSocket 更新时查询 Vault（推荐）

**优点**:
- 实时准确
- 每次更新都获取最新余额
- 适用于所有 DEX

**缺点**:
- 增加延迟（每次更新需额外 RPC 调用）
- 消耗更多 RPC 配额

**实施步骤**:

1. **修改 WebSocket 处理逻辑**
   ```rust
   // src/websocket.rs
   
   async fn handle_pool_update(
       &self,
       pool: &PoolConfig,
       account_data: &[u8],
       connection: &RpcClient,  // 新增参数
   ) {
       match pool.pool_type.as_str() {
           "solfi_v2" => {
               let pool_state = SolFiV2PoolState::from_account_data(account_data)?;
               
               // 读取 vault 余额
               let reserve_a = self.read_vault_balance(
                   connection,
                   pool_state.token_a_vault()
               ).await?;
               
               let reserve_b = self.read_vault_balance(
                   connection,
                   pool_state.token_b_vault()
               ).await?;
               
               // 使用 vault 余额计算价格
               let price = reserve_b as f64 / reserve_a as f64;
               // ...
           }
           // ...
       }
   }
   
   async fn read_vault_balance(
       &self,
       connection: &RpcClient,
       vault_pubkey: &Pubkey,
   ) -> Result<u64> {
       let account = connection.get_account(vault_pubkey).await?;
       
       // 解析 SPL Token 账户（165 bytes）
       // offset 64-72: amount (u64)
       if account.data.len() == 165 {
           let amount = (&account.data[64..72]).read_u64::<LittleEndian>()?;
           Ok(amount)
       } else {
           Err(Error::InvalidTokenAccount)
       }
   }
   ```

2. **优化: 批量查询**
   ```rust
   // 使用 getMultipleAccounts 批量查询所有 vault
   async fn read_multiple_vaults(
       &self,
       connection: &RpcClient,
       vault_pubkeys: &[Pubkey],
   ) -> Result<Vec<u64>> {
       let accounts = connection
           .get_multiple_accounts(vault_pubkeys)
           .await?;
       
       accounts.iter()
           .map(|acc| parse_token_amount(acc))
           .collect()
   }
   ```

3. **缓存优化**
   ```rust
   // 缓存 vault 余额，只在必要时刷新
   struct VaultCache {
       balances: HashMap<Pubkey, (u64, Instant)>,
       ttl: Duration,  // 例如 10 秒
   }
   ```

---

### 方案 B: 初始化时查询一次，定期刷新

**优点**:
- 减少实时查询延迟
- 降低 RPC 调用频率

**缺点**:
- 可能不是最新余额（有延迟）
- 需要定期刷新机制

**实施步骤**:

1. **在程序启动时查询所有 vault**
   ```rust
   async fn initialize_vaults(
       connection: &RpcClient,
       pools: &[PoolConfig],
   ) -> HashMap<String, (u64, u64)> {
       let mut vault_balances = HashMap::new();
       
       for pool in pools {
           if pool.pool_type == "solfi_v2" || pool.pool_type == "goonfi" {
               // 解析池子数据获取 vault 地址
               // 查询 vault 余额
               // 存储到 HashMap
           }
       }
       
       vault_balances
   }
   ```

2. **定期刷新（例如每 30 秒）**
   ```rust
   tokio::spawn(async move {
       let mut interval = tokio::time::interval(Duration::from_secs(30));
       loop {
           interval.tick().await;
           // 刷新所有 vault 余额
       }
   });
   ```

---

### 方案 C: 混合方案（最优）

**策略**:
1. 启动时查询所有 vault（初始化）
2. WebSocket 更新时使用缓存的余额（快速）
3. 后台定期刷新 vault 余额（准确）

**代码框架**:
```rust
struct PoolManager {
    vault_cache: Arc<RwLock<VaultCache>>,
    connection: Arc<RpcClient>,
}

impl PoolManager {
    // 初始化
    async fn initialize(&self, pools: &[PoolConfig]) {
        let balances = self.query_all_vaults(pools).await;
        let mut cache = self.vault_cache.write().await;
        *cache = balances;
    }
    
    // WebSocket 更新处理
    async fn handle_update(&self, pool: &Pool, data: &[u8]) {
        let pool_state = parse_pool_data(data);
        
        // 从缓存读取 vault 余额（快速）
        let cache = self.vault_cache.read().await;
        let (reserve_a, reserve_b) = cache.get(&pool.address)?;
        
        // 计算价格
        let price = reserve_b as f64 / reserve_a as f64;
        // ...
    }
    
    // 后台刷新
    async fn background_refresh(&self) {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            // 刷新所有 vault
        }
    }
}
```

---

## 📊 实施优先级

### Phase 1: 验证和文档化（已完成）✅

- [x] 确认 AlphaQ 修复成功
- [x] 确认 SolFi V2 需要 vault 读取
- [x] 确认 GoonFi 需要 vault 读取
- [x] 暂时禁用不准确的池子

### Phase 2: 快速原型（建议下一步）

**目标**: 为 1-2 个池子实现 vault 读取验证概念

1. 创建简单的测试脚本
   - 查询 SolFi V2 池子的 vault 地址
   - 读取 vault 余额
   - 对比池子数据验证

2. 验证性能影响
   - 测量额外的延迟
   - 评估 RPC 配额消耗

### Phase 3: 完整实现（1-2 天）

1. 实现 vault 读取模块
2. 集成到 WebSocket 处理流程
3. 添加缓存和优化
4. 完整测试所有池子

---

## 🔧 快速验证脚本

创建一个测试脚本验证 vault 读取的可行性：

```javascript
// test-vault-reading.js
const { Connection, PublicKey } = require('@solana/web3.js');

async function testVaultReading() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // SolFi V2 池子
  const poolAddress = '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc';
  const poolPubkey = new PublicKey(poolAddress);
  
  console.log('📥 获取池子数据...');
  const poolAccount = await connection.getAccountInfo(poolPubkey);
  const poolData = poolAccount.data;
  
  // 假设 vault 在 pubkey_4 和 pubkey_5 位置
  // offset: 40 (header) + 32*3 = 136
  const vaultA = new PublicKey(poolData.slice(136, 168));
  const vaultB = new PublicKey(poolData.slice(168, 200));
  
  console.log(`Vault A: ${vaultA.toBase58()}`);
  console.log(`Vault B: ${vaultB.toBase58()}`);
  
  // 读取 vault 余额
  const vaultAAccount = await connection.getAccountInfo(vaultA);
  const vaultBAccount = await connection.getAccountInfo(vaultB);
  
  if (vaultAAccount && vaultAAccount.data.length === 165) {
    const amountA = vaultAAccount.data.readBigUInt64LE(64);
    console.log(`✅ Vault A 余额: ${amountA.toString()}`);
  }
  
  if (vaultBAccount && vaultBAccount.data.length === 165) {
    const amountB = vaultBAccount.data.readBigUInt64LE(64);
    console.log(`✅ Vault B 余额: ${amountB.toString()}`);
  }
}

testVaultReading().catch(console.error);
```

---

## ✅ 当前建议

### 短期（现在）

1. ✅ **使用 AlphaQ 池子**（18% 机会，完全可用）
   - USDT/USDC
   - USDC/USD1
   - USDS/USDC

2. ✅ **继续使用 Raydium, Meteora, Lifinity**
   - 这些都工作正常
   - 覆盖大部分流动性

3. ⚠️ **暂时禁用 SolFi V2 和 GoonFi**
   - 避免错误的价格信号
   - 等待 vault 读取功能

### 中期（本周）

4. **实现 Vault 读取功能**
   - 先实现简单版本（方案 A）
   - 测试性能影响
   - 如果可行，实施混合方案（方案 C）

5. **重新启用 SolFi V2 和 GoonFi**
   - 使用 vault 读取
   - 验证准确性
   - 监控性能

---

## 📈 预期影响

### 当前可用（Phase 1完成）

| DEX 类别 | 池子数 | 机会覆盖 | 状态 |
|---------|--------|---------|------|
| Raydium V4 | 13 | ~15% | ✅ 正常 |
| Raydium CLMM | 2 | ~5% | ✅ 正常 |
| Meteora DLMM | 1 | ~2% | ✅ 正常 |
| **AlphaQ** | 3 | **18%** | ✅ **新增** |
| HumidiFi | 3 | ~10% | ✅ 正常 |
| **合计** | 22 | **~50%** | ✅ |

### 完成 Vault 读取后

| DEX 类别 | 池子数 | 机会覆盖 | 状态 |
|---------|--------|---------|------|
| 以上所有 | 22 | ~50% | ✅ |
| **SolFi V2** | 2 | **37%** | ✅ **恢复** |
| **GoonFi** | 1 | **6%** | ✅ **恢复** |
| **合计** | 25 | **~93%** | ✅ |

---

## 🛠️ 技术细节

### SPL Token 账户结构

```
Offset | Size | Field
-------|------|-------
0      | 32   | mint (Pubkey)
32     | 32   | owner (Pubkey)  
64     | 8    | amount (u64) ⭐ 我们需要这个
72     | 36   | delegate (Option<Pubkey>)
108    | 1    | state (u8)
109    | 12   | isNative (Option<u64>)
121    | 8    | delegatedAmount (u64)
129    | 36   | closeAuthority (Option<Pubkey>)
Total: 165 bytes
```

### Rust 实现示例

```rust
use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use byteorder::{ByteOrder, LittleEndian};

pub async fn read_vault_amount(
    client: &RpcClient,
    vault_pubkey: &Pubkey,
) -> Result<u64, Box<dyn std::error::Error>> {
    // 查询 vault 账户
    let account = client.get_account(vault_pubkey)?;
    
    // 验证是 SPL Token 账户
    if account.data.len() != 165 {
        return Err("Not a valid SPL Token account".into());
    }
    
    // 读取 amount 字段 (offset 64)
    let amount = LittleEndian::read_u64(&account.data[64..72]);
    
    Ok(amount)
}
```

---

## 📝 下一步 Action Items

### 立即执行

- [x] 确认 AlphaQ 工作正常 ✅
- [x] 暂时禁用 SolFi V2 和 GoonFi ✅
- [ ] 重启程序验证配置

### 本周完成

- [ ] 创建 vault 读取测试脚本
- [ ] 验证 SolFi V2 的 vault 地址正确性
- [ ] 测量 RPC 调用性能影响
- [ ] 实现简单的 vault 读取功能
- [ ] 集成并测试

### 长期优化

- [ ] 实现 vault 余额缓存
- [ ] 优化批量查询
- [ ] 添加容错和重试机制
- [ ] 性能监控和告警

---

**文档创建时间**: 2025-10-27 10:07  
**状态**: 📋 计划已制定，等待实施  
**优先级**: 🔥 高（影响 43% 机会）




