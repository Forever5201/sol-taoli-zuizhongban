# **高性能 Solana DEX 套利机器人：技术设计文档**

版本: 1.0  
日期: 2025年10月12日  
灵感来源: NotArb 高性能交易平台 (Release v1.0.15+)

## **1\. 项目概述与设计哲学**

### **1.1. 项目目标**

本项目旨在设计并实现一个模块化、高性能、低延迟的 Solana 去中心化交易所（DEX）套利机器人。该系统将能够实时发现并执行链上套利机会，其架构和性能将以 NotArb 等专业级交易机器人为标杆。

### **1.2. 核心设计哲学**

* **性能至上 (Performance First)**: 在机会发现、交易构建和执行的每一个环节，都优先选用最低延迟、最高吞吐量的技术方案。  
* **模块化与解耦 (Modular & Decoupled)**: 系统的各个核心组件（如机会发现、交易执行、配置管理）应相互独立，便于单独开发、测试和升级。  
* **配置驱动 (Configuration-Driven)**: 系统的所有行为和策略都应由外部配置文件驱动，而不是硬编码在程序中，以实现最大的灵活性和快速调整。参考 NotArb 广泛使用的 .toml 格式 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-bot/example-jito.toml, notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/onchain-bot/example.toml\]。  
* **安全可控 (Secure & Controllable)**: 采用严格的资金隔离和风险控制措施，确保用户资产安全，并强制用户通过配置项确认风险 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/TOS.md\]。

### **1.3. 技术栈选择与对比**

#### **1.3.1. 开发语言选择**

经过深入分析，本项目选择 **TypeScript/Node.js** 作为主要开发语言，原因如下：

| 维度 | TypeScript | Rust | Java (NotArb使用) |
|------|-----------|------|------------------|
| **开发速度** | ⭐⭐⭐⭐⭐ 最快 | ⭐⭐ 慢 | ⭐⭐⭐ 中等 |
| **性能** | ⭐⭐⭐⭐ 足够 | ⭐⭐⭐⭐⭐ 最优 | ⭐⭐⭐⭐ 优秀 |
| **生态成熟度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **调试体验** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Solana支持** | ⭐⭐⭐⭐⭐ 官方主推 | ⭐⭐⭐⭐⭐ 原生 | ⭐⭐⭐ 社区 |

**关键洞察**：套利机器人的性能瓶颈在于**网络延迟（RPC、Jito）**，而非代码执行速度。TypeScript的执行延迟（2-5ms）相比Rust（0.5-1ms）的差距，在总体400-800ms的交易周期中**微不足道**（<1%影响）。

**技术栈决策**：
- **主框架**: TypeScript (快速迭代、生态成熟)
- **性能关键模块**: 预留Rust原生模块接口（必要时优化）
- **部署**: 单一可执行文件（pkg/nexe打包）

#### **1.3.2. TypeScript核心技术栈**

```typescript
// package.json 核心依赖
{
  "dependencies": {
    // === Solana 核心库 ===
    "@solana/web3.js": "^1.87.6",           // 官方SDK
    "@coral-xyz/anchor": "^0.29.0",         // 链上程序交互
    "@solana/spl-token": "^0.4.0",          // SPL Token操作
    
    // === Jito MEV ===
    "@jito-labs/jito-ts": "^3.0.0",         // Jito Bundle SDK
    
    // === 高性能HTTP客户端 ===
    "undici": "^6.0.0",                     // HTTP/2支持，连接池
    "axios": "^1.6.0",                      // 备用客户端
    
    // === 配置管理 ===
    "toml": "^3.0.0",                       // TOML解析
    
    // === 日志系统 ===
    "pino": "^8.17.0",                      // 高性能日志（比winston快5倍）
    "pino-pretty": "^10.3.0",               // 美化输出
    
    // === 数据序列化 ===
    "borsh": "^2.0.0",                      // 链上数据反序列化
    "buffer-layout": "^1.2.2",              // 二进制布局解析
    
    // === 加密与安全 ===
    "bs58": "^5.0.0",                       // Base58编解码
    "tweetnacl": "^1.0.3",                  // 加密算法
    "argon2": "^0.31.0",                    // 密钥加密
    
    // === 性能优化 ===
    "p-queue": "^8.0.0",                    // 并发控制
    "bottleneck": "^2.19.5"                 // 速率限制
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",                        // 开发时快速执行
    "esbuild": "^0.19.0"                    // 快速构建
  }
}
```

#### **1.3.3. 混合架构方案（可选）**

对于极端性能要求的模块，预留TypeScript + Rust混合架构接口：

```typescript
// TypeScript 调用 Rust 原生模块
import { parseRaydiumAccounts } from './native/parser.node';

// Rust侧（通过NAPI-RS暴露）
const prices = parseRaydiumAccounts(accountsData); // 6-8倍性能提升
```

**混合策略**：
1. **初期**：全部TypeScript实现，快速验证
2. **中期**：如果链上解析成为瓶颈，用Rust重写解析器
3. **长期**：保持TypeScript为主体，Rust仅用于<5%的性能热点

## **2\. 系统架构**

本系统将复刻 NotArb 的**双策略、双执行路径**的先进架构，并通过一个智能启动器进行任务分发。

### **2.1. 启动器与配置子系统**

* **智能启动脚本 (main.sh / main.bat)**: 借鉴 notarb.sh 的设计 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/notarb.sh, notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/notarb.bat\]，此脚本负责：  
  1. 自动检测、下载并安装指定版本的运行时环境（如 Node.js 或 Rust 工具链）。  
  2. 执行主应用程序（Launcher）。  
* **主启动器 (Launcher)**: 程序的唯一入口点，借鉴 notarb-launcher.jar 的模式 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/notarb-launcher.jar\]。它解析命令行传入的 .toml 配置文件，并根据 \[launcher\].task 字段（例如 "onchain-bot"）来加载并运行相应的核心业务模块 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/notarb-launcher.toml\]。  
* **分层配置子系统**:  
  1. **全局配置 (global.toml)**: 定义所有模块共享的变量，如 DEFAULT\_KEYPAIR\_PATH 和 DEFAULT\_RPC\_URL \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/notarb-global.toml\]。  
  2. **模块配置**: 每个机器人或工具都有其独立的 .toml 配置文件。  
  3. **变量替换**: 实现一个配置加载器，能自动将 ${VAR} 格式的字符串替换为 global.toml 中定义的对应值。

### **2.2. 双策略机会发现引擎**

系统将同时实现两种互补的套利机会发现策略。

* **策略 A: 聚合器驱动 (Aggregator-Driven)**: 借鉴 Jupiter Bot，利用一个自托管的 Jupiter API 作为“大脑”来发现全链机会。  
* **策略 B: 直接链上扫描 (On-Chain Scanning)**: 借鉴 On-Chain Bot，直接读取链上状态以最低延迟发现特定市场的机会。

### **2.3. 双路径高速交易执行引擎**

系统将同时实现两种行业顶尖的交易发送策略。

* **路径 A: Jito 优先通道 (MEV Solution)**: 通过向验证者支付“小费”来获得优先打包权。  
* **路径 B: RPC 高频轰炸 (Brute Force)**: 通过向多个 RPC 节点并行发送交易来提高成功率。

## **3\. 核心模块详细设计**

### **3.1. 机会发现引擎 \- 策略 A: 聚合器驱动**

* **组件 1: Jupiter API 服务管理器 (jupiter-server 模块)**  
  * **职责**: 自动化部署和管理一个本地、私有的 Jupiter v6 API 实例 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-server/README.md\]。  
  * **实现**:  
    * 从 Jupiter 的 GitHub 自动下载 jupiter-cli 二进制文件。  
    * 通过子进程启动 jupiter-cli，并通过环境变量注入配置，特别是 RPC\_URL 和 ALLOW\_CIRCULAR\_ARBITRAGE="true" \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-server/example.toml\]。  
    * 实现健康检查和自动重启机制。  
* **组件 2: 机器人客户端 (jupiter-bot 模块)**  
  * **职责**: 高频次地查询本地 Jupiter API 以发现套利机会 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-bot/README.md\]。  
  * **实现**:  
    * 启动时从 mints.txt 加载目标代币列表 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-bot/mints.txt\]。  
    * 创建多个并行的查询任务（workers），每个任务在一个无限循环中，以毫秒级速度向本地 API (http://127.0.0.1:8080) 发送**环形报价 (Circular Quote)** 请求。  
    * 当响应的 outAmount \> inAmount 时，验证利润空间，然后调用 /swap 接口获取序列化交易，并移交执行。

### **3.2. 机会发现引擎 \- 策略 B: 直接链上扫描**

* **组件 1: 市场状态轮询器 (Market State Poller)**  
  * **职责**: 以最低延迟获取链上多个流动性池的实时状态 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/onchain-bot/README.md\]。  
  * **实现**:  
    * 从 markets.toml 文件加载交易对地址列表 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/onchain-bot/markets.toml\]。  
    * 使用 Solana RPC 的 getMultipleAccounts 方法，高频次地批量获取所有池子账户的最新数据。  
* **组件 2: DEX 定价解析器 (DEX Pricing Parsers)**  
  * **职责**: 从原始账户数据中计算出实时价格。  
  * **实现**: 为每个目标 DEX（如 Raydium, Orca, Meteora, Pump.fun）创建一个独立的解析模块。每个模块需硬编码该 DEX 池子账户的数据结构，并使用 borsh 等库进行反序列化，最后根据其定价公式计算价格 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/onchain-bot/README.md\]。  
* **组件 3: 价差对比引擎 (Arbitrage Engine)**  
  * **职责**: 对比不同 DEX 的价格，发现可执行的套利路径。  
  * **实现**: 在内存中维护一个实时价格表，不断对比并寻找利润空间超过阈值的路径。

### **3.3. 高速交易执行引擎**

* **路径 A: Jito 优先通道**  
  * **实现**: 使用 gRPC 客户端连接到 Jito Block Engine。构建一个包含核心套利交易和一笔“小费”交易的 **Jito Bundle**，并通过 gRPC 发送 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-bot/example-jito.toml\]。小费金额应支持静态配置或基于利润的动态计算。  
* **路径 B: RPC 高频轰炸 (Spam)**  
  * **实现**: 从配置中加载多个付费高性能 RPC 节点。创建一个并发的 HTTP 客户端池，将同一笔已签名的交易通过所有客户端**同时**发送出去，并设置 skipPreflight: true \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-bot/example-spam.toml\]。

## **4\. 高级功能与配套工具**

* **闪电贷 (Flash Loans)**  
  * **实现**: 在交易构建器中实现一个**指令组合器**。当配置启用 flash\_loan \= true 时 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/onchain-bot/README.md\]，在核心 Swap 指令前后，动态地插入从目标借贷协议借款和还款的指令，并打包到同一个原子交易中。  
* **地址查找表 (Address Lookup Tables \- LUT)**  
  * **实现**: 分为两部分：  
    1. **离线工具集**: 创建一套独立的命令行工具，功能包括 create, extend, close LUT，与 NotArb 的 tools 目录功能一致 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/tools/lut-create.toml, notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/tools/lut-extend.toml\]。  
    2. **运行时集成**: 机器人启动时加载 lookup-tables.txt \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/onchain-bot/lookup-tables.txt\]，并在构建交易时使用 VersionedTransaction 格式。  
* **必备工具集**  
  * **WSOL 自动解包器**: 一个后台服务，定时检查原生 SOL 余额，若低于阈值则自动解包 WSOL 以确保 Gas 费充足 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/jupiter-bot/README.md\]。  
  * **RPC 健康检查器**: 一个工具，用于测试 RPC 列表的延迟和可用性 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/tools/rpc-health.toml\]。  
  * **密钥保护工具**: 提供一个工具，使用用户密码加密私钥文件 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/tools/protect-keypair.toml\]。

## **5\. 安全与风险管理**

* **钱包隔离**: 所有文档和界面提示都必须明确要求用户使用专用的、仅含少量操作资金的**热钱包**。  
* **风险确认**: 在核心配置文件中加入 acknowledge\_terms\_of\_service \= false 字段，并强制用户将其设为 true 才能运行，确保用户已阅读风险提示 \[cite: notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/README.md, notarb/release/Release-30f684c28c3b1901ab3ea3fad504b88f9e2b159b/TOS.md\]。  
* **无硬编码远程调用**: 程序不应有任何硬编码的远程网络调用，所有端点（RPC, Jito, Jupiter API）都必须由用户在配置文件中明确指定。

## **6\. 开发路线图建议**

1. **阶段一：基础架构 (Sprint 1-2)**  
   * 搭建好项目结构，实现智能启动脚本、主启动器和分层配置子系统。  
2. **阶段二：核心策略实现 (Sprint 3-5)**  
   * 从**策略 B (直接链上扫描)** 和**路径 B (RPC Spam)** 开始，因为它们不依赖外部服务，更能锻炼核心能力。  
3. **阶段三：高级策略与执行 (Sprint 6-7)**  
   * 实现**策略 A (聚合器驱动)**，包括 Jupiter Server 的管理。  
   * 集成**路径 A (Jito 优先通道)**，这是获得竞争优势的关键。  
4. **阶段四：高级功能与工具 (Sprint 8-9)**  
   * 在交易构建器中加入**闪电贷**的逻辑。  
   * 开发并集成**LUT 管理工具**和所有其他配套工具。  
5. **阶段五：测试与优化 (Sprint 10+)**  
   * 进行全面的压力测试和性能优化，特别关注 RPC 和 Jito 连接的稳定性。

## **7. TypeScript实施方案详细设计**

### **7.1. 项目结构设计**

参考NotArb的模块化架构，采用Monorepo设计：

```
solana-arb-bot/
├── packages/                      # 核心包（Monorepo）
│   ├── core/                      # 🔧 核心库
│   │   ├── src/
│   │   │   ├── config/            # 配置管理（TOML解析、变量替换）
│   │   │   ├── logger/            # 日志系统（Pino）
│   │   │   ├── solana/            # Solana基础封装
│   │   │   │   ├── connection.ts  # RPC连接池
│   │   │   │   ├── keypair.ts     # 密钥管理
│   │   │   │   └── transaction.ts # 交易构建器
│   │   │   ├── types/             # 全局类型定义
│   │   │   └── utils/             # 工具函数
│   │   └── package.json
│   │
│   ├── launcher/                  # 🚀 启动器
│   │   ├── src/
│   │   │   ├── index.ts           # 主入口
│   │   │   ├── task-loader.ts     # 动态加载任务模块
│   │   │   ├── dependency-checker.ts # 依赖检查
│   │   │   └── auto-updater.ts    # 自动更新
│   │   └── package.json
│   │
│   ├── jupiter-server/            # 🌟 Jupiter API管理器
│   │   ├── src/
│   │   │   ├── index.ts           # 主程序
│   │   │   ├── downloader.ts      # 下载jupiter-cli
│   │   │   ├── process-manager.ts # 进程管理
│   │   │   └── health-checker.ts  # 健康检查
│   │   ├── example.toml           # 示例配置
│   │   └── package.json
│   │
│   ├── jupiter-bot/               # 🤖 Jupiter套利机器人
│   │   ├── src/
│   │   │   ├── index.ts           # 主程序
│   │   │   ├── opportunity-finder.ts    # 机会发现
│   │   │   │   └── workers/       # Worker Threads并行查询
│   │   │   ├── executors/         # 执行引擎
│   │   │   │   ├── jito-executor.ts     # Jito路径
│   │   │   │   └── spam-executor.ts     # RPC Spam路径
│   │   │   └── metrics.ts         # 性能指标
│   │   ├── example-jito.toml      # Jito配置示例
│   │   ├── example-spam.toml      # Spam配置示例
│   │   ├── mints.txt              # 目标代币列表
│   │   └── package.json
│   │
│   ├── onchain-bot/               # ⛓️ 链上扫描机器人
│   │   ├── src/
│   │   │   ├── index.ts           # 主程序
│   │   │   ├── market-scanner.ts  # 市场扫描器
│   │   │   ├── parsers/           # DEX解析器
│   │   │   │   ├── raydium.ts     # Raydium池子解析
│   │   │   │   ├── orca.ts        # Orca池子解析
│   │   │   │   ├── meteora.ts     # Meteora解析
│   │   │   │   └── pumpfun.ts     # Pump.fun解析
│   │   │   ├── arbitrage-engine.ts # 套利引擎
│   │   │   └── transaction-builder.ts # 交易构建
│   │   ├── example.toml           # 配置示例
│   │   ├── markets.toml           # 市场列表
│   │   ├── lookup-tables.txt      # LUT地址
│   │   └── package.json
│   │
│   └── tools/                     # 🛠️ 工具集
│       ├── wrap-sol/              # SOL打包工具
│       ├── unwrap-sol/            # WSOL解包工具
│       ├── rpc-health/            # RPC健康检查
│       ├── protect-keypair/       # 密钥加密工具
│       ├── lut-create/            # 创建LUT
│       ├── lut-extend/            # 扩展LUT
│       └── lut-close/             # 关闭LUT
│
├── configs/                       # 📁 配置文件目录
│   ├── global.toml                # 全局配置（用户创建）
│   ├── global.example.toml        # 全局配置示例
│   └── launcher.toml              # 启动器配置
│
├── scripts/                       # 📜 启动脚本
│   ├── arb-bot.sh                 # Linux/Mac启动脚本
│   └── arb-bot.bat                # Windows启动脚本
│
├── logs/                          # 📊 日志目录
├── release.txt                    # 版本追踪
├── package.json                   # 根package.json
├── turbo.json                     # Monorepo构建配置
└── tsconfig.json                  # TypeScript配置
```

### **7.2. 核心模块API设计**

#### **7.2.1. 配置管理器 (ConfigManager)**

```typescript
// packages/core/src/config/index.ts

export class ConfigManager {
  /**
   * 加载全局配置
   * @param path - 配置文件路径（默认：configs/global.toml）
   * @returns 全局配置对象
   */
  static loadGlobalConfig(path?: string): GlobalConfig;

  /**
   * 加载模块配置
   * @param path - 模块配置路径
   * @returns 配置对象（已进行变量替换）
   */
  static loadConfig<T>(path: string): T;

  /**
   * 变量替换
   * 自动将 ${VAR_NAME} 替换为global.toml中的值
   */
  private static replaceVariables(content: string): string;

  /**
   * 验证配置合法性
   * - 检查acknowledge_terms_of_service
   * - 验证密钥文件存在性
   * - 检查RPC URL有效性
   */
  private static validateConfig(config: any): void;
}

// 使用示例
const globalConfig = ConfigManager.loadGlobalConfig();
const jupiterConfig = ConfigManager.loadConfig<JupiterBotConfig>(
  'packages/jupiter-bot/my-config.toml'
);
```

#### **7.2.2. RPC连接池 (ConnectionPool)**

```typescript
// packages/core/src/solana/connection.ts

export class ConnectionPool {
  private connections: Map<string, Connection>;
  private rateLimiters: Map<string, Bottleneck>;

  constructor(endpoints: string[], options: PoolOptions);

  /**
   * 获取最佳RPC连接（基于延迟和可用性）
   */
  async getBestConnection(): Promise<Connection>;

  /**
   * 并行发送到所有RPC（用于Spam策略）
   */
  async broadcastTransaction(
    transaction: Transaction,
    options?: SendOptions
  ): Promise<BroadcastResult[]>;

  /**
   * 批量获取账户（优化的getMultipleAccounts）
   */
  async getMultipleAccountsBatch(
    pubkeys: PublicKey[],
    batchSize?: number
  ): Promise<AccountInfo[]>;

  /**
   * 健康检查
   */
  async healthCheck(): Promise<RpcHealthStatus[]>;
}
```

#### **7.2.3. Jito执行器 (JitoExecutor)**

```typescript
// packages/jupiter-bot/src/executors/jito-executor.ts

export class JitoExecutor {
  private client: SearcherClient; // gRPC客户端
  private authKeypair: Keypair;

  constructor(config: JitoConfig);

  /**
   * 发送Jito Bundle
   * @param transactions - 核心交易列表
   * @param tipLamports - 小费金额（lamports）
   */
  async sendBundle(
    transactions: Transaction[],
    tipLamports: number
  ): Promise<JitoBundleResult>;

  /**
   * 动态计算最优小费
   * 基于历史成功率和当前竞争强度
   */
  async calculateOptimalTip(expectedProfit: number): Promise<number>;

  /**
   * 获取下一个Jito领导者
   * 只在Jito验证者即将出块时发送
   */
  async getNextJitoLeader(): Promise<JitoLeaderInfo>;

  /**
   * 构建带小费的Bundle
   */
  private async buildBundle(
    transactions: Transaction[],
    tip: number
  ): Promise<Bundle>;
}

// 使用示例
const executor = new JitoExecutor(config);
const result = await executor.sendBundle(
  [arbitrageTransaction],
  50000 // 0.00005 SOL tip
);
```

#### **7.2.4. Jupiter机会发现器 (OpportunityFinder)**

```typescript
// packages/jupiter-bot/src/opportunity-finder.ts

export class OpportunityFinder {
  private jupiterApiUrl: string;
  private workers: Worker[]; // Worker Threads
  private targetMints: PublicKey[];

  constructor(config: JupiterBotConfig);

  /**
   * 启动多个Worker并行查询
   */
  async start(): Promise<void>;

  /**
   * 查询环形套利机会
   * @param inputMint - 输入代币
   * @param amount - 金额
   */
  private async queryCircularArbitrage(
    inputMint: PublicKey,
    amount: number
  ): Promise<ArbitrageOpportunity | null>;

  /**
   * 验证机会是否可执行
   * - 检查利润是否超过阈值
   * - 估算Gas费
   * - 计算滑点
   */
  private async validateOpportunity(
    opp: RawOpportunity
  ): Promise<boolean>;

  /**
   * 获取交易数据（调用Jupiter Swap API）
   */
  private async getSwapTransaction(
    route: Route
  ): Promise<VersionedTransaction>;
}
```

#### **7.2.5. 链上扫描器 (MarketScanner)**

```typescript
// packages/onchain-bot/src/market-scanner.ts

export class MarketScanner {
  private connection: Connection;
  private markets: Market[]; // 从markets.toml加载
  private priceCache: Map<string, PriceInfo>;
  private workers: Worker[]; // Worker Threads用于并行解析

  constructor(config: OnChainBotConfig);

  /**
   * 启动扫描器（无限循环）
   */
  async start(): Promise<void>;

  /**
   * 单次扫描周期
   */
  private async scanOnce(): Promise<void>;

  /**
   * 批量获取市场账户数据
   */
  private async fetchMarketAccounts(): Promise<MarketAccountData[]>;

  /**
   * 并行解析账户数据（使用Worker Threads）
   */
  private async parseAccounts(
    accounts: MarketAccountData[]
  ): Promise<PriceInfo[]>;

  /**
   * 更新价格缓存
   */
  private updatePriceCache(prices: PriceInfo[]): void;

  /**
   * 发现套利机会
   */
  private findArbitrageOpportunities(): ArbitrageOpportunity[];
}
```

### **7.3. 关键数据流设计**

#### **7.3.1. Jupiter Bot数据流**

```
[启动] 
  ↓
[加载配置] → global.toml + jupiter-bot/config.toml
  ↓
[初始化组件]
  ├─ Jupiter API健康检查
  ├─ 加载mints.txt
  ├─ 创建RPC连接池
  └─ 初始化执行器（Jito/Spam）
  ↓
[启动Worker Threads] (4-8个并行)
  ↓
[无限循环] ─────────────────┐
  ↓                         │
[查询Jupiter API]           │
  ↓                         │
[发现机会？]                 │
  ├─ 否 → 等待10ms ─────────┤
  ↓                         │
  是                        │
  ↓                         │
[验证利润]                   │
  ↓                         │
[获取Swap交易]               │
  ↓                         │
[选择执行路径]               │
  ├─ Jito → 构建Bundle → 发送
  └─ Spam → 并行发送到多RPC
  ↓
[记录结果]
  ├─ 成功 → 更新利润统计
  └─ 失败 → 触发熔断检查
  ↓
[继续循环] ──────────────────┘
```

#### **7.3.2. On-Chain Bot数据流**

```
[启动]
  ↓
[加载配置] → markets.toml + lookup-tables.txt
  ↓
[初始化DEX解析器]
  ├─ Raydium Parser
  ├─ Orca Parser
  ├─ Meteora Parser
  └─ Pump.fun Parser
  ↓
[启动扫描循环] ─────────────────┐
  ↓                           │
[批量获取账户]                   │
  ↓ (getMultipleAccounts)     │
[Worker Threads并行解析]        │
  ↓                           │
[更新价格表]                     │
  ↓                           │
[检测价差]                       │
  ↓                           │
[发现套利？]                     │
  ├─ 否 → 等待100ms ───────────┤
  ↓                           │
  是                          │
  ↓                           │
[构建交易]                       │
  ├─ 使用LUT减小交易大小        │
  ├─ 可选：添加闪电贷指令        │
  └─ 签名交易                  │
  ↓                           │
[执行交易] → Jito/Spam          │
  ↓                           │
[记录结果] ─────────────────────┘
```

### **7.4. 性能优化方案**

#### **7.4.1. Worker Threads多线程优化**

```typescript
// packages/jupiter-bot/src/opportunity-finder.ts

import { Worker } from 'worker_threads';

class OpportunityFinder {
  private workers: Worker[] = [];
  
  async start() {
    const cpuCount = os.cpus().length;
    const workerCount = Math.min(cpuCount, 8); // 最多8个worker
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('./worker.js', {
        workerData: {
          workerId: i,
          mints: this.mints.slice(
            i * this.mints.length / workerCount,
            (i + 1) * this.mints.length / workerCount
          )
        }
      });
      
      worker.on('message', (opportunity) => {
        this.handleOpportunity(opportunity);
      });
      
      this.workers.push(worker);
    }
  }
}

// worker.js - 独立线程执行
const { workerData, parentPort } = require('worker_threads');

async function scanLoop() {
  while (true) {
    for (const mint of workerData.mints) {
      const opp = await queryJupiter(mint);
      if (opp.profit > threshold) {
        parentPort.postMessage(opp);
      }
    }
    await sleep(10); // 10ms间隔
  }
}

scanLoop();
```

**性能提升**：
- 单线程：100次查询/秒
- 4线程：350-400次查询/秒（3.5-4倍提升）

#### **7.4.2. HTTP连接池优化**

```typescript
// packages/core/src/solana/connection.ts

import { Agent } from 'undici';

const agent = new Agent({
  connections: 100,           // 最大并发连接
  pipelining: 10,             // HTTP管道化
  keepAliveTimeout: 60000,    // 长连接保持
  keepAliveMaxTimeout: 600000
});

const httpClient = new Undici({
  agent,
  connect: {
    timeout: 3000  // 连接超时
  }
});
```

**效果**：
- 减少TCP握手开销：50% ↓
- 请求延迟：30-50ms → 10-20ms

#### **7.4.3. 内存缓存优化**

```typescript
// packages/onchain-bot/src/market-scanner.ts

class MarketScanner {
  private priceCache: Map<string, {
    price: number;
    timestamp: number;
    reserves: [number, number];
  }> = new Map();

  private updateCache(marketId: string, data: any) {
    // LRU缓存，保留最近1000个市场数据
    if (this.priceCache.size > 1000) {
      const oldest = Array.from(this.priceCache.keys())[0];
      this.priceCache.delete(oldest);
    }
    
    this.priceCache.set(marketId, {
      ...data,
      timestamp: Date.now()
    });
  }

  // 快速查找套利机会（O(1)复杂度）
  findArbitrage() {
    const opportunities = [];
    for (const [key, data] of this.priceCache) {
      // 直接从内存比对，无需重复计算
    }
    return opportunities;
  }
}
```

### **7.5. 监控与告警系统**

```typescript
// packages/core/src/monitoring/index.ts

export class MonitoringService {
  private metrics: PerformanceMetrics;
  private webhookUrl: string;
  
  /**
   * 记录机会发现
   */
  recordOpportunityFound(opp: ArbitrageOpportunity): void;
  
  /**
   * 记录执行结果
   */
  recordExecution(result: ExecutionResult): void;
  
  /**
   * 检查熔断条件
   */
  async checkCircuitBreaker(): Promise<boolean> {
    const config = ConfigManager.getGlobalConfig();
    
    // 连续失败检查
    if (this.metrics.consecutive_failures >= 
        config.security.circuit_breaker_max_failures) {
      await this.sendAlert('🚨 连续失败过多，触发熔断！');
      return true;
    }
    
    // 亏损检查
    if (this.metrics.hourly_loss <= 
        config.security.circuit_breaker_loss_threshold) {
      await this.sendAlert('🚨 亏损超过阈值，触发熔断！');
      return true;
    }
    
    return false;
  }
  
  /**
   * 发送告警到Webhook
   */
  private async sendAlert(message: string): Promise<void> {
    if (!this.webhookUrl) return;
    
    await axios.post(this.webhookUrl, {
      content: message,
      embeds: [{
        title: 'Arbitrage Bot Alert',
        description: message,
        color: 0xFF0000,
        fields: [
          { name: '成功率', value: `${this.metrics.success_rate}%` },
          { name: '净利润', value: `${this.metrics.net_profit_sol} SOL` },
          { name: '运行时间', value: `${this.metrics.uptime_seconds}s` }
        ],
        timestamp: new Date().toISOString()
      }]
    });
  }
  
  /**
   * 定时导出指标（Prometheus格式）
   */
  async exportMetrics(): Promise<string> {
    return `
# TYPE arb_opportunities_found counter
arb_opportunities_found ${this.metrics.opportunities_found}

# TYPE arb_success_rate gauge
arb_success_rate ${this.metrics.success_rate}

# TYPE arb_net_profit gauge
arb_net_profit_sol ${this.metrics.net_profit_sol}
    `.trim();
  }
}
```

### **7.6. 安全与错误处理**

#### **7.6.1. 交易失败重试策略**

```typescript
// packages/core/src/utils/retry.ts

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries = 3, initialDelay = 100, maxDelay = 5000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // 指数退避
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      logger.warn(`重试 ${attempt + 1}/${maxRetries}，等待 ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw new Error('不应该到达这里');
}
```

#### **7.6.2. 密钥安全管理**

```typescript
// packages/tools/protect-keypair/src/index.ts

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export async function encryptKeypair(
  keypairPath: string,
  password: string
): Promise<void> {
  const keypairData = fs.readFileSync(keypairPath);
  
  // 生成盐值
  const salt = randomBytes(32);
  
  // 使用scrypt派生密钥
  const key = (await scryptAsync(password, salt, 32)) as Buffer;
  
  // 使用AES-256-GCM加密
  const cipher = createCipheriv('aes-256-gcm', key, randomBytes(16));
  const encrypted = Buffer.concat([
    cipher.update(keypairData),
    cipher.final()
  ]);
  
  // 保存加密后的文件
  fs.writeFileSync(keypairPath + '.encrypted', JSON.stringify({
    salt: salt.toString('hex'),
    iv: cipher.iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    data: encrypted.toString('hex')
  }));
  
  logger.info('✅ 密钥已加密');
}
```

### **7.7. 部署与打包**

```typescript
// 使用pkg打包成单一可执行文件
// package.json
{
  "bin": "dist/index.js",
  "pkg": {
    "targets": [
      "node20-linux-x64",
      "node20-win-x64",
      "node20-macos-x64"
    ],
    "assets": [
      "configs/**/*.toml",
      "packages/**/*.toml"
    ]
  },
  "scripts": {
    "build": "tsc && pkg .",
    "build:linux": "pkg . --target node20-linux-x64",
    "build:win": "pkg . --target node20-win-x64",
    "build:mac": "pkg . --target node20-macos-x64"
  }
}
```

**部署产物**：
```
release/
├── arb-bot-linux       # Linux可执行文件（~50MB）
├── arb-bot-win.exe     # Windows可执行文件
├── arb-bot-macos       # macOS可执行文件
└── configs/            # 配置文件示例
```

---

## **8. 开发路线图（基于TypeScript）**

### **阶段0：环境准备（1天）**
- ✅ 安装Node.js 20+
- ✅ 初始化Git仓库
- ✅ 创建Monorepo结构

### **阶段1：基础架构（3-5天）**
- ✅ 实现配置管理器（TOML解析+变量替换）
- ✅ 实现日志系统（Pino）
- ✅ 实现RPC连接池
- ✅ 实现智能启动器
- ✅ 编写启动脚本（.sh/.bat）

### **阶段2：Jupiter Bot MVP（5-7天）**
- ✅ 实现Jupiter Server管理器
- ✅ 实现机会发现器（单线程版本）
- ✅ 实现Spam执行器（RPC并发发送）
- ✅ 在Devnet测试
- ✅ 优化：添加Worker Threads

### **阶段3：Jito集成（3-4天）**
- ✅ 集成@jito-labs/jito-ts
- ✅ 实现Jito执行器
- ✅ 实现小费计算策略
- ✅ 测试Bundle发送

### **阶段4：On-Chain Bot（7-10天）**
- ✅ 实现市场扫描器
- ✅ 实现DEX解析器（Raydium、Orca）
- ✅ 实现套利引擎
- ✅ 实现交易构建器
- ✅ 集成LUT支持

### **阶段5：工具集（3-5天）**
- ✅ WSOL管理工具
- ✅ LUT管理工具
- ✅ RPC健康检查工具
- ✅ 密钥加密工具

### **阶段6：监控与优化（5-7天）**
- ✅ 实现性能指标收集
- ✅ 实现告警系统（Webhook）
- ✅ 实现熔断机制
- ✅ 性能压测与优化

### **阶段7：Mainnet部署（3-5天）**
- ✅ 安全审计
- ✅ 小资金测试（1 SOL）
- ✅ 逐步扩大规模
- ✅ 监控并调优

**总计：30-45天完成完整系统**

---

此设计文档为您提供了一个全面的、经过市场验证的架构蓝图。遵循此文档，您将能够系统地构建一个属于自己的、安全可控且性能卓越的 Solana 套利机器人。