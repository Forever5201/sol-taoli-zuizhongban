# 测试文档

本目录包含测试相关的文档和指南。

## 🧪 测试指南

### 综合测试
- [TESTING.md](./TESTING.md) - 测试总指南
- [README_TESTS.md](./README_TESTS.md) - 测试说明文档

### 专项测试
- [TEST_PRIORITY_FEE_GUIDE.md](./TEST_PRIORITY_FEE_GUIDE.md) - 优先费测试指南
- [OPPORTUNITY_NOTIFICATION_TEST_GUIDE.md](./OPPORTUNITY_NOTIFICATION_TEST_GUIDE.md) - 机会通知测试指南

## 📂 测试脚本位置

所有测试脚本已移动到 `scripts/test/` 目录：
- `test-*.js` - JavaScript测试脚本
- `test-*.ts` - TypeScript测试脚本
- `test-*.bat` - 批处理测试脚本

常用测试脚本：
- `test-jupiter-lend.js` - Jupiter Lend功能测试
- `test-priority-fee-estimator-live.js` - 优先费实时测试
- `test-serverchan.js` - Server酱通知测试
- `test-slippage-optimization.js` - 滑点优化测试
- `test-database-connection.js` - 数据库连接测试
- `test-bug-fixes-verification.ts` - Bug修复验证测试

## 🔍 测试类型

| 测试类型 | 相关文档/脚本 |
|---------|-------------|
| 单元测试 | `tests/` 目录下的Jest测试 |
| 集成测试 | `scripts/test/test-*.js` |
| 性能测试 | `test-slippage-optimization.js` |
| 连接测试 | `test-database-connection.js` |
| 通知测试 | `test-serverchan.js` |

## 📋 测试最佳实践

1. **运行测试前**
   - 确保环境变量配置正确
   - 检查数据库连接
   - 验证RPC节点可用性

2. **测试顺序**
   - 基础连接测试（数据库、RPC）
   - 功能单元测试
   - 集成测试
   - 性能测试

3. **持续测试**
   - 使用CI/CD自动化测试
   - 定期运行性能测试
   - 监控测试覆盖率

## 🚀 快速测试命令

```bash
# 运行所有测试
pnpm test

# 运行单个测试脚本
node scripts/test/test-database-connection.js

# 运行TypeScript测试
pnpm ts-node scripts/test/test-bug-fixes-verification.ts
```

