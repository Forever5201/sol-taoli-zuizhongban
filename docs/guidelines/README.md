# 开发规范文档

本目录包含开发指南、编码规范和最佳实践。

## 📖 开发指南

### 中文文档
- [开发指南.md](./开发指南.md) - 开发指南（中文）
- [规范.md](./规范.md) - 编码规范（中文）

### 英文文档
- [AI_CODING_GUIDELINES.md](./AI_CODING_GUIDELINES.md) - AI辅助编码指南
- [TYPESCRIPT_BEST_PRACTICES.md](./TYPESCRIPT_BEST_PRACTICES.md) - TypeScript最佳实践
- [README_OPTIMIZATION.md](./README_OPTIMIZATION.md) - README优化指南

## 🎯 规范要点

### TypeScript规范
- 使用严格类型检查
- 避免使用`any`类型
- 优先使用接口定义
- 遵循命名约定

### 代码结构
- 模块化设计
- 单一职责原则
- 依赖注入
- 错误处理最佳实践

### AI辅助开发
- Prompt工程技巧
- 代码审查要点
- 自动化测试生成
- 文档自动生成

## 📋 开发流程

1. **开始开发前**
   - 阅读 开发指南.md / AI_CODING_GUIDELINES.md
   - 了解项目结构
   - 熟悉编码规范

2. **开发过程中**
   - 遵循TypeScript最佳实践
   - 编写单元测试
   - 添加必要注释
   - 保持代码整洁

3. **提交代码前**
   - 运行linter检查
   - 确保测试通过
   - 更新相关文档
   - Code Review

## 💡 最佳实践摘要

### 性能优化
- 使用连接池
- 实施缓存策略
- 异步操作优化
- 减少不必要的RPC调用

### 安全性
- 密钥安全管理
- 输入验证
- 错误信息脱敏
- 依赖安全审计

### 可维护性
- 清晰的变量命名
- 模块化代码结构
- 完善的错误处理
- 详细的日志记录

## 📚 推荐阅读顺序

1. **新团队成员**: 开发指南.md → 规范.md → TYPESCRIPT_BEST_PRACTICES.md
2. **使用AI辅助**: AI_CODING_GUIDELINES.md
3. **文档编写**: README_OPTIMIZATION.md

