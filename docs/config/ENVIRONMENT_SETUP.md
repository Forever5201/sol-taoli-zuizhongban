# 🔧 开发环境设置指南

## 📋 系统要求

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **Node.js** | 20.0.0 | 20.10+ | JavaScript运行时 |
| **npm** | 9.0.0 | 10.0+ | 包管理器 |
| **Git** | 2.30+ | 最新版 | 版本控制 |

### 推荐软件

| 软件 | 用途 |
|------|------|
| **Visual Studio Code** | 代码编辑器 |
| **Windows Terminal** | 现代终端（Windows） |
| **nvm** | Node版本管理 |

---

## 🚀 快速开始（5分钟）

### Windows用户

```bash
# 1. 克隆项目（如果还没有）
cd e:\6666666666666666666666666666\dex-cex\dex-sol

# 2. 运行环境设置脚本
.\scripts\setup-env.bat

# 3. 验证环境
.\scripts\verify-env.bat

# 4. 测试运行
npm run demo
```

### Linux/Mac用户

```bash
# 1. 克隆项目（如果还没有）
cd /path/to/dex-sol

# 2. 添加执行权限
chmod +x scripts/*.sh

# 3. 运行环境设置脚本
./scripts/setup-env.sh

# 4. 验证环境
./scripts/verify-env.sh

# 5. 测试运行
npm run demo
```

---

## 📦 手动安装步骤

如果自动脚本失败，请按以下步骤手动安装。

### 1. 检查Node.js版本

```bash
node --version
# 应该输出: v20.x.x 或更高

npm --version
# 应该输出: 9.x.x 或更高
```

**如果版本不符合要求**：

#### Windows
```bash
# 从官网下载安装
# https://nodejs.org/

# 或使用 nvm-windows
nvm install 20
nvm use 20
```

#### Linux/Mac
```bash
# 使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 或使用包管理器
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@20
```

### 2. 安装项目依赖

```bash
# 根目录安装
npm install

# 安装core包依赖
cd packages/core
npm install
cd ../..

# 安装onchain-bot包依赖
cd packages/onchain-bot
npm install
cd ../..
```

### 3. 构建项目

```bash
npm run build
```

### 4. 验证安装

```bash
# 运行环境验证脚本
.\scripts\verify-env.bat  # Windows
./scripts/verify-env.sh   # Linux/Mac

# 或手动检查
npm run demo
```

---

## 🛠️ 开发工具配置

### VSCode设置

1. **安装推荐扩展**：

打开项目后，VSCode会提示安装推荐扩展。点击"Install All"。

推荐扩展列表：
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Even Better TOML** - TOML文件支持
- **TypeScript and JavaScript Language Features** - TS支持

2. **导入设置**：

```bash
# 复制推荐设置到VSCode配置
# Windows
copy docs\vscode-settings.json .vscode\settings.json

# Linux/Mac
cp docs/vscode-settings.json .vscode/settings.json
```

### 环境变量配置

1. **复制环境变量模板**：

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

2. **编辑 .env 文件**：

```bash
# 使用你喜欢的编辑器
notepad .env       # Windows
nano .env          # Linux
code .env          # VSCode
```

3. **配置关键变量**：

```env
# RPC端点（重要！）
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# 密钥路径
DEFAULT_KEYPAIR_PATH=./keypairs/wallet.json

# Jito配置
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf

# 日志级别
LOG_LEVEL=info
```

---

## 📁 项目结构

```
solana-arb-bot/
├── packages/
│   ├── core/                    # 核心库
│   │   ├── src/
│   │   │   ├── config/          # 配置管理
│   │   │   ├── economics/       # 经济模型
│   │   │   ├── logger/          # 日志系统
│   │   │   └── solana/          # Solana封装
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── onchain-bot/             # On-Chain套利机器人
│       ├── src/
│       │   ├── executors/       # 执行器（Spam、Jito）
│       │   ├── market-scanner.ts
│       │   ├── arbitrage-engine.ts
│       │   └── index.ts
│       ├── config.example.toml  # 配置示例
│       ├── config.jito.toml     # Jito配置
│       └── package.json
│
├── scripts/                     # 脚本工具
│   ├── setup-env.bat           # 环境设置（Windows）
│   ├── setup-env.sh            # 环境设置（Linux/Mac）
│   ├── verify-env.bat          # 环境验证（Windows）
│   └── install-jito.bat        # Jito安装
│
├── tools/                       # CLI工具
│   ├── cost-simulator/         # 成本模拟器
│   └── jito-monitor/           # Jito监控器
│
├── examples/                    # 示例代码
│   └── economics-demo.ts       # 经济模型演示
│
├── docs/                        # 文档
│   └── vscode-settings.json    # VSCode推荐设置
│
├── .env.example                # 环境变量模板
├── .gitignore                  # Git忽略文件
├── .npmrc                      # NPM配置
├── package.json                # 根包配置
├── tsconfig.json               # TypeScript配置
└── README.md                   # 项目说明
```

---

## 🔍 常见问题

### Q1: `npm install` 速度很慢

**A**: 使用国内镜像（中国用户）

```bash
# 方法1：修改 .npmrc
npm config set registry https://registry.npmmirror.com

# 方法2：使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install

# 方法3：使用 yarn（推荐）
npm install -g yarn
yarn install
```

### Q2: Node.js版本不对

**A**: 使用nvm切换版本

```bash
# 安装nvm后
nvm install 20
nvm use 20
node --version  # 确认版本
```

### Q3: TypeScript编译错误

**A**: 清理并重新构建

```bash
npm run clean
npm install
npm run build
```

### Q4: 找不到模块

**A**: 检查依赖安装

```bash
# 检查所有包的node_modules
ls node_modules/
ls packages/core/node_modules/
ls packages/onchain-bot/node_modules/

# 重新安装
npm run clean
.\scripts\setup-env.bat  # Windows
./scripts/setup-env.sh   # Linux/Mac
```

### Q5: Windows上权限错误

**A**: 以管理员身份运行

```bash
# 右键点击PowerShell/CMD
# 选择"以管理员身份运行"

# 或使用PowerShell执行策略
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 🧪 验证安装

### 运行测试命令

```bash
# 1. 经济模型演示
npm run demo
# 应该看到成本计算和利润分析输出

# 2. 成本模拟器
npm run cost-sim
# 应该看到不同场景的成本计算

# 3. Jito监控器
npm run jito-monitor
# 应该看到实时Jito小费数据

# 4. 构建测试
npm run build
# 应该成功编译所有TypeScript文件
```

### 预期输出示例

```
✅ 经济模型演示
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 场景1: 小额套利 (0.0001 SOL)
   成本: 0.000017 SOL
   净利润: 0.000083 SOL
   ROI: 488.2%
   结论: ✅ 可执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 性能基准

在正确配置的环境中，您应该期待：

| 指标 | 目标值 |
|------|--------|
| **构建时间** | < 10秒 |
| **测试运行时间** | < 5秒 |
| **RPC连接延迟** | < 200ms |
| **内存使用** | < 500MB |

---

## 🔐 安全提示

### ⚠️ 重要：永远不要提交敏感文件

确保以下文件在 `.gitignore` 中：

```
.env
*-keypair.json
*.key
*.pem
configs/global.toml
```

### 密钥管理

1. **创建专用测试钱包**

```bash
# 创建新的Solana钱包
solana-keygen new -o ./keypairs/test-wallet.json

# 获取Devnet测试币
solana airdrop 5 ./keypairs/test-wallet.json --url devnet
```

2. **永远使用热钱包**

⚠️ **警告**：套利机器人需要在线密钥。使用：
- 专用热钱包
- 少量资金（< 10 SOL）
- 定期转出利润到冷钱包

3. **加密密钥文件**（可选）

```bash
# 使用GPG加密
gpg -c ./keypairs/wallet.json

# 或使用项目内置工具（待开发）
npm run protect-keypair
```

---

## 🚀 下一步

环境设置完成后，您可以：

1. **配置机器人**
   ```bash
   cd packages/onchain-bot
   cp config.example.toml my-config.toml
   # 编辑 my-config.toml
   ```

2. **Devnet测试**
   ```bash
   npm run start:onchain-bot -- --config packages/onchain-bot/my-config.toml
   ```

3. **阅读文档**
   - `README.md` - 项目概览
   - `JITO_INTEGRATION.md` - Jito使用指南
   - `NEXT_STEPS.md` - 开发路线图

4. **加入开发**
   - 查看 `TODO.md`
   - 阅读设计文档 `sol设计文档.md`
   - 贡献代码

---

## 📞 支持

### 遇到问题？

1. **检查环境**
   ```bash
   .\scripts\verify-env.bat
   ```

2. **查看日志**
   ```bash
   # 启用详细日志
   LOG_LEVEL=debug npm run demo
   ```

3. **清理重装**
   ```bash
   npm run clean
   .\scripts\setup-env.bat
   ```

4. **提交Issue**
   - 包含错误信息
   - Node.js和npm版本
   - 操作系统信息

---

## 🎓 学习资源

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Solana
- [Solana Cookbook](https://solanacookbook.com/)
- [Anchor Book](https://book.anchor-lang.com/)

### Node.js
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [npm Documentation](https://docs.npmjs.com/)

---

## ✅ 检查清单

完成环境设置后，确认以下项目：

- [ ] Node.js 20+ 已安装
- [ ] npm 9+ 已安装
- [ ] 所有依赖已安装（根目录、core、onchain-bot）
- [ ] 项目成功构建（`npm run build`）
- [ ] 测试命令可运行（`npm run demo`）
- [ ] .env 文件已配置
- [ ] VSCode扩展已安装
- [ ] 已创建测试钱包
- [ ] 已阅读README.md

**如果所有项目都勾选，恭喜！您的开发环境已就绪！** 🎉

---

**最后更新**: 2025年10月18日  
**适用版本**: v1.0.0
