# 🔗 桥接代币和池子详细分析报告

**生成时间**: 2025-10-26  
**分析内容**: 桥接代币使用情况和交易对分布

---

## 📊 桥接代币总览

### 1. USDC

**基本信息**:
- **代币符号**: USDC
- **代币地址**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **使用次数**: 7,149
- **平均利润**: 2.5625 SOL
- **总利润**: 18319.26 SOL

**输入代币分布** (Top 5):
- `SOL (Wrapped)`: 7,149 次 (100.00%)

**输出代币分布** (Top 5):
- `SOL (Wrapped)`: 7,149 次 (100.00%)

**最常见的交易路径** (Top 10):
- SOL (Wrapped) → USDC → SOL (Wrapped): 7,149 次 (100.00%)

---

### 2. USDT

**基本信息**:
- **代币符号**: USDT
- **代币地址**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **使用次数**: 5,208
- **平均利润**: 0.9751 SOL
- **总利润**: 5078.16 SOL

**输入代币分布** (Top 5):
- `SOL (Wrapped)`: 5,208 次 (100.00%)

**输出代币分布** (Top 5):
- `SOL (Wrapped)`: 5,208 次 (100.00%)

**最常见的交易路径** (Top 10):
- SOL (Wrapped) → USDT → SOL (Wrapped): 5,208 次 (100.00%)

---

## 📈 代币使用汇总

### 所有使用的代币 Mint 地址

**总计发现 3 个不同的代币地址**

- `So11111111111111111111111111111111111111112` - SOL (Wrapped)
- `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` - USDC
- `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` - USDT

---

## 💡 关键发现

### 1. 主要桥接代币

- **最常用**: USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
- **使用次数**: 7,149 次
- **平均利润**: 2.5625 SOL

### 2. 交易模式

您的套利机会主要是 **环形套利**：
- **起始代币**: SOL (Wrapped) (12,357 次)
- **结束代币**: SOL (Wrapped) (12,357 次)
- **模式**: 环形套利 (输入和输出相同)

### 3. 对 Rust Pool Cache 的建议

基于实际数据，建议监控以下交易对：

#### USDC 路径
- 主要路径: SOL (Wrapped) → USDC → SOL (Wrapped)
- 使用频率: 7,149 次
- 建议监控: SOL (Wrapped)/USDC 和 USDC/SOL (Wrapped) 池子

#### USDT 路径
- 主要路径: SOL (Wrapped) → USDT → SOL (Wrapped)
- 使用频率: 5,208 次
- 建议监控: SOL (Wrapped)/USDT 和 USDT/SOL (Wrapped) 池子


---

**报告结束**
