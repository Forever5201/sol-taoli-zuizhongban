# 安装和设置指南

## 前置要求

### 1. 安装 Node.js

本项目需要 Node.js 20.0.0 或更高版本。

#### Windows 安装：

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载并安装 LTS 版本（推荐 v20.x）
3. 安装完成后，打开新的命令行窗口验证：

```cmd
node --version
npm --version
```

应该看到类似输出：
```
v20.10.0
10.2.3
```

## 安装步骤

### 1. 安装项目依赖

```bash
# 在项目根目录执行
npm install

# 进入 core 包安装依赖
cd packages/core
npm install
cd ../..
```

### 2. 配置系统

```bash
# 复制全局配置示例
copy configs\global.example.toml configs\global.toml

# 使用文本编辑器编辑 configs/global.toml
# 填入：
#   - RPC 端点（可以先用免费的）
#   - 密钥路径（创建一个测试用热钱包）
#   - 将 acknowledge_terms_of_service 设为 true
```

**重要**：
- 使用专用的热钱包，不要使用主钱包
- 先在 Devnet 测试：`rpc_url = "https://api.devnet.solana.com"`

### 3. 构建项目

```bash
npm run build
```

## 快速测试

### 1. 运行完整演示

```bash
npm run demo
```

这将展示：
- 成本计算
- Jito 小费优化
- 利润分析
- 风险检查
- 熔断机制

### 2. 成本模拟器

```bash
# 简单 swap（2 个签名，20 万 CU）
npm run cost-sim -- -s 2 -cu 200000 -cup 5000

# 带闪电贷的复杂套利（4 签名，40 万 CU，借 50 SOL）
npm run cost-sim -- -s 4 -cu 400000 -fl -fla 50000000000

# 查看帮助
npm run cost-sim -- --help
```

### 3. Jito 监控器

```bash
# 实时监控 Jito 小费市场
npm run jito-monitor
```

按 `Ctrl+C` 停止，会显示统计摘要。

## 开发环境设置

### VS Code 推荐配置

在 `.vscode/settings.json` 中：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### TypeScript 编译

```bash
# 监听模式（开发时使用）
npm run build -- --watch

# 清理构建产物
npm run clean
```

## 使用流程

### 1. 在代码中导入模块

```typescript
import {
  createEconomicsSystem,
  CostCalculator,
  JitoTipOptimizer,
  ProfitAnalyzer,
  RiskManager,
  CircuitBreaker,
  type ArbitrageOpportunity,
  type CostConfig,
} from './packages/core/src/economics';
```

### 2. 创建系统实例

```typescript
const economics = createEconomicsSystem({
  circuitBreaker: {
    maxConsecutiveFailures: 3,
    maxHourlyLoss: 500_000, // 0.0005 SOL
    minSuccessRate: 0.3,
  },
});
```

### 3. 执行套利决策

参考 `examples/economics-demo.ts` 中的完整示例。

## 故障排查

### 问题 1: npm 命令未找到

**解决**：确保 Node.js 正确安装并重启命令行。

### 问题 2: TypeScript 编译错误

**解决**：
```bash
npm install -g typescript
npm install
```

### 问题 3: Jito API 连接失败

**解决**：
- 检查网络连接
- 确认防火墙未阻止
- 使用备用 API 端点

### 问题 4: 依赖安装失败

**解决**：
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

## 生产环境部署

### 1. 环境变量

创建 `.env` 文件（不要提交到 Git）：

```env
SOLANA_RPC_URL=https://your-production-rpc.com
KEYPAIR_PATH=/secure/path/to/keypair.json
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
```

### 2. 安全检查清单

- [ ] 使用专用热钱包
- [ ] 仅包含必要的操作资金（≤ 10% 总资金）
- [ ] 启用熔断机制
- [ ] 配置监控和告警
- [ ] 定期备份配置和日志
- [ ] 使用付费高性能 RPC

### 3. 监控

建议使用以下工具：

- **日志聚合**: 配置 `webhookUrl` 发送到 Discord/Telegram
- **性能监控**: 记录每笔交易的延迟和成本
- **资金监控**: 定期检查钱包余额和 WSOL

## 下一步

1. 阅读 [经济模型文档](packages/core/src/economics/README.md)
2. 查看 [完整演示代码](examples/economics-demo.ts)
3. 根据资金量级选择[策略配置](configs/)
4. 在 Devnet 上测试
5. 小额资金上 Mainnet
6. 逐步扩大规模

## 支持

如有问题，请提交 Issue 或查看：
- [README.md](README.md) - 项目概述
- [设计文档](sol设计文档.md) - 架构设计
- [API 文档](packages/core/src/economics/README.md) - 详细 API

---

祝套利顺利！🚀



