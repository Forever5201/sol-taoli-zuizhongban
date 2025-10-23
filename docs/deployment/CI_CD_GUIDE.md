# 🚀 CI/CD自动化指南

## 概述

本项目使用GitHub Actions实现完整的CI/CD流程，包括自动化测试、代码覆盖率、性能基准测试和依赖管理。

---

## 🔄 工作流程

### 1. **主CI流程** (`ci.yml`)

**触发时机**:
- Push到`main`或`develop`分支
- Pull Request到`main`或`develop`分支

**执行内容**:
- ✅ 在Node.js 20.x和22.x上运行测试
- ✅ 单元测试
- ✅ 集成测试
- ✅ 代码覆盖率生成
- ✅ 覆盖率上传到Codecov
- ✅ 构建检查

**使用示例**:
```bash
# 本地模拟CI测试
pnpm test:unit
pnpm test:integration
pnpm test:coverage
pnpm build
```

### 2. **覆盖率报告** (`coverage.yml`)

**触发时机**:
- Push到`main`分支
- 每天00:00 UTC自动运行

**执行内容**:
- 📊 生成完整覆盖率报告
- 📊 在PR中自动评论覆盖率变化
- 📊 上传到Codecov

**查看报告**:
- 本地: `open coverage/lcov-report/index.html`
- GitHub: Actions页面的Artifacts
- Codecov: https://codecov.io/gh/YOUR_ORG/YOUR_REPO

### 3. **性能基准测试** (`performance.yml`)

**触发时机**:
- Push到`main`或`develop`分支
- Pull Request到`main`分支
- 每周日00:00 UTC

**执行内容**:
- ⚡ 运行基准测试
- ⚡ 运行压力测试
- ⚡ 性能指标对比
- ⚡ 保存历史数据

**本地运行**:
```bash
pnpm test:benchmark
pnpm test:stress
```

### 4. **PR检查** (`pr-check.yml`)

**触发时机**:
- Pull Request打开、更新或重新打开

**执行内容**:
- ✔️ PR验证
- ✔️ 安全扫描
- ✔️ 代码质量检查
- ✔️ 依赖审计

### 5. **依赖更新** (`dependency-update.yml`)

**触发时机**:
- 每周一09:00 UTC
- 手动触发

**执行内容**:
- 📦 检查过时的依赖
- 📦 生成更新报告
- 📦 创建更新Issue

---

## 📊 状态徽章

在README.md中添加以下徽章：

```markdown
![CI](https://github.com/YOUR_ORG/YOUR_REPO/workflows/CI/badge.svg)
![Coverage](https://codecov.io/gh/YOUR_ORG/YOUR_REPO/branch/main/graph/badge.svg)
![Performance](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Performance%20Benchmarks/badge.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-10.x-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
```

---

## 🔧 配置

### 环境变量

在GitHub仓库设置中配置以下Secrets:

```
CODECOV_TOKEN      # Codecov上传令牌
SNYK_TOKEN         # Snyk安全扫描令牌(可选)
```

### 本地环境

```bash
# 安装依赖
pnpm install

# 运行完整测试套件
pnpm test:all

# 生成覆盖率
pnpm test:coverage

# 运行性能测试
pnpm test:performance
```

---

## 📈 性能基准

### 当前指标

| 模块 | 操作 | 平均时间 | 阈值 |
|------|------|----------|------|
| **CostCalculator** | calculateBaseFee | <0.001ms | 1ms |
| **CostCalculator** | calculateTotalCost | <0.005ms | 1ms |
| **ProfitAnalyzer** | analyzeProfitability | <0.005ms | 2ms |
| **RiskManager** | preExecutionCheck | <0.002ms | 3ms |
| **CircuitBreaker** | shouldBreak | <0.0005ms | 0.5ms |

**综合性能**: 
- 完整决策流程: <0.01ms
- **预计TPS: 100,000+ 决策/秒**

---

## 🎯 质量门槛

### 代码覆盖率要求

- ✅ 语句覆盖率: ≥80%
- ✅ 分支覆盖率: ≥70%
- ✅ 函数覆盖率: ≥75%
- ✅ 行覆盖率: ≥80%

### 测试要求

- ✅ 所有单元测试必须通过
- ✅ 所有集成测试必须通过
- ✅ 性能测试不能低于基准
- ✅ 无高危安全漏洞

---

## 🔍 调试CI失败

### 常见问题

#### 1. 测试失败
```bash
# 本地运行失败的测试
pnpm test tests/path/to/failing-test.ts

# 查看详细输出
pnpm test --verbose
```

#### 2. 覆盖率低于阈值
```bash
# 生成详细覆盖率报告
pnpm test:coverage

# 查看未覆盖的行
open coverage/lcov-report/index.html
```

#### 3. 性能测试失败
```bash
# 本地运行性能测试
pnpm test:benchmark
pnpm test:stress

# 检查具体哪个测试超时
pnpm test:performance --verbose
```

#### 4. 依赖问题
```bash
# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 检查依赖完整性
pnpm install --frozen-lockfile
```

---

## 📝 最佳实践

### 提交前

```bash
# 1. 运行本地测试
pnpm test

# 2. 检查覆盖率
pnpm test:coverage

# 3. 确保构建成功
pnpm build

# 4. 运行性能测试（可选）
pnpm test:benchmark
```

### Pull Request

1. ✅ 确保所有CI检查通过
2. ✅ 覆盖率不降低
3. ✅ 性能无明显退化
4. ✅ 填写完整的PR模板
5. ✅ 添加必要的测试

### 代码审查

1. ✅ 检查CI状态
2. ✅ 审查覆盖率报告
3. ✅ 验证性能影响
4. ✅ 确认安全扫描通过

---

## 🚀 部署流程

### 开发环境
- 自动部署: Push到`develop`分支

### 生产环境
- 手动触发: 创建Release

---

## 📚 相关文档

- [测试使用指南](./README_TESTS.md)
- [性能优化报告](./COVERAGE_OPTIMIZATION_REPORT.md)
- [完整测试报告](./COMPLETE_SUCCESS_REPORT.md)

---

## 🆘 获取帮助

遇到CI/CD问题？

1. 查看GitHub Actions日志
2. 检查本地是否能复现
3. 查阅本文档
4. 联系DevOps团队

---

**最后更新**: 2025-10-19  
**维护者**: Solana套利机器人DevOps团队
