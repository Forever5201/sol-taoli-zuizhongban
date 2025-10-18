# Solana 套利机器人 - 经济模型核心

<div align="center">

**专业级 Solana DEX 套利经济模型系统**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

## 🎯 项目简介

这是一个完整的、生产级的 Solana DEX 套利经济模型系统，实现了专业套利者所需的所有核心功能：

- ✅ **精确成本计算**: 涵盖基础费、优先费、Jito 小费、闪电贷等所有成本
- ✅ **动态小费优化**: 实时 Jito 市场数据 + 历史学习 + 竞争评估
- ✅ **利润分析引擎**: 毛利/净利/ROI 计算 + 滑点估算 + 批量评估
- ✅ **风险管理系统**: 5层风险检查 + 机会验证 + 风险等级评估
- ✅ **熔断保护机制**: 连续失败检测 + 亏损监控 + 自动恢复
- ✅ **配置驱动策略**: 小/中/大资金预设 + TOML 配置 + 灵活定制
- ✅ **实用工具集**: 成本模拟器 + Jito 监控器 + 完整演示

## 📊 核心洞察

在激烈的 MEV 竞争环境下，套利成功的关键是：

> **信息优势** + **基础设施优势** + **策略优势** = **持续盈利**

本系统通过以下策略实现这一目标：

### 1. 成本结构的完整掌控

| 成本类型 | 计算方式 | 优化策略 |
|---------|---------|---------|
| 基础交易费 | 5,000 lamports × 签名数 | 减少签名、使用LUT |
| 优先费 | (CU × 价格) / 1,000,000 | 动态调整、避开高峰 |
| Jito 小费 | 实时市场竞价 | 智能出价、历史学习 |
| 闪电贷费用 | 借款额 × 0.09% | 按需使用、大额套利 |

### 2. 资金量级与策略矩阵

| 资金量级 | 闪电贷 | Jito策略 | 最小利润 | 目标成功率 |
|---------|--------|---------|---------|-----------|
| 小 (<10 SOL) | ✅ 必须 | 50th | 0.0001 SOL | 50% |
| 中 (10-100 SOL) | ⚡ 自动 | 75th | 0.00005 SOL | 70% |
| 大 (>100 SOL) | ❌ 不用 | 95th | 0.00003 SOL | 90% |

### 3. 动态 Jito 小费博弈论

```
最优小费 = min(
  基础小费 × 竞争系数 × 紧迫性系数,
  预期利润 × 利润比例
)
```

- **小资金**: 利润比例 30%，控制成本
- **中等资金**: 利润比例 40%，平衡策略
- **大资金**: 利润比例 50%，追求成功

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- npm or yarn
- TypeScript 5.3+

### 安装

```bash
# 克隆项目
git clone <repository>
cd solana-arb-bot

# 安装依赖
npm install

# 构建项目
npm run build
```

### 配置

```bash
# 复制全局配置示例
cp configs/global.example.toml configs/global.toml

# 编辑配置（填入真实的 RPC、密钥路径等）
# 注意：acknowledge_terms_of_service 必须设为 true
```

### 运行演示

```bash
# 完整的经济模型演示
npm run demo

# 成本模拟器
npm run cost-sim -- --help

# Jito 小费监控
npm run jito-monitor
```

## 📁 项目结构

```
solana-arb-bot/
├── packages/
│   └── core/
│       └── src/
│           └── economics/          # 🎯 经济模型核心
│               ├── types.ts        # 类型定义
│               ├── cost-calculator.ts      # 成本计算器
│               ├── jito-tip-optimizer.ts   # Jito小费优化器
│               ├── profit-analyzer.ts      # 利润分析器
│               ├── risk-manager.ts         # 风险管理器
│               ├── circuit-breaker.ts      # 熔断机制
│               └── README.md       # 详细API文档
├── configs/
│   ├── global.example.toml         # 全局配置示例
│   ├── strategy-small.toml         # 小资金策略
│   ├── strategy-medium.toml        # 中等资金策略
│   └── strategy-large.toml         # 大资金策略
├── tools/
│   ├── cost-simulator/             # 成本模拟器
│   └── jito-monitor/               # Jito监控器
├── examples/
│   └── economics-demo.ts           # 完整演示
└── README.md                       # 本文件
```

## 💡 使用示例

### 简单示例

```typescript
import { createEconomicsSystem } from './packages/core/src/economics';

// 创建系统
const economics = createEconomicsSystem({
  circuitBreaker: {
    maxConsecutiveFailures: 3,
    maxHourlyLoss: 500_000,
    minSuccessRate: 0.3,
  },
});

// 获取 Jito 小费
const jitoTip = await economics.jitoTipOptimizer.getTipAtPercentile(75);

// 计算成本
const costs = economics.costCalculator.calculateTotalCost(costConfig, jitoTip);

// 分析利润
const analysis = economics.profitAnalyzer.analyzeProfitability(
  opportunity,
  costConfig,
  jitoTip
);

// 风险检查
const riskCheck = economics.riskManager.preExecutionCheck(
  opportunity,
  analysis,
  riskConfig
);

// 执行决策
if (riskCheck.passed && economics.circuitBreaker.canAttempt()) {
  // 执行交易...
}
```

## 🛠️ 命令行工具

### 1. 成本模拟器

快速估算交易成本和最小利润门槛：

```bash
# 基础示例
npm run cost-sim -- -s 2 -cu 200000 -cup 5000

# 闪电贷套利
npm run cost-sim -- -s 4 -cu 400000 -fl -fla 50000000000

# 高竞争环境
npm run cost-sim -- -cup 20000 -jt 95 -c 0.8
```

**输出示例**：
```
🧮 ========== 交易成本模拟器 ==========

📋 配置参数:
  签名数量: 4
  计算单元: 400,000
  ...

💰 成本明细:
  基础交易费: 0.000020000 SOL
  优先费: 0.000020000 SOL
  Jito 小费: 0.000036000 SOL
  总成本: 0.000076100 SOL

📊 盈利分析:
  最小利润门槛: 0.000076100 SOL
  盈亏平衡点: 毛利润需达到 0.000076100 SOL
```

### 2. Jito 监控器

实时监控 Jito 小费市场：

```bash
npm run jito-monitor
```

**输出示例**：
```
🎯 ========== Jito 小费监控器 ==========

⏰ 更新时间: 23:45:32

当前小费市场 (SOL):
  ┌─────────────┬──────────────┐
  │  百分位     │  SOL         │
  ├─────────────┼──────────────┤
  │  25th       │ 0.000006000  │
  │  50th       │ 0.000010000  │
  │  75th       │ 0.000036000  │
  │  95th       │ 0.001400000  │
  │  99th       │ 0.010000000  │
  └─────────────┴──────────────┘
```

## 📖 详细文档

- [经济模型 API 文档](packages/core/src/economics/README.md)
- [设计文档](sol设计文档.md)
- [配置说明](configs/global.example.toml)

## 🎓 核心概念

### 成本计算

所有成本都以 lamports (1 SOL = 10^9 lamports) 为单位精确计算：

- **基础费**: 每个签名 5,000 lamports
- **优先费**: 根据计算单元动态计算
- **Jito 小费**: 实时查询市场数据
- **闪电贷**: 借款金额的 0.09%

### 利润分析

```typescript
毛利润 = 输出金额 - 输入金额
滑点影响 = 毛利润 × 预估滑点
净利润 = 毛利润 - 滑点影响 - 总成本
ROI = (净利润 / 总成本) × 100%
```

### 风险管理

5层风险检查：

1. ✅ 利润门槛检查
2. ✅ 成本限制检查
3. ✅ 滑点保护检查
4. ✅ 流动性验证检查
5. ✅ ROI 最低要求检查

### 熔断机制

4个熔断条件（满足任一触发）：

1. 连续失败次数 >= 阈值
2. 小时亏损 >= 阈值
3. 成功率 < 最低要求
4. 净利润为负

## 🔐 安全建议

⚠️ **重要提示**：套利交易存在风险，可能导致资金损失。

在使用本系统前，请确保：

1. ✅ **使用专用热钱包**: 切勿使用主钱包
2. ✅ **小额测试**: 先在 Devnet 或小额资金测试
3. ✅ **理解机制**: 充分理解套利逻辑和成本结构
4. ✅ **监控系统**: 密切关注熔断器和健康指标
5. ✅ **风险可控**: 仅投入可以承受损失的资金

## 📊 性能特性

- **成本计算**: < 1ms
- **利润分析**: < 5ms
- **风险检查**: < 3ms
- **Jito API 延迟**: 50-100ms
- **批量评估**: 可同时处理数百个机会

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

本项目受到以下项目的启发：

- [NotArb](https://github.com/jito-labs/notarb) - 专业级套利机器人参考
- [Jito Labs](https://www.jito.wtf/) - MEV 基础设施
- [Jupiter Aggregator](https://jup.ag/) - Solana 聚合器

---

<div align="center">
Made with ❤️ by Solana Arbitrage Bot Team
</div>



