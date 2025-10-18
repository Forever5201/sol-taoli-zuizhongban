# LUT (Address Lookup Table) 管理工具

完整的Solana地址查找表创建、管理和使用工具集。

## 🎯 为什么需要LUT？

### 问题：Solana交易大小限制

```
Solana交易限制:
├─ 最大大小: 1232字节
├─ 每个账户: 32字节
└─ 最多账户: ~35个

复杂套利交易需求:
├─ 闪电贷: 10-15个账户
├─ 多跳Swap: 每跳10个账户
├─ 3跳套利: 35-45个账户
└─ 问题: 超出限制！❌
```

### 解决方案：LUT压缩账户引用

```
使用LUT:
├─ 预先加载常用账户
├─ 账户引用: 32字节 → 1字节
├─ 压缩率: 96.9%
├─ 最多账户: 256个
└─ 结果: 复杂交易成为可能！✅

实际效果:
不使用LUT: 35个账户 × 32字节 = 1120字节 (接近限制)
使用LUT:   35个账户 × 1字节  = 35字节   (大量空间)
```

## 📦 功能特性

- ✅ **创建LUT** - 一键创建新的地址查找表
- ✅ **扩展LUT** - 批量添加账户地址
- ✅ **预设模板** - 内置常用DEX和协议账户
- ✅ **查询管理** - 查看、验证LUT内容
- ✅ **冻结/关闭** - 完整的生命周期管理
- ✅ **CLI工具** - 命令行快速操作
- ✅ **TypeScript** - 完整类型支持

## 🚀 快速开始

### 方式1：使用CLI工具

```bash
# 1. 创建新LUT
npm run lut create

# 2. 添加套利基础账户
npm run lut extend <lut_address> ARBITRAGE_BASE

# 3. 查看LUT信息
npm run lut info <lut_address>
```

### 方式2：编程方式

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { LUTManager, LUT_PRESETS } from '@solana-arb-bot/core/lut';

const connection = new Connection('https://api.devnet.solana.com');
const payer = Keypair.fromSecretKey(...);
const manager = new LUTManager(connection);

// 创建LUT
const { lutAddress } = await manager.createLUT(payer);

// 添加账户
const preset = LUT_PRESETS.ARBITRAGE_BASE;
await manager.extendLUT(lutAddress, preset.addresses, payer);

console.log('✅ LUT就绪！');
```

## 📋 CLI命令

### 创建LUT

```bash
npm run lut create
```

输出：
```
🔧 Creating new LUT...

✅ LUT Created Successfully!

Address: ABC123...XYZ
Transaction: 5Xk9...2Fm

📝 Config saved to: lut-config.json
```

### 扩展LUT

```bash
npm run lut extend <lut_address> <preset_name>
```

示例：
```bash
# 使用套利基础预设
npm run lut extend ABC123...XYZ ARBITRAGE_BASE

# 使用闪电贷预设
npm run lut extend ABC123...XYZ FLASHLOAN_ARBITRAGE
```

### 查看信息

```bash
npm run lut info <lut_address>
```

输出：
```
📊 LUT Information

Address: ABC123...XYZ

Authority: DEF456...UVW
Addresses: 45
Deactivation Slot: 123456789
Last Extended Slot: 123456790

📋 Addresses:
  0: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  1: 11111111111111111111111111111111
  ...
```

### 列出预设

```bash
npm run lut presets
```

### 冻结LUT

```bash
npm run lut freeze <lut_address>
```

### 关闭LUT

```bash
npm run lut close <lut_address>
```

## 🎨 预设模板

### ARBITRAGE_BASE（套利基础）

包含内容：
- ✅ 主流代币Mint（SOL, USDC, USDT等）
- ✅ 系统程序（Token, ATA等）
- ✅ Raydium AMM
- ✅ Orca Whirlpool
- ✅ Jupiter聚合器

总计：~40个账户

用途：适合大多数套利场景

### FLASHLOAN_ARBITRAGE（闪电贷套利）

包含内容：
- ✅ ARBITRAGE_BASE的所有内容
- ✅ Solend程序和储备
- ✅ 闪电贷相关账户

总计：~50个账户

用途：使用闪电贷的套利策略

### JUPITER_ONLY（Jupiter专用）

包含内容：
- ✅ 主流代币Mint
- ✅ 系统程序
- ✅ Jupiter v4/v6程序

总计：~25个账户

用途：仅使用Jupiter的策略

## 💻 编程API

### LUTManager类

#### 创建LUT

```typescript
async createLUT(
  payer: Keypair,
  authority?: PublicKey
): Promise<CreateLUTResult>
```

#### 扩展LUT

```typescript
async extendLUT(
  lutAddress: PublicKey,
  addresses: PublicKey[],
  payer: Keypair,
  authority?: Keypair
): Promise<ExtendLUTResult>
```

#### 获取LUT

```typescript
async getLUT(
  lutAddress: PublicKey
): Promise<AddressLookupTableAccount | null>
```

#### 冻结LUT

```typescript
async freezeLUT(
  lutAddress: PublicKey,
  authority: Keypair,
  payer: Keypair
): Promise<string>
```

#### 关闭LUT

```typescript
async closeLUT(
  lutAddress: PublicKey,
  authority: Keypair,
  recipient: PublicKey,
  payer: Keypair
): Promise<string>
```

#### 检查地址

```typescript
async containsAddress(
  lutAddress: PublicKey,
  address: PublicKey
): Promise<boolean>

async findMissingAddresses(
  lutAddress: PublicKey,
  addresses: PublicKey[]
): Promise<PublicKey[]>
```

## 🔧 在交易中使用LUT

### 基础用法

```typescript
import { 
  TransactionMessage, 
  VersionedTransaction 
} from '@solana/web3.js';

// 1. 获取LUT
const lut = await manager.getLUT(lutAddress);

// 2. 构建交易消息（传入LUT）
const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash,
  instructions: [
    // 你的交易指令
  ],
}).compileToV0Message([lut]); // 传入LUT数组

// 3. 创建版本化交易
const transaction = new VersionedTransaction(messageV0);

// 现在LUT中的账户只占1字节！
```

### 套利交易示例

```typescript
// 三角套利：SOL → USDC → USDT → SOL
const lut = await manager.getLUT(lutAddress);

const arbitrageInstructions = [
  // Raydium: SOL → USDC
  await buildRaydiumSwap(SOL, USDC, amount1),
  
  // Orca: USDC → USDT
  await buildOrcaSwap(USDC, USDT, amount2),
  
  // Jupiter: USDT → SOL
  await buildJupiterSwap(USDT, SOL, amount3),
];

const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash,
  instructions: arbitrageInstructions,
}).compileToV0Message([lut]);

const tx = new VersionedTransaction(messageV0);
tx.sign([payer]);

const signature = await connection.sendTransaction(tx);
```

### 闪电贷套利示例

```typescript
// 闪电贷 + 多跳套利
const lut = await manager.getLUT(flashloanLutAddress);

const instructions = [
  // 1. 闪电借款
  flashBorrowInstruction,
  
  // 2. 多跳套利（可能10+条指令）
  ...arbitrageInstructions,
  
  // 3. 闪电还款
  flashRepayInstruction,
];

// 使用LUT，即使有20+条指令也不会超出限制
const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash,
  instructions,
}).compileToV0Message([lut]);

const tx = new VersionedTransaction(messageV0);
```

## 📊 性能对比

### 交易大小

| 场景 | 不使用LUT | 使用LUT | 节省 |
|------|----------|---------|------|
| **简单Swap** | ~800字节 | ~100字节 | 87.5% |
| **三角套利** | ~1200字节❌ | ~150字节 | 87.5% |
| **闪电贷套利** | 超限制❌ | ~200字节 | 可行✅ |

### 账户数量

| 操作 | 最大账户 | 说明 |
|------|---------|------|
| **不使用LUT** | ~35个 | 受1232字节限制 |
| **使用LUT** | 256个 | LUT最大容量 |

## 🎓 高级用法

### 自定义预设

```typescript
import { createCustomPreset } from '@solana-arb-bot/core/lut';

const myPreset = createCustomPreset(
  'My Custom Preset',
  '我的自定义账户集合',
  [
    myToken1Mint,
    myToken2Mint,
    myPoolAccount,
    // ... 更多账户
  ]
);

await manager.extendLUT(lutAddress, myPreset.addresses, payer);
```

### 合并多个预设

```typescript
import { mergePresets, LUT_PRESETS } from '@solana-arb-bot/core/lut';

const merged = mergePresets(
  LUT_PRESETS.ARBITRAGE_BASE,
  LUT_PRESETS.FLASHLOAN_ARBITRAGE,
  myCustomPreset
);

console.log(`合并后包含 ${merged.addresses.length} 个地址`);
```

### 增量更新

```typescript
// 检查缺失的地址
const missing = await manager.findMissingAddresses(
  lutAddress,
  newAddresses
);

if (missing.length > 0) {
  console.log(`需要添加 ${missing.length} 个新地址`);
  await manager.extendLUT(lutAddress, missing, payer);
}
```

### 导出和备份

```typescript
// 导出LUT配置
const config = await manager.exportLUTConfig(lutAddress);

// 保存到文件
import { writeFileSync } from 'fs';
writeFileSync(
  'lut-backup.json',
  JSON.stringify(config, null, 2)
);

// 恢复时可以读取并重建
```

## 🛡️ 最佳实践

### 1. 规划LUT内容

```typescript
// ✅ 好的做法
- 包含经常使用的账户
- 按功能分组（Raydium、Orca等）
- 预留空间用于未来扩展

// ❌ 不好的做法
- 添加很少用到的账户
- 混乱无序的地址列表
- LUT填满后无法扩展
```

### 2. 何时冻结LUT

```typescript
// ✅ 应该冻结
- LUT内容已稳定
- 不再需要添加账户
- 准备生产部署

// ❌ 不应该冻结
- 还在测试阶段
- 可能需要添加账户
- 不确定LUT是否完整
```

### 3. 成本管理

```typescript
// LUT创建成本：~0.01 SOL（租金）
// 可以通过关闭LUT回收租金

// 建议：
- Devnet先测试LUT内容
- 确认无误后在Mainnet创建
- 不再使用的LUT及时关闭
```

### 4. 多LUT策略

```typescript
// 为不同策略创建不同的LUT
const jupiterLUT = await manager.createLUT(payer);  // Jupiter专用
const raydiumLUT = await manager.createLUT(payer);  // Raydium专用
const flashloanLUT = await manager.createLUT(payer); // 闪电贷专用

// 在交易中可以使用多个LUT
const messageV0 = new TransactionMessage({
  ...
}).compileToV0Message([jupiterLUT, raydiumLUT]);
```

## 🐛 故障排查

### LUT创建失败

```
问题：Transaction failed
原因：钱包余额不足
解决：确保至少有0.02 SOL用于创建和交易费
```

### 扩展LUT失败

```
问题：Instruction failed
原因：批次太大（>30个地址）
解决：LUTManager自动分批，检查权限设置
```

### 交易中LUT不生效

```
问题：Transaction too large
原因：LUT未正确传入compileToV0Message
解决：确保使用.compileToV0Message([lut])
```

### 找不到LUT

```
问题：LUT not found
原因：LUT可能在错误的网络（Devnet vs Mainnet）
解决：检查connection使用的网络
```

## 📚 参考资料

- [Solana LUT文档](https://docs.solana.com/developing/lookup-tables)
- [VersionedTransaction指南](https://docs.solana.com/developing/versioned-transactions)
- [交易大小优化](https://docs.solana.com/developing/programming-model/transactions#size-limits)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
