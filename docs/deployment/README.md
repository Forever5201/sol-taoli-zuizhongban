# 部署运维文档

本目录包含部署、CI/CD和生产环境相关文档。

## 🚢 部署指南

### 部署检查清单
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - 部署检查清单
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) - 生产环境就绪检查

### 部署平台
- [GITHUB_DEPLOYMENT_GUIDE.md](./GITHUB_DEPLOYMENT_GUIDE.md) - GitHub部署指南
- [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - CI/CD指南

## 🌐 网络环境

- [DEVNET_SETUP.md](./DEVNET_SETUP.md) - Devnet开发网络设置

## 💾 数据库部署

- [DATABASE_QUICK_START.md](./DATABASE_QUICK_START.md) - 数据库快速开始

## ⚡ Jito集成

- [JITO_INTEGRATION.md](./JITO_INTEGRATION.md) - Jito集成指南
- [JITO_LEADER_IMPLEMENTATION.md](./JITO_LEADER_IMPLEMENTATION.md) - Jito Leader实施
- [JITO_LEADER_QUICKSTART.md](./JITO_LEADER_QUICKSTART.md) - Jito Leader快速开始

## 📋 部署流程

1. **准备阶段**
   - 阅读 PRODUCTION_READINESS.md
   - 完成 DEPLOYMENT_CHECKLIST.md

2. **环境配置**
   - 设置数据库（DATABASE_QUICK_START.md）
   - 配置网络（DEVNET_SETUP.md 或生产环境）

3. **CI/CD设置**
   - 配置GitHub Actions（GITHUB_DEPLOYMENT_GUIDE.md）
   - 设置自动化流程（CI_CD_GUIDE.md）

4. **可选增强**
   - Jito集成（JITO_INTEGRATION.md）

## ⚠️ 部署注意事项

- 生产环境部署前必须完成所有检查清单项
- 建议先在Devnet测试
- 确保数据库备份策略
- 配置监控和告警

