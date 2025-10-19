# 🧪 测试系统使用指南

## 快速开始

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 监视模式（开发推荐）
pnpm test:watch

# 覆盖率测试
pnpm test:coverage
```

## 测试状态

- ✅ **66个测试全部通过** (100%通过率)
- ✅ **单元测试**: 50+个，覆盖核心经济模型
- ✅ **集成测试**: 11个，验证完整业务流程
- ✅ **测试速度**: ~5秒完成所有测试

## 测试覆盖模块

### 经济模型 (Economics)
- ✅ **CostCalculator** - 成本计算
- ✅ **CircuitBreaker** - 熔断机制
- ✅ **ProfitAnalyzer** - 利润分析
- ✅ **RiskManager** - 风险管理
- ⚠️ **JitoTipOptimizer** - 小费优化

### 集成测试
- ✅ **Jupiter Bot** - Jupiter套利机器人
- ✅ **OnChain Bot** - 链上套利机器人

## 详细文档

- 📄 **COMPLETE_SUCCESS_REPORT.md** - 完整测试报告
- 📄 **MIGRATION_COMPLETE.md** - pnpm迁移记录
- 📄 **FINAL_TEST_REPORT.md** - 测试修复详情

## 常见问题

### Q: 如何运行特定测试？
```bash
pnpm test tests/unit/economics/cost-calculator.test.ts
```

### Q: 如何查看详细输出？
```bash
pnpm test --verbose
```

### Q: 如何调试测试？
在VSCode中使用Jest扩展，或：
```bash
pnpm test:watch
# 然后按 'p' 过滤特定测试
```

## 技术栈

- **测试框架**: Jest 29.7.0
- **TypeScript支持**: ts-jest 29.4.5
- **包管理**: pnpm 10.18.3
- **Node版本**: >=20.0.0

## 贡献指南

添加新测试时：
1. 遵循现有命名规范
2. 使用helpers中的Mock数据
3. 确保测试独立且幂等
4. 添加必要的注释

---

**最后更新**: 2025-10-19  
**维护者**: Solana套利机器人开发团队
