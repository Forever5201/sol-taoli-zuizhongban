# Jupiter Bot - 聚合器驱动套利策略

基于自托管Jupiter API的高性能套利机器人。

## 🎯 特性

- ✅ **自托管Jupiter API** - 无速率限制，最低延迟
- ✅ **Worker Threads并行** - 多线程高频查询
- ✅ **环形套利检测** - 自动发现三角套利机会
- ✅ **双执行路径** - Jito优先通道 + RPC Spam
- ✅ **智能熔断器** - 自动风险控制
- ✅ **实时监控** - 详细统计和告警

## 📋 前置要求

### 1. 自托管Jupiter API

参考设计文档第3.1节，需要先部署Jupiter API：

```bash
# 1. 下载jupiter-cli
wget https://github.com/jup-ag/jupiter-cli/releases/download/v6.0.0/jupiter-cli-linux

# 2. 启动Jupiter API
export RPC_URL="https://api.mainnet-beta.solana.com"
export ALLOW_CIRCULAR_ARBITRAGE="true"
./jupiter-cli --bind 127.0.0.1:8080
```

### 2. 准备钱包

```bash
# 创建专用热钱包
solana-keygen new -o ./keypairs/jupiter-bot.json

# 充值少量SOL（建议0.5-2 SOL）
solana transfer <地址> 1 --url mainnet-beta
```

### 3. 选择执行模式

**Jito模式（推荐）：**
- 成功率：80-95%
- 成本：小费0.00001-0.0001 SOL/笔
- 需要：Jito认证密钥

**Spam模式（备选）：**
- 成功率：50-70%
- 成本：仅Gas费
- 需要：多个高性能RPC

## 🚀 快速开始

### 1. 配置

```bash
# 复制配置模板
cp example-jito.toml my-config.toml

# 编辑配置
nano my-config.toml
```

**关键配置项：**

```toml
[jupiter]
api_url = "http://127.0.0.1:8080"  # Jupiter API地址
mints_file = "./mints.txt"         # 代币列表

[trading]
trade_amount_sol = 0.1             # 每笔金额
min_profit_sol = 0.001             # 最小利润

[execution]
mode = "jito"                      # 或 "spam"

[security]
acknowledge_terms_of_service = true  # ⚠️ 必须改为true
```

### 2. 编辑代币列表

```bash
# 编辑mints.txt
nano mints.txt

# 添加目标代币mint地址
# 建议：选择流动性好的主流代币
```

### 3. 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📊 工作原理

### 数据流

```
[Jupiter API] ← 高频查询 ← [Worker Threads] → 发现机会
                                ↓
                        [OpportunityFinder]
                                ↓
                          验证利润
                                ↓
                        [获取Swap交易]
                                ↓
                        [选择执行路径]
                        ↙            ↘
                [Jito Bundle]    [RPC Spam]
                        ↓            ↓
                    [交易确认]
                        ↓
                    [记录结果]
```

### 机会发现

1. **并行查询**：启动多个Worker线程
2. **环形套利**：查询 TokenA → TokenB → TokenC → TokenA
3. **利润验证**：检查 outAmount > inAmount + 成本
4. **路由优化**：Jupiter自动选择最优路径

### 执行策略

**Jito模式：**
```typescript
[核心交易] + [小费交易] → Jito Bundle → 优先打包
```

**Spam模式：**
```typescript
[同一交易] → 并行发送到多个RPC → 竞速确认
```

## 🔧 配置详解

### Jupiter配置

```toml
[jupiter]
# Jupiter API必须支持环形套利
api_url = "http://127.0.0.1:8080"

# 代币列表文件
mints_file = "./mints.txt"
```

### 交易参数

```toml
[trading]
# 交易金额（SOL）
trade_amount_sol = 0.1

# 最小利润阈值（SOL）
# 建议：0.001-0.01 SOL
min_profit_sol = 0.001

# 滑点容差（基点）
# 50 = 0.5%, 100 = 1%
slippage_bps = 50

# Worker数量
# 建议：CPU核心数的50-100%
worker_count = 4

# 查询间隔（毫秒）
# 值越小越激进，但CPU占用越高
query_interval_ms = 10
```

### Jito配置

```toml
[jito]
block_engine_url = "https://mainnet.block-engine.jito.wtf"

# Jito认证密钥
# 申请：https://jito.wtf
auth_keypair_path = "./keypairs/jito-auth.json"

# 小费金额（lamports）
# 建议：
# - 低竞争：5000-10000
# - 中竞争：10000-25000
# - 高竞争：25000-50000
tip_lamports = 10000
```

### Spam配置

```toml
[spam]
# RPC端点列表（越多越好）
rpc_endpoints = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana",
]

# 每个RPC发送次数
send_per_endpoint = 3

# 跳过预检（加快速度）
skip_preflight = true
```

## 📈 性能优化

### 1. Jupiter API优化

```bash
# 使用更强的机器
# CPU: 4核+ 
# 内存: 8GB+
# 网络: 低延迟到Solana RPC

# 优化RPC连接
export RPC_URL="https://your-premium-rpc.com"
```

### 2. Worker数量调优

```toml
# CPU密集型：worker_count = CPU核心数
worker_count = 8

# 网络密集型：worker_count = CPU核心数 * 2
worker_count = 16
```

### 3. 查询间隔优化

```toml
# 激进模式（高CPU）
query_interval_ms = 1

# 平衡模式（推荐）
query_interval_ms = 10

# 保守模式（低CPU）
query_interval_ms = 50
```

## 🛡️ 风险控制

### 熔断器

```toml
[security]
# 启用熔断器
circuit_breaker_enabled = true

# 连续失败阈值
circuit_breaker_max_failures = 5

# 每小时最大亏损（SOL）
circuit_breaker_loss_threshold = -0.1
```

### 资金管理

- ✅ **使用专用热钱包**
- ✅ **仅存放少量资金**（0.5-2 SOL）
- ✅ **定期提取利润**
- ❌ **不要使用冷钱包**
- ❌ **不要存放大额资金**

## 📊 监控与统计

### 实时统计

机器人每60秒输出一次统计：

```
═══════════════════════════════════════
📊 Jupiter Bot Statistics
═══════════════════════════════════════
Opportunities Found: 156
Trades Attempted: 23
Trades Successful: 18
Trades Failed: 5
Success Rate: 78.3%
Total Profit: 0.0234 SOL
Net Profit: 0.0189 SOL
═══════════════════════════════════════
```

### Discord告警

```toml
[monitoring]
webhook_url = "https://discord.com/api/webhooks/..."
```

## 🐛 故障排查

### Jupiter API无响应

```bash
# 检查Jupiter进程
ps aux | grep jupiter-cli

# 检查端口
curl http://127.0.0.1:8080/health

# 重启Jupiter
pkill jupiter-cli
./jupiter-cli --bind 127.0.0.1:8080
```

### 未发现机会

**可能原因：**
1. 代币列表太少 → 增加mints.txt
2. 利润阈值太高 → 降低min_profit_sol
3. 市场竞争激烈 → 正常情况

### 交易失败

**Jito模式：**
- 小费太低 → 提高tip_lamports
- 确认超时 → 等待下一个Jito领导者

**Spam模式：**
- RPC质量差 → 使用付费高性能RPC
- 发送次数少 → 增加send_per_endpoint

## 🔬 高级用法

### 自定义利润计算

```typescript
// 在opportunity-finder.ts中修改validateOpportunity
function validateOpportunity(quote: any): boolean {
  const profit = quote.outAmount - quote.inAmount;
  const gasCost = 5000; // 估算Gas费
  const jitoTip = 10000; // Jito小费
  const netProfit = profit - gasCost - jitoTip;
  
  return netProfit >= minProfitLamports;
}
```

### 动态小费策略

```typescript
// 在jito-executor.ts中实现
function calculateDynamicTip(profit: number): number {
  // 利润的1-5%作为小费
  return Math.min(Math.max(profit * 0.01, 5000), 50000);
}
```

## 📚 相关资源

- [Jupiter文档](https://station.jup.ag/docs)
- [Jito文档](https://jito-labs.gitbook.io/)
- [设计文档](../../sol设计文档.md)

## ⚠️ 免责声明

- 套利交易有风险，可能造成资金损失
- 本软件仅供学习和研究用途
- 使用前请充分理解风险
- 建议从小金额开始测试

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
