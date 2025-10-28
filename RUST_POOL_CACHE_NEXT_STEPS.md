# 🚀 Rust Pool Cache - 下一步工作规划

**规划日期**: 2025-10-26  
**当前状态**: ✅ 核心功能验证成功（延迟 0.022ms）  
**规划周期**: 未来 7 天（2025-10-26 至 2025-11-02）

---

## 📋 总体规划概览

```
Phase 4: HTTP API 集成 → [今天完成]
Phase 5: 扩展池覆盖   → [明天完成]
Phase 6: TypeScript 集成 → [2 天完成]
Phase 7: 生产环境部署 → [3 天完成]
Phase 8: 多 DEX 支持  → [未来 2 周]
```

**核心目标**：
1. 完成 HTTP API 集成，实现跨语言通信
2. 扩展池覆盖至 16-30 个高价值池
3. 集成到现有 TypeScript 套利机器人
4. 验证端到端套利流程
5. 生产环境部署和监控

---

## 🎯 Phase 4: HTTP API 集成（今天，2-4 小时）

### 目标
完成 Rust Pool Cache 的 HTTP REST API，让 TypeScript Bot 可以查询实时价格。

### 任务清单

#### Task 4.1: 更新 `websocket.rs` 集成 `price_cache` ⏱️ 30 分钟
**优先级**: 🔴 最高  
**状态**: 🚧 进行中

**需要的代码更改**：

```rust
// src/websocket.rs

// 1. 在结构体中添加 price_cache
pub struct WebSocketClient {
    url: String,
    metrics: Arc<MetricsCollector>,
    proxy_config: Option<ProxyConfig>,
    price_cache: Arc<PriceCache>,  // ← 新增
}

// 2. 更新构造函数
impl WebSocketClient {
    pub fn new(
        url: String,
        metrics: Arc<MetricsCollector>,
        proxy_config: Option<ProxyConfig>,
        price_cache: Arc<PriceCache>,  // ← 新增参数
    ) -> Self {
        Self { url, metrics, proxy_config, price_cache }
    }
}

// 3. 在 handle_account_notification 中更新缓存
// 反序列化成功后添加：
let pool_price = PoolPrice {
    pool_id: pool_config.address.clone(),
    dex_name: "Raydium".to_string(),
    pair: pool_config.name.clone(),
    base_reserve: pool_state.coin_vault_amount,
    quote_reserve: pool_state.pc_vault_amount,
    base_decimals: pool_state.coin_decimals as u8,
    quote_decimals: pool_state.pc_decimals as u8,
    price,
    last_update: Instant::now(),
};

self.price_cache.update_price(pool_price);
```

**验收标准**：
- ✅ 编译通过无警告
- ✅ 价格缓存正常更新
- ✅ 可从 `price_cache` 读取价格

---

#### Task 4.2: 编译并测试 HTTP API ⏱️ 45 分钟
**优先级**: 🔴 最高  
**状态**: 📋 待开始

**步骤**：
```bash
# 1. 重新编译（会下载 axum 等新依赖）
cd rust-pool-cache
cargo build --release

# 2. 启动服务（使用扩展配置）
.\target\release\solana-pool-cache.exe config-expanded.toml

# 3. 测试 API 端点
curl http://localhost:3001/health
curl http://localhost:3001/prices
curl -X POST http://localhost:3001/scan-arbitrage \
  -H "Content-Type: application/json" \
  -d '{"threshold_pct": 0.3}'
```

**预期输出**：
```json
// GET /health
{
  "status": "ok",
  "cached_pools": 16,
  "cached_pairs": ["SOL/USDC", "SOL/USDT", ...]
}

// GET /prices
[
  {
    "pool_id": "58oQChx4...",
    "dex_name": "Raydium",
    "pair": "SOL/USDC",
    "price": 1766.18,
    "base_reserve": 8631865774,
    "quote_reserve": 15245408564203,
    "age_ms": 245
  },
  ...
]

// POST /scan-arbitrage
{
  "opportunities": [],
  "count": 0
}
```

**验收标准**：
- ✅ HTTP 服务器正常启动（端口 3001）
- ✅ 所有 4 个端点返回正确数据
- ✅ CORS 配置正确（允许跨域）

---

#### Task 4.3: 性能基准测试 ⏱️ 30 分钟
**优先级**: 🟡 中等  
**状态**: 📋 待开始

**测试指标**：
```bash
# 1. API 延迟测试
time curl http://localhost:3001/prices

# 2. 并发测试（使用 ab 或 wrk）
ab -n 1000 -c 10 http://localhost:3001/health

# 3. 内存监控
# Windows: 任务管理器
# Linux: htop
```

**目标性能**：
- API 响应延迟：< 5ms
- 并发处理能力：> 100 req/s
- 内存增长：< 20MB

**验收标准**：
- ✅ API 延迟 < 5ms
- ✅ 可处理 100+ 并发请求
- ✅ 无内存泄漏

---

#### Task 4.4: 文档更新 ⏱️ 15 分钟
**优先级**: 🟢 低  
**状态**: 📋 待开始

更新以下文档：
- ✅ `README.md` - 添加 HTTP API 使用说明
- ✅ `QUICK_START.md` - 更新启动步骤
- ✅ `API_DOCUMENTATION.md` - 新建 API 文档

---

## 🚀 Phase 5: 扩展池覆盖（明天，4-6 小时）

### 目标
从 3 个池扩展到 16-30 个高价值池，验证性能和稳定性。

### 任务清单

#### Task 5.1: 使用扩展配置文件 ⏱️ 10 分钟
**优先级**: 🔴 最高

```bash
# 启动 16 池配置
cd rust-pool-cache
.\target\release\solana-pool-cache.exe config-expanded.toml
```

**监控指标**：
- 订阅成功率：16/16
- 平均延迟：< 50μs
- 内存占用：< 15MB

---

#### Task 5.2: 性能验证 ⏱️ 1 小时
**优先级**: 🔴 最高

**测试场景**：
1. 运行 30 分钟，监控稳定性
2. 记录延迟统计（P50/P95/P99）
3. 验证价格缓存更新频率
4. 测试自动重连（手动断网）

**验收标准**：
- ✅ 30 分钟无崩溃
- ✅ 平均延迟 < 50μs
- ✅ 所有池正常更新
- ✅ 自动重连成功

---

#### Task 5.3: 添加更多池（可选） ⏱️ 2-3 小时
**优先级**: 🟢 低

如果 16 池测试成功，可扩展至 30-50 个池：

```toml
# config-ultra.toml

# 添加更多 Raydium V4 池
[[pools]]
address = "..."
name = "SRM/USDC (Raydium V4)"

# 添加 Raydium CLMM 池
[[pools]]
address = "..."
name = "SOL/USDC (Raydium CLMM - 0.3%)"

# 添加更多 Meme 币池
[[pools]]
address = "..."
name = "PEPE/SOL (Raydium V4)"
```

**验收标准**：
- ✅ 50 池同时订阅成功
- ✅ 延迟 < 100μs
- ✅ 内存 < 30MB

---

## 🔗 Phase 6: TypeScript Bot 集成（2-3 天）

### 目标
将 Rust Pool Cache 集成到现有 TypeScript 套利机器人，实现混合架构。

### 任务清单

#### Task 6.1: 创建 TypeScript 客户端 ⏱️ 2 小时
**优先级**: 🔴 最高

创建 `packages/jupiter-bot/src/rust-cache-client.ts`：

```typescript
import axios, { AxiosInstance } from 'axios';

export interface RustPoolPrice {
  pool_id: string;
  dex_name: string;
  pair: string;
  price: number;
  base_reserve: number;
  quote_reserve: number;
  age_ms: number;
}

export interface RustArbitrageOpportunity {
  pool_a_id: string;
  pool_a_dex: string;
  pool_a_price: number;
  pool_b_id: string;
  pool_b_dex: string;
  pool_b_price: number;
  pair: string;
  price_diff_pct: number;
  estimated_profit_pct: number;
  age_ms: number;
}

export class RustPoolCacheClient {
  private axios: AxiosInstance;
  private enabled: boolean;

  constructor(baseURL: string = 'http://localhost:3001', enabled: boolean = true) {
    this.axios = axios.create({ baseURL, timeout: 100 });
    this.enabled = enabled;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const response = await this.axios.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  async getPairPrices(pair: string): Promise<RustPoolPrice[]> {
    if (!this.enabled) return [];
    try {
      const response = await this.axios.get(`/prices/${pair}`);
      return response.data;
    } catch (error) {
      console.warn(`Rust Cache: Failed to get prices for ${pair}`, error);
      return [];
    }
  }

  async scanArbitrage(thresholdPct: number = 0.3): Promise<RustArbitrageOpportunity[]> {
    if (!this.enabled) return [];
    try {
      const response = await this.axios.post('/scan-arbitrage', {
        threshold_pct: thresholdPct,
      });
      return response.data.opportunities;
    } catch (error) {
      console.warn('Rust Cache: Failed to scan arbitrage', error);
      return [];
    }
  }
}
```

**验收标准**：
- ✅ TypeScript 编译通过
- ✅ 可调用 Rust HTTP API
- ✅ 错误处理完善

---

#### Task 6.2: 集成到 OpportunityFinder ⏱️ 4 小时
**优先级**: 🔴 最高

更新 `packages/jupiter-bot/src/opportunity-finder.ts`：

```typescript
import { RustPoolCacheClient } from './rust-cache-client';

export class OpportunityFinder {
  private rustCache: RustPoolCacheClient;

  constructor(config: OpportunityFinderConfig) {
    // ... 现有初始化代码 ...
    
    // ✅ 添加 Rust Cache 客户端
    this.rustCache = new RustPoolCacheClient(
      process.env.RUST_CACHE_URL || 'http://localhost:3001',
      process.env.USE_RUST_CACHE !== 'false'
    );
    
    // 启动时检查可用性
    this.rustCache.isAvailable().then(available => {
      if (available) {
        logger.info('✅ Rust Pool Cache is available');
      } else {
        logger.warn('⚠️ Rust Pool Cache is not available, using Jupiter API only');
      }
    });
  }

  /**
   * 混合策略：优先使用 Rust Cache，回退到 Jupiter API
   */
  async findOpportunities(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    // 1. 尝试从 Rust Cache 获取机会（超低延迟）
    try {
      const rustOpportunities = await this.rustCache.scanArbitrage(0.3);
      
      for (const rustOpp of rustOpportunities) {
        // 转换为标准格式
        opportunities.push({
          inputMint: this.getTokenMint(rustOpp.pair.split('/')[0]),
          outputMint: this.getTokenMint(rustOpp.pair.split('/')[1]),
          profit: BigInt(Math.floor(rustOpp.estimated_profit_pct * 1e9 / 100)),
          source: 'rust-cache',
          // ... 其他字段
        });
      }
      
      logger.info(`🦀 Rust Cache found ${opportunities.length} opportunities`);
    } catch (error) {
      logger.warn('Rust Cache scan failed, using Jupiter API');
    }

    // 2. 继续使用 Jupiter Worker 的机会（覆盖 Jupiter 内部路由）
    // ... 现有 Worker 逻辑 ...
    
    return opportunities;
  }
}
```

**验收标准**：
- ✅ Rust Cache 优先级高于 Jupiter
- ✅ 优雅降级（Rust 不可用时用 Jupiter）
- ✅ 机会去重逻辑正确

---

#### Task 6.3: 端到端测试 ⏱️ 3 小时
**优先级**: 🔴 最高

**测试场景**：
1. 启动 Rust Pool Cache
2. 启动 TypeScript Bot
3. 监控机会发现流程
4. 验证交易构建和执行

**验收标准**：
- ✅ Bot 正常启动
- ✅ 可从 Rust Cache 获取价格
- ✅ 机会发现延迟 < 100ms
- ✅ 完整套利流程可执行

---

## 🏭 Phase 7: 生产环境部署（3-4 天）

### 目标
将 Rust Pool Cache 部署到生产环境，实现 24/7 稳定运行。

### 任务清单

#### Task 7.1: 服务化部署 ⏱️ 4 小时
**优先级**: 🔴 最高

**Windows 服务** (使用 NSSM)：
```bash
# 1. 下载 NSSM
# 2. 安装服务
nssm install RustPoolCache "E:\...\solana-pool-cache.exe"
nssm set RustPoolCache AppDirectory "E:\...\rust-pool-cache"
nssm set RustPoolCache AppParameters config-expanded.toml
nssm start RustPoolCache
```

**验收标准**：
- ✅ 服务自动启动
- ✅ 崩溃自动重启
- ✅ 日志正常记录

---

#### Task 7.2: 监控和告警 ⏱️ 3 小时
**优先级**: 🟡 中等

实现监控系统：
1. **健康检查**：每 30 秒检查 `/health`
2. **延迟监控**：记录 P95/P99 延迟
3. **告警**：延迟 > 100ms 或服务不可用时推送

**工具选择**：
- Prometheus + Grafana（推荐）
- 或简单脚本 + 微信推送

---

#### Task 7.3: 容灾备份 ⏱️ 2 小时
**优先级**: 🟡 中等

实现多层备份策略：
1. **Rust Cache 不可用** → 回退到 Jupiter API
2. **免费 RPC 限速** → 切换到备用 RPC
3. **网络断线** → 自动重连（已实现）

---

## 🌐 Phase 8: 多 DEX 支持（未来 2 周）

### 目标
扩展至 Orca, Meteora, Phoenix 等 DEX，覆盖 80% 以上流动性。

### 任务清单（简略）

#### Task 8.1: Orca Whirlpool 支持 ⏱️ 1-2 天
- 创建 `deserializers/orca.rs`
- 实现 Whirlpool 反序列化
- 添加 Orca 池配置

#### Task 8.2: Meteora DLMM 支持 ⏱️ 1-2 天
- 创建 `deserializers/meteora.rs`
- 实现 DLMM 反序列化
- 添加 Meteora 池配置

#### Task 8.3: Phoenix 支持 ⏱️ 1-2 天
- 创建 `deserializers/phoenix.rs`
- 实现 Phoenix 反序列化
- 添加 Phoenix 池配置

---

## 📅 详细时间计划

### **今天（10-26）下午**
```
15:30-16:00  Task 4.1: 更新 websocket.rs
16:00-16:45  Task 4.2: 编译测试 HTTP API
16:45-17:15  Task 4.3: 性能基准测试
17:15-17:30  Task 4.4: 文档更新
17:30-18:00  代码审查和提交
```

### **明天（10-27）**
```
09:00-09:30  Task 5.1: 启动 16 池配置
09:30-11:00  Task 5.2: 性能验证和监控
11:00-12:00  Task 5.3: 添加更多池（可选）
14:00-16:00  Task 6.1: 创建 TypeScript 客户端
16:00-18:00  Task 6.2: 集成到 OpportunityFinder（部分）
```

### **后天（10-28）**
```
09:00-12:00  Task 6.2: 完成 OpportunityFinder 集成
14:00-17:00  Task 6.3: 端到端测试
17:00-18:00  问题修复和优化
```

### **第 4-7 天（10-29 至 11-01）**
```
生产环境部署和稳定性验证
```

---

## 🎯 优先级矩阵

| 任务 | 优先级 | 紧急度 | 重要性 | 预计工时 |
|------|-------|-------|-------|---------|
| Task 4.1 (websocket 集成) | 🔴 最高 | 高 | 高 | 30 分钟 |
| Task 4.2 (HTTP API 测试) | 🔴 最高 | 高 | 高 | 45 分钟 |
| Task 5.1 (16 池配置) | 🔴 最高 | 中 | 高 | 10 分钟 |
| Task 5.2 (性能验证) | 🔴 最高 | 中 | 高 | 1 小时 |
| Task 6.1 (TS 客户端) | 🔴 最高 | 中 | 高 | 2 小时 |
| Task 6.2 (Bot 集成) | 🔴 最高 | 高 | 高 | 4 小时 |
| Task 6.3 (端到端测试) | 🔴 最高 | 高 | 高 | 3 小时 |
| Task 7.1 (生产部署) | 🟡 中等 | 低 | 高 | 4 小时 |
| Task 4.3 (性能测试) | 🟡 中等 | 低 | 中 | 30 分钟 |
| Task 5.3 (50 池扩展) | 🟢 低 | 低 | 中 | 2-3 小时 |

---

## 📊 进度跟踪

### 已完成 ✅
- [x] Phase 1: 核心框架搭建 (100%)
- [x] Phase 2: 功能验证测试 (100%)
- [x] Phase 3: 扩展准备 (90%)

### 进行中 🚧
- [ ] Phase 4: HTTP API 集成 (10%)
  - [ ] Task 4.1 (0%)
  - [ ] Task 4.2 (0%)
  - [ ] Task 4.3 (0%)
  - [ ] Task 4.4 (0%)

### 待开始 📋
- [ ] Phase 5: 扩展池覆盖 (0%)
- [ ] Phase 6: TypeScript 集成 (0%)
- [ ] Phase 7: 生产环境部署 (0%)
- [ ] Phase 8: 多 DEX 支持 (0%)

---

## ⚠️ 风险和依赖

### 高风险项
1. **免费 RPC 限速** 🔴
   - 影响：可能无法订阅 50+ 池
   - 缓解：准备多个 RPC URL 轮询

2. **TypeScript 集成复杂度** 🟡
   - 影响：可能需要重构现有代码
   - 缓解：优雅降级设计

### 依赖项
1. **Clash 代理稳定性** → 影响所有任务
2. **Solana RPC 可用性** → 影响数据获取
3. **现有 Bot 可维护性** → 影响集成难度

---

## 🏆 成功标准

### Phase 4 成功标准
- ✅ HTTP API 正常工作
- ✅ 延迟 < 5ms
- ✅ 可从 TypeScript 调用

### Phase 5 成功标准
- ✅ 16-30 池稳定运行
- ✅ 延迟 < 50μs
- ✅ 无崩溃运行 1 小时+

### Phase 6 成功标准
- ✅ TypeScript Bot 集成成功
- ✅ 机会发现延迟 < 100ms
- ✅ 端到端套利流程可执行

### Phase 7 成功标准
- ✅ 服务化部署成功
- ✅ 监控告警正常
- ✅ 24/7 稳定运行

---

## 📞 下一步行动

### **立即执行**（现在）：
1. 执行 Task 4.1: 更新 `websocket.rs`
2. 执行 Task 4.2: 编译测试 HTTP API

### **今天完成**（18:00 前）：
- ✅ Phase 4 所有任务
- ✅ 提交代码到 Git

### **明天开始**（10-27 09:00）：
- 🚀 Phase 5: 扩展池覆盖
- 🚀 Phase 6: TypeScript 集成（开始）

---

## 📝 备注

1. **时间估算保守**：实际可能更快完成
2. **可并行任务**：文档更新可随时进行
3. **优先级可调整**：根据实际进展灵活调整

---

**规划完成时间**: 2025-10-26 15:30  
**规划作者**: AI Assistant  
**审阅状态**: 待用户确认  
**下次更新**: 2025-10-26 18:00（Phase 4 完成后）

---

**准备好开始了吗？** 🚀  
立即开始 Task 4.1 - 更新 `websocket.rs` 集成 `price_cache`！


