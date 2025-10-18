# 下一步行动计划

## 🎯 立即行动（今天）

### 1. 体验经济模型工具（15分钟）✨

**无需任何配置，立即可用！**

```bash
# 安装依赖
npm install
cd packages/core && npm install && cd ../..

# 运行完整演示
npm run demo

# 测试成本计算器
npm run cost-sim -- -s 3 -cu 300000 -cup 10000 -jt 75

# 监控 Jito 市场
npm run jito-monitor
```

**预期结果**: 看到完整的成本分析、利润计算、风险评估演示

---

### 2. 理解系统架构（30分钟）📚

阅读顺序：

1. [README.md](README.md) - 5分钟，了解项目概述
2. [MVP_COMPLETE.md](MVP_COMPLETE.md) - 10分钟，了解已完成的功能
3. [USAGE_GUIDE.md](USAGE_GUIDE.md) - 15分钟，了解如何使用

---

## 🚀 短期目标（本周）

### 3. 配置 Devnet 环境（1小时）🔧

```bash
# 步骤 1: 创建全局配置
copy configs\global.example.toml configs\global.toml

# 步骤 2: 编辑 configs/global.toml
# - DEFAULT_RPC_URL = "https://api.devnet.solana.com"
# - DEFAULT_KEYPAIR_PATH = "./test-keypair.json"  
# - acknowledge_terms_of_service = true

# 步骤 3: 创建测试密钥
solana-keygen new --outfile ./test-keypair.json --no-bip39-passphrase

# 步骤 4: 获取 Devnet SOL
solana airdrop 5 ./test-keypair.json --url devnet
```

---

### 4. 首次运行 On-Chain Bot（30分钟）🤖

```bash
# 安装 Bot 依赖
cd packages/onchain-bot && npm install && cd ../..

# 运行 Bot（60秒测试）
npm run start:onchain-bot -- --config packages/onchain-bot/config.example.toml

# 按 Ctrl+C 停止后查看输出
```

**关键指标**:
- ✅ Bot 能够启动
- ✅ RPC 连接成功
- ✅ 能够获取价格数据
- ✅ 经济模型计算正常
- ✅ 日志输出清晰

---

### 5. 参数调优（1-2小时）⚙️

根据 Devnet 表现调整参数：

```toml
# packages/onchain-bot/config.example.toml

[arbitrage]
min_spread_percent = 0.3  # 降低以看到更多机会
trade_amount = 50_000_000  # 0.05 SOL（减小金额）

[economics]
min_profit_lamports = 50_000  # 降低利润门槛
max_slippage = 0.02  # 放宽滑点
```

重新运行并观察差异。

---

## 📈 中期目标（下周）

### 6. 集成真实 Swap 指令（2-3天）

**当前限制**: 使用测试交易，无法实际套利

**解决方案**:

选项A：集成 Raydium SDK
```bash
npm install @raydium-io/raydium-sdk
```

选项B：集成 Jupiter SDK（推荐）
```bash
npm install @jup-ag/api
```

在 `transaction.ts` 中实现真实的 `buildSwapTransaction`。

---

### 7. 优化 Raydium 解析器（1-2天）

**当前限制**: 使用简化的数据结构和偏移量

**解决方案**:

参考 Raydium SDK 的 AMM 布局：
```typescript
// 使用 borsh 或 buffer-layout 精确反序列化
import { struct, u64 } from '@solana/buffer-layout';
```

---

### 8. 添加更多 Devnet 市场（1天）

在 `markets.toml` 中添加更多交易对：

- RAY/SOL
- SRM/SOL
- 其他流动性较好的池子

---

## 🎯 长期目标（2-4周）

### 9. Jito 集成（阶段2）

**文件**: `packages/onchain-bot/src/executors/jito-executor.ts`

**功能**:
- gRPC 客户端（`@jito-labs/jito-ts`）
- Bundle 构建器
- 动态小费（使用已完成的 `JitoTipOptimizer`）
- 优先打包

**预期提升**:
- 成功率: 50% → 75%+
- 可降低小费（精确出价）
- 抗 MEV 攻击

---

### 10. Jupiter Bot（阶段3）

**模块**: `packages/jupiter-bot/`

**功能**:
- Jupiter Server 管理器
- 环形报价查询
- 多跳路径支持
- Worker Threads 并发

**预期提升**:
- 发现机会数: 3-5倍
- 路径复杂度: 2-hop → 4-hop
- 资本利用率提升

---

### 11. 闪电贷（阶段4）

**文件**: `packages/core/src/solana/flashloan.ts`

**功能**:
- Solend 协议集成
- 指令组合器
- 原子交易构建

**预期提升**:
- 零本金套利
- 资本利用率: 无限大
- 可做大额机会

---

## 💡 优先级建议

### 关键路径（优先做）

```
1. 测试经济模型工具 ✅ (今天)
   ↓
2. Devnet 环境配置 ✅ (今天)
   ↓
3. 首次运行 Bot (明天)
   ↓
4. 集成真实 Swap 指令 (下周)
   ↓
5. Jito 集成 (2周后)
   ↓
6. Mainnet 小额测试 (3周后)
```

### 可选路径（有时间再做）

- 添加单元测试
- 优化性能
- 更多 DEX 支持
- Web Dashboard

---

## 📊 成功指标

### MVP 验收

- [ ] 能够运行所有演示工具
- [ ] 能够在 Devnet 启动 Bot
- [ ] 能够扫描市场和解析价格
- [ ] 经济模型计算正确
- [ ] 熔断器正常工作

### 第二阶段验收

- [ ] Jito Bundle 成功发送
- [ ] 真实 Swap 交易执行
- [ ] Mainnet 小额测试盈利
- [ ] 成功率 > 70%

---

## 🔑 关键资源

### 文档优先级

**必读**（1小时）:
1. [QUICKSTART.md](QUICKSTART.md) - 快速开始
2. [USAGE_GUIDE.md](USAGE_GUIDE.md) - 使用指南
3. [MVP_COMPLETE.md](MVP_COMPLETE.md) - 功能总览

**深入阅读**（2-3小时）:
1. [设计文档](sol设计文档.md) - 架构设计
2. [API文档](packages/core/src/economics/README.md) - 经济模型
3. 代码注释 - 每个模块的 JSDoc

---

## 🎁 额外资源

### 配置模板

- `configs/strategy-small.toml` - 小资金策略
- `configs/strategy-medium.toml` - 中等资金策略
- `configs/strategy-large.toml` - 大资金策略

### 测试工具

- `tools/cost-simulator/` - 成本计算
- `tools/jito-monitor/` - 市场监控
- `scripts/test-devnet.*` - 一键测试

---

## 📞 获取支持

1. 查看 [USAGE_GUIDE.md](USAGE_GUIDE.md) 的"常见问题"章节
2. 检查日志文件: `logs/onchain-bot.log`
3. 启用 debug 日志: `LOG_LEVEL=debug`
4. 使用干运行模式排查: `dry_run = true`

---

## 🎯 总结

您现在有：

- ✅ **完整的经济模型系统**（立即可用）
- ✅ **工作的 On-Chain Bot MVP**（需要配置）
- ✅ **专业级的文档和工具**
- ✅ **清晰的升级路径**

**下一步**: 

👉 **立即运行**: `npm run demo`  
👉 **今天测试**: 参考 [QUICKSTART.md](QUICKSTART.md)  
👉 **本周目标**: Devnet 完整测试

---

**🚀 开始您的套利之旅吧！**


