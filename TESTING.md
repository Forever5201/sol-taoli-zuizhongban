# 测试文档

本项目包含完整的单元测试和集成测试套件，用于确保代码质量和功能正确性。

## 📋 目录

- [快速开始](#快速开始)
- [测试结构](#测试结构)
- [运行测试](#运行测试)
- [测试覆盖率](#测试覆盖率)
- [编写测试](#编写测试)
- [测试最佳实践](#测试最佳实践)

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行测试并查看覆盖率

```bash
npm run test:coverage
```

---

## 📁 测试结构

```
tests/
├── setup.ts                      # 全局测试配置
├── helpers/                      # 测试辅助工具
│   ├── mock-data.ts             # Mock数据集
│   └── test-utils.ts            # 测试工具函数
├── unit/                         # 单元测试
│   └── economics/               # 经济模型测试
│       ├── cost-calculator.test.ts
│       ├── circuit-breaker.test.ts
│       ├── profit-analyzer.test.ts
│       ├── risk-manager.test.ts
│       └── jito-tip-optimizer.test.ts
└── integration/                  # 集成测试
    ├── jupiter-bot.test.ts
    ├── onchain-bot.test.ts
    └── economics-system.test.ts
```

---

## 🧪 运行测试

### 运行所有测试

```bash
npm test
```

### 运行单元测试

```bash
npm run test:unit
```

### 运行集成测试

```bash
npm run test:integration
```

### 监视模式（开发时推荐）

```bash
npm run test:watch
```

### 运行特定测试文件

```bash
npm test -- cost-calculator.test.ts
```

### 运行特定测试用例

```bash
npm test -- -t "应该正确计算基础费用"
```

---

## 📊 测试覆盖率

### 查看覆盖率报告

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录：

- **coverage/lcov-report/index.html** - HTML格式的详细报告
- **coverage/lcov.info** - LCOV格式（可用于CI/CD）

### 覆盖率目标

| 指标 | 目标 | 说明 |
|------|------|------|
| **Statements** | ≥ 80% | 语句覆盖率 |
| **Branches** | ≥ 70% | 分支覆盖率 |
| **Functions** | ≥ 75% | 函数覆盖率 |
| **Lines** | ≥ 80% | 行覆盖率 |

---

## ✍️ 编写测试

### 测试文件命名

- 单元测试：`*.test.ts`
- 集成测试：`*.test.ts`（放在 `integration/` 目录）

### 基本测试结构

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MyClass } from '../src/my-class';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  describe('myMethod', () => {
    it('应该返回正确的结果', () => {
      const result = instance.myMethod(1, 2);
      expect(result).toBe(3);
    });

    it('应该处理边界情况', () => {
      const result = instance.myMethod(0, 0);
      expect(result).toBe(0);
    });
  });
});
```

### 使用Mock数据

```typescript
import {
  MOCK_SMALL_OPPORTUNITY,
  MOCK_COST_CONFIG,
  createMockOpportunity,
} from '../helpers/mock-data';

it('应该验证机会', () => {
  const opportunity = createMockOpportunity({
    grossProfit: 1_000_000,
  });
  
  // 测试逻辑...
});
```

### 使用测试工具

```typescript
import {
  assertNumberClose,
  assertNumberInRange,
  mockFetch,
} from '../helpers/test-utils';

it('应该计算接近的值', () => {
  const result = calculator.calculate();
  assertNumberClose(result, 100, 0.01); // 1%容差
});

it('应该处理API调用', async () => {
  mockFetch({ data: 'test' });
  const result = await fetchData();
  expect(result.data).toBe('test');
});
```

---

## 📐 测试最佳实践

### 1. 测试命名

使用描述性的测试名称：

✅ **好的命名**
```typescript
it('应该在利润低于阈值时拒绝机会', () => { ... });
```

❌ **不好的命名**
```typescript
it('测试1', () => { ... });
```

### 2. AAA模式

遵循 **Arrange-Act-Assert** 模式：

```typescript
it('应该计算总成本', () => {
  // Arrange (准备)
  const config = MOCK_COST_CONFIG;
  const jitoTip = 10_000;
  
  // Act (执行)
  const costs = calculator.calculateTotalCost(config, jitoTip);
  
  // Assert (断言)
  expect(costs.total).toBeGreaterThan(0);
});
```

### 3. 每个测试一个断言概念

测试应该关注单一行为：

✅ **好的做法**
```typescript
it('应该计算基础费用', () => {
  const baseFee = calculator.calculateBaseFee(config);
  expect(baseFee).toBe(10_000);
});

it('应该计算优先费用', () => {
  const priorityFee = calculator.calculatePriorityFee(config);
  expect(priorityFee).toBe(15_000);
});
```

❌ **不好的做法**
```typescript
it('应该计算所有费用', () => {
  const baseFee = calculator.calculateBaseFee(config);
  const priorityFee = calculator.calculatePriorityFee(config);
  const total = calculator.calculateTotal(config);
  expect(baseFee).toBe(10_000);
  expect(priorityFee).toBe(15_000);
  expect(total).toBe(25_000);
});
```

### 4. 测试边界情况

始终测试边界条件：

```typescript
describe('边界情况', () => {
  it('应该处理零值', () => { ... });
  it('应该处理负值', () => { ... });
  it('应该处理极大值', () => { ... });
  it('应该处理空输入', () => { ... });
});
```

### 5. 使用beforeEach清理

```typescript
describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    // 每个测试前都创建新实例
    instance = new MyClass();
  });

  afterEach(() => {
    // 清理资源（如果需要）
    jest.clearAllMocks();
  });
});
```

### 6. Mock外部依赖

```typescript
// Mock fetch
import { mockFetch } from '../helpers/test-utils';

it('应该调用API', async () => {
  mockFetch({ result: 'success' });
  const data = await api.fetch();
  expect(data.result).toBe('success');
});
```

### 7. 避免测试实现细节

测试行为而不是实现：

✅ **测试行为**
```typescript
it('应该计算正确的总成本', () => {
  const costs = calculator.calculateTotalCost(config, tip);
  expect(costs.total).toBe(35_100);
});
```

❌ **测试实现**
```typescript
it('应该调用私有方法', () => {
  // 不要测试私有方法
  expect(calculator['privateMethod']).toHaveBeenCalled();
});
```

---

## 🔍 测试类型说明

### 单元测试 (Unit Tests)

测试单个函数或类的行为，隔离外部依赖。

**特点：**
- ⚡ 快速执行
- 🎯 专注于单一功能
- 🔒 隔离依赖

**示例：**
```typescript
describe('CostCalculator', () => {
  it('应该计算基础费用', () => {
    const calculator = new CostCalculator();
    const result = calculator.calculateBaseFee(config);
    expect(result).toBe(10_000);
  });
});
```

### 集成测试 (Integration Tests)

测试多个模块协同工作的情况。

**特点：**
- 🔗 测试模块间交互
- 🌐 可能涉及外部服务
- ⏱️ 执行较慢

**示例：**
```typescript
describe('经济系统集成', () => {
  it('应该完成完整的决策流程', async () => {
    const system = createEconomicsSystem(config);
    
    const validation = system.riskManager.validate(opportunity);
    const tip = await system.jitoTipOptimizer.calculate(...);
    const analysis = system.profitAnalyzer.analyze(...);
    
    expect(analysis.isProfitable).toBe(true);
  });
});
```

---

## 🐛 调试测试

### 运行单个测试

```bash
npm test -- -t "测试名称"
```

### 查看详细输出

```bash
npm test -- --verbose
```

### 调试模式

在测试中添加 `debugger` 语句，然后：

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

在Chrome中打开 `chrome://inspect` 进行调试。

---

## 📈 持续集成

### GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 🎯 测试清单

在提交代码前，确保：

- ✅ 所有测试通过
- ✅ 覆盖率达标（≥80%）
- ✅ 新功能有对应测试
- ✅ Bug修复有回归测试
- ✅ 测试命名清晰描述
- ✅ 没有跳过的测试（`.skip`）
- ✅ 没有测试警告

---

## 📚 参考资源

- [Jest 官方文档](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Jest](https://kulshekhar.github.io/ts-jest/)

---

## 🤝 贡献测试

编写测试时：

1. 遵循现有的测试结构和命名规范
2. 确保测试独立且可重复
3. 添加必要的注释说明复杂测试逻辑
4. 更新本文档（如有新的测试模式）

---

**更新时间**: 2025年10月19日  
**维护者**: Development Team
