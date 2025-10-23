# 测试脚本目录

本目录包含所有测试脚本。

## 📋 可用测试脚本

### Jupiter API测试
- `test-jupiter-lend.js` - Jupiter Lend功能测试
- `test-jupiter-api.js` - Jupiter API基础测试（如存在）

### 性能测试
- `test-priority-fee-estimator-live.js` - 实时优先费估算测试
- `test-slippage-optimization.js` - 滑点优化测试
- `test-worker-optimization.js` - Worker优化测试（如存在）

### 集成测试
- `test-database-connection.js` - 数据库连接测试
- `test-serverchan.js` - Server酱通知测试
- `test-bug-fixes-verification.ts` - Bug修复验证测试

### 其他测试
- `test-*.js` - 其他JavaScript测试脚本
- `test-*.ts` - TypeScript测试脚本
- `test-*.bat` - Windows批处理测试脚本

## 🚀 运行测试

### JavaScript测试
```bash
node scripts/test/test-database-connection.js
```

### TypeScript测试
```bash
pnpm ts-node scripts/test/test-bug-fixes-verification.ts
```

### 批处理测试（Windows）
```bash
.\scripts\test\test-serverchan.bat
```

## 📌 测试前准备

1. 确保环境变量已配置（`.env`文件）
2. 检查依赖已安装（`pnpm install`）
3. 验证数据库连接（如需要）
4. 确认RPC节点可用

## 💡 测试建议

- 从基础连接测试开始
- 逐步进行功能测试
- 定期运行性能测试
- 遇到问题查看相关文档（`docs/testing/`）

