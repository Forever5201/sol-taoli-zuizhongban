# 测试套件说明

本目录包含Solana DEX套利机器人的完整测试套件。

## 📂 目录结构

```
tests/
├── setup.ts                 # Jest全局配置
├── README.md               # 本文件
├── helpers/                # 测试辅助工具
│   ├── mock-data.ts       # Mock数据定义
│   └── test-utils.ts      # 测试工具函数
├── unit/                   # 单元测试
│   └── economics/         # 经济模型单元测试
│       ├── cost-calculator.test.ts
│       ├── circuit-breaker.test.ts
│       ├── profit-analyzer.test.ts
│       ├── risk-manager.test.ts
│       └── jito-tip-optimizer.test.ts
└── integration/            # 集成测试
    ├── jupiter-bot.test.ts
    ├── onchain-bot.test.ts
    └── economics-system.test.ts
```

## 🧪 测试类型

### 单元测试 (`unit/`)

测试单个模块的功能，完全隔离外部依赖。

**包含：**
- ✅ **CostCalculator** - 成本计算准确性
- ✅ **CircuitBreaker** - 熔断保护机制
- ✅ **ProfitAnalyzer** - 利润分析逻辑
- ✅ **RiskManager** - 风险管理和验证
- ✅ **JitoTipOptimizer** - 小费优化算法

### 集成测试 (`integration/`)

测试多个模块协同工作的完整流程。

**包含：**
- ✅ **Jupiter Bot** - Jupiter套利机器人工作流
- ✅ **OnChain Bot** - 链上扫描机器人工作流
- ✅ **Economics System** - 经济系统端到端测试

## 🚀 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 监视模式（推荐开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 高级用法

```bash
# 运行特定文件
npm test -- cost-calculator.test.ts

# 运行匹配的测试
npm test -- -t "应该计算"

# 详细输出
npm test -- --verbose

# 静默模式
npm test -- --silent
```

## 📊 测试覆盖率

当前覆盖率目标：

| 指标 | 目标 | 当前 |
|------|------|------|
| Statements | 80% | - |
| Branches | 70% | - |
| Functions | 75% | - |
| Lines | 80% | - |

查看详细覆盖率报告：

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🛠️ 测试辅助工具

### Mock数据 (`helpers/mock-data.ts`)

提供各种测试场景的预定义数据：

```typescript
import {
  MOCK_SMALL_OPPORTUNITY,      // 小利润机会
  MOCK_MEDIUM_OPPORTUNITY,     // 中等利润机会
  MOCK_LARGE_OPPORTUNITY,      // 大利润机会
  MOCK_COST_CONFIG,            // 标准成本配置
  MOCK_RISK_CONFIG,            // 风险配置
  createMockOpportunity,       // 创建自定义机会
} from './helpers/mock-data';
```

### 测试工具 (`helpers/test-utils.ts`)

提供常用的测试辅助函数：

```typescript
import {
  assertNumberClose,       // 断言数字接近
  assertNumberInRange,     // 断言数字在范围内
  mockFetch,              // Mock Fetch API
  createMockConnection,   // 创建Mock Solana连接
  sleep,                  // 等待函数
} from './helpers/test-utils';
```

## 📝 测试示例

### 单元测试示例

```typescript
import { CostCalculator } from '../../../packages/core/src/economics/cost-calculator';
import { MOCK_COST_CONFIG } from '../../helpers/mock-data';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    calculator = new CostCalculator();
  });

  it('应该正确计算总成本', () => {
    const costs = calculator.calculateTotalCost(
      MOCK_COST_CONFIG,
      10_000 // jitoTip
    );

    expect(costs.baseFee).toBe(10_000);
    expect(costs.priorityFee).toBeGreaterThan(0);
    expect(costs.total).toBeGreaterThan(0);
  });
});
```

### 集成测试示例

```typescript
import { createEconomicsSystem } from '../../packages/core/src/economics';
import { MOCK_MEDIUM_OPPORTUNITY } from '../helpers/mock-data';

describe('经济系统集成', () => {
  it('应该完成端到端评估', async () => {
    const system = createEconomicsSystem(config);
    
    // 验证 -> 计算 -> 分析 -> 检查
    const validation = system.riskManager.validateOpportunity(
      MOCK_MEDIUM_OPPORTUNITY
    );
    
    expect(validation.isValid).toBe(true);
  });
});
```

## 🐛 常见问题

### 测试超时

如果测试超时，增加timeout：

```typescript
jest.setTimeout(30000); // 30秒
```

### Mock不工作

确保在 `beforeEach` 中清理：

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 类型错误

确保导入正确的类型：

```typescript
import type { ArbitrageOpportunity } from '../../../packages/core/src/economics/types';
```

## 📈 测试最佳实践

1. **测试命名清晰** - 使用"应该..."格式
2. **独立测试** - 每个测试独立运行
3. **快速执行** - 单元测试应该在ms级完成
4. **覆盖边界** - 测试边界和异常情况
5. **Mock外部** - 隔离外部依赖
6. **AAA模式** - Arrange, Act, Assert

## 🔄 持续改进

测试套件会持续更新和改进。欢迎贡献：

- 添加新的测试用例
- 改进测试覆盖率
- 优化测试性能
- 完善测试文档

## 📚 相关文档

- [../TESTING.md](../TESTING.md) - 完整测试文档
- [../README.md](../README.md) - 项目主文档
- [Jest 文档](https://jestjs.io/docs/getting-started)

---

**最后更新**: 2025年10月19日
