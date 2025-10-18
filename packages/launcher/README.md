# Launcher - 统一启动器

系统唯一入口点，负责动态加载和管理所有任务模块。

## 🎯 设计理念

参考设计文档第2.1节，Launcher实现了：

1. **统一入口** - 所有模块通过Launcher启动
2. **配置驱动** - 完全由TOML配置控制
3. **动态加载** - 运行时加载任务模块
4. **变量替换** - 全局配置变量管理

## 📦 支持的任务

| 任务 | 说明 | 配置文件 |
|------|------|---------|
| `jupiter-bot` | Jupiter套利机器人 | packages/jupiter-bot/example-jito.toml |
| `onchain-bot` | 链上扫描机器人 | packages/onchain-bot/example.toml |
| `jupiter-server` | Jupiter API服务器 | packages/jupiter-server/example.toml |
| `tools` | 交互式工具集 | - |

## 🚀 快速开始

### 1. 使用启动脚本（推荐）

**Windows:**
```cmd
scripts\arb-bot.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/arb-bot.sh
./scripts/arb-bot.sh
```

### 2. 直接使用Launcher

```bash
# 开发模式
npm run dev -w @solana-arb-bot/launcher

# 生产模式
npm run build
node packages/launcher/dist/index.js
```

### 3. 指定配置文件

```bash
# Windows
scripts\arb-bot.bat --config my-config.toml

# Linux/Mac
./scripts/arb-bot.sh --config my-config.toml
```

## 📋 配置文件

### launcher.toml

```toml
[launcher]
# 选择要启动的任务
task = "jupiter-bot"  # 或 "onchain-bot", "jupiter-server", "tools"

[task_configs]
# 每个任务的配置文件路径
jupiter-bot = "./packages/jupiter-bot/my-config.toml"
onchain-bot = "./packages/onchain-bot/my-config.toml"

[options]
# 自动重启
auto_restart = true
max_restarts = 10
restart_delay_seconds = 5
```

### global.toml

```toml
[global]
# 全局变量定义
DEFAULT_KEYPAIR_PATH = "./keypairs/wallet.json"
DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com"

# 在其他配置中使用
# wallet.keypair_path = "${DEFAULT_KEYPAIR_PATH}"
```

## 🔧 变量替换系统

Launcher支持在配置文件中使用全局变量：

**定义（global.toml）:**
```toml
[global]
MY_WALLET = "./keypairs/main-wallet.json"
MY_RPC = "https://my-rpc.example.com"
```

**使用（任何配置文件）:**
```toml
[wallet]
keypair_path = "${MY_WALLET}"  # 自动替换为 "./keypairs/main-wallet.json"

[network]
rpc_url = "${MY_RPC}"          # 自动替换为 "https://my-rpc.example.com"
```

## 🔄 任务生命周期

```
[启动脚本]
    ↓
[Launcher初始化]
    ↓
[加载launcher.toml]
    ↓
[加载global.toml]
    ↓
[读取任务配置] → 变量替换
    ↓
[验证配置]
    ↓
[动态加载任务模块]
    ↓
[启动任务]
    ↓
[监控运行]
    ↓
[接收退出信号]
    ↓
[优雅停止]
```

## 📊 工作流程

### 启动流程

1. **环境检查**
   - 检查Node.js版本
   - 检查全局配置存在性

2. **配置加载**
   - 加载launcher.toml
   - 加载任务配置文件
   - 执行变量替换

3. **配置验证**
   - 检查必需字段
   - 验证文件路径
   - 确认风险声明

4. **任务启动**
   - 动态导入任务模块
   - 调用任务的start()方法
   - 建立退出处理

### 停止流程

1. 接收SIGINT/SIGTERM信号
2. 调用任务的stop()方法
3. 等待任务清理完成
4. 退出Launcher

## 🛠️ 开发新任务

### 1. 创建任务模块

```typescript
// packages/my-task/src/index.ts
export class MyTask {
  async start(config: any): Promise<void> {
    console.log('MyTask started');
    // 实现任务逻辑
  }

  async stop(): Promise<void> {
    console.log('MyTask stopped');
    // 清理资源
  }
}
```

### 2. 注册到Launcher

编辑 `packages/launcher/src/task-loader.ts`:

```typescript
registerTask('my-task', async () => {
  const { MyTask } = await import('../../my-task/src/index');
  
  return {
    name: 'my-task',
    instance: null as any,
    
    async start(config: any) {
      this.instance = new MyTask();
      await this.instance.start(config);
    },
    
    async stop() {
      if (this.instance) {
        await this.instance.stop();
      }
    },
  };
});
```

### 3. 添加配置

编辑 `configs/launcher.toml`:

```toml
[task_configs]
my-task = "./packages/my-task/config.toml"
```

### 4. 使用

```bash
# 修改launcher.toml
[launcher]
task = "my-task"

# 启动
./scripts/arb-bot.sh
```

## 🔍 故障排查

### Launcher无法启动

**检查清单:**
1. Node.js版本 >= 20.0.0
2. 依赖已安装（npm install）
3. 代码已编译（npm run build）
4. global.toml存在
5. launcher.toml配置正确

### 配置验证失败

**常见原因:**
```toml
[security]
# 必须设为true
acknowledge_terms_of_service = true

[wallet]
# 文件必须存在
keypair_path = "./keypairs/wallet.json"
```

### 变量替换不生效

**检查:**
1. 变量名是否在global.toml中定义
2. 变量名格式：`${VARIABLE_NAME}`（大写+下划线）
3. 变量定义在`[global]`部分

### 任务启动失败

**调试步骤:**
1. 查看任务配置文件路径是否正确
2. 检查任务配置文件语法
3. 验证任务模块是否编译
4. 查看详细错误信息

## 📈 高级用法

### 1. 多配置管理

```bash
# 开发配置
./scripts/arb-bot.sh --config configs/launcher-dev.toml

# 生产配置
./scripts/arb-bot.sh --config configs/launcher-prod.toml

# 测试配置
./scripts/arb-bot.sh --config configs/launcher-test.toml
```

### 2. 环境变量覆盖

```bash
# 设置环境变量
export NODE_ENV=production
export LOG_LEVEL=debug

# 在配置中使用
# 暂不支持，计划中功能
```

### 3. 自动重启配置

```toml
[options]
auto_restart = true          # 启用自动重启
max_restarts = 10            # 最大重启次数
restart_delay_seconds = 5    # 重启延迟
```

## 🎯 最佳实践

### 1. 配置组织

```
configs/
├── global.toml              # 全局变量
├── launcher.toml            # 开发配置
├── launcher-prod.toml       # 生产配置
└── launcher-test.toml       # 测试配置
```

### 2. 变量命名

```toml
[global]
# 使用大写+下划线
DEFAULT_KEYPAIR_PATH = "..."
MAINNET_RPC_URL = "..."
JITO_AUTH_KEY = "..."
```

### 3. 安全管理

```toml
# 不要将敏感信息提交到Git
# 使用.gitignore排除
*.toml
!*example*.toml
```

## 📚 相关文档

- [设计文档](../../sol设计文档.md) - 第2.1节
- [全局配置](../../configs/global.toml)
- [Jupiter Bot](../jupiter-bot/README.md)
- [OnChain Bot](../onchain-bot/README.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
