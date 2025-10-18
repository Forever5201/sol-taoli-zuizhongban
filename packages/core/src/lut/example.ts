/**
 * LUT使用示例
 * 
 * 演示如何使用LUT管理器
 */

import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { LUTManager } from './manager';
import { LUT_PRESETS, getPreset } from './presets';

/**
 * 示例1：创建新的LUT
 */
async function example1_CreateLUT() {
  console.log('=== 示例1: 创建LUT ===\n');

  const connection = new Connection(clusterApiUrl('devnet'));
  const payer = Keypair.generate(); // 实际使用时应加载真实密钥
  const manager = new LUTManager(connection);

  try {
    const result = await manager.createLUT(payer);
    
    console.log('✅ LUT创建成功!');
    console.log(`LUT地址: ${result.lutAddress.toBase58()}`);
    console.log(`交易签名: ${result.signature}\n`);
    
    return result.lutAddress;
  } catch (error: any) {
    console.error('创建失败:', error.message);
  }
}

/**
 * 示例2：使用预设扩展LUT
 */
async function example2_ExtendWithPreset() {
  console.log('=== 示例2: 使用预设扩展LUT ===\n');

  const connection = new Connection(clusterApiUrl('devnet'));
  const payer = Keypair.generate();
  const manager = new LUTManager(connection);

  // 假设已有LUT地址
  const lutAddress = new PublicKey('YOUR_LUT_ADDRESS_HERE');

  // 获取套利基础预设
  const preset = getPreset('ARBITRAGE_BASE');
  
  console.log(`预设名称: ${preset.name}`);
  console.log(`包含地址: ${preset.addresses.length}个\n`);

  try {
    const result = await manager.extendLUT(
      lutAddress,
      preset.addresses,
      payer
    );

    console.log(`✅ 成功添加 ${result.addressesAdded} 个地址`);
    console.log(`交易数量: ${result.signatures?.length}\n`);
  } catch (error: any) {
    console.error('扩展失败:', error.message);
  }
}

/**
 * 示例3：查看LUT信息
 */
async function example3_GetLUTInfo() {
  console.log('=== 示例3: 查看LUT信息 ===\n');

  const connection = new Connection(clusterApiUrl('devnet'));
  const manager = new LUTManager(connection);

  const lutAddress = new PublicKey('YOUR_LUT_ADDRESS_HERE');

  try {
    const lut = await manager.getLUT(lutAddress);

    if (lut) {
      console.log(`地址数量: ${lut.state.addresses.length}`);
      console.log(`权限: ${lut.state.authority?.toBase58() || '已冻结'}`);
      console.log('\n前10个地址:');
      
      lut.state.addresses.slice(0, 10).forEach((addr, i) => {
        console.log(`  ${i}: ${addr.toBase58()}`);
      });
    }
  } catch (error: any) {
    console.error('查询失败:', error.message);
  }
}

/**
 * 示例4：检查缺失的地址
 */
async function example4_FindMissingAddresses() {
  console.log('=== 示例4: 检查缺失地址 ===\n');

  const connection = new Connection(clusterApiUrl('devnet'));
  const manager = new LUTManager(connection);

  const lutAddress = new PublicKey('YOUR_LUT_ADDRESS_HERE');
  
  // 要检查的地址列表
  const addressesToCheck = [
    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    new PublicKey('11111111111111111111111111111111'),
    // ... 更多地址
  ];

  try {
    const missing = await manager.findMissingAddresses(
      lutAddress,
      addressesToCheck
    );

    if (missing.length === 0) {
      console.log('✅ 所有地址都已包含在LUT中');
    } else {
      console.log(`⚠️  缺失 ${missing.length} 个地址:`);
      missing.forEach(addr => {
        console.log(`  - ${addr.toBase58()}`);
      });
    }
  } catch (error: any) {
    console.error('检查失败:', error.message);
  }
}

/**
 * 示例5：在交易中使用LUT
 */
async function example5_UseInTransaction() {
  console.log('=== 示例5: 在交易中使用LUT ===\n');

  const connection = new Connection(clusterApiUrl('devnet'));
  const payer = Keypair.generate();
  const manager = new LUTManager(connection);

  const lutAddress = new PublicKey('YOUR_LUT_ADDRESS_HERE');

  try {
    // 1. 获取LUT账户
    const lut = await manager.getLUT(lutAddress);

    if (!lut) {
      console.error('LUT不存在');
      return;
    }

    console.log('✅ LUT已加载');
    console.log(`包含 ${lut.state.addresses.length} 个地址\n`);

    // 2. 在交易中使用
    console.log('示例代码：');
    console.log(`
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

// 构建交易消息
const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash,
  instructions: [...],
}).compileToV0Message([lut]); // 传入LUT

// 创建版本化交易
const transaction = new VersionedTransaction(messageV0);

// LUT中的地址现在只占1字节，而不是32字节！
    `);

    console.log('🎯 效果:');
    console.log('  - 不使用LUT: 每个账户32字节');
    console.log('  - 使用LUT: 每个账户1字节');
    console.log('  - 节省: 96.9%的空间\n');
  } catch (error: any) {
    console.error('使用失败:', error.message);
  }
}

/**
 * 示例6：完整工作流
 */
async function example6_CompleteWorkflow() {
  console.log('=== 示例6: 完整工作流 ===\n');

  const connection = new Connection(clusterApiUrl('devnet'));
  const payer = Keypair.generate();
  const manager = new LUTManager(connection);

  try {
    // 步骤1: 创建LUT
    console.log('步骤1: 创建LUT...');
    const { lutAddress } = await manager.createLUT(payer);
    console.log(`✅ LUT创建: ${lutAddress.toBase58()}\n`);

    // 步骤2: 添加基础账户
    console.log('步骤2: 添加套利基础账户...');
    const basePreset = getPreset('ARBITRAGE_BASE');
    await manager.extendLUT(lutAddress, basePreset.addresses, payer);
    console.log(`✅ 添加了 ${basePreset.addresses.length} 个基础账户\n`);

    // 步骤3: 添加闪电贷账户
    console.log('步骤3: 添加闪电贷账户...');
    const flashloanPreset = getPreset('FLASHLOAN_ARBITRAGE');
    const missing = await manager.findMissingAddresses(
      lutAddress,
      flashloanPreset.addresses
    );
    
    if (missing.length > 0) {
      await manager.extendLUT(lutAddress, missing, payer);
      console.log(`✅ 添加了 ${missing.length} 个闪电贷账户\n`);
    }

    // 步骤4: 验证
    console.log('步骤4: 验证LUT...');
    const lut = await manager.getLUT(lutAddress);
    console.log(`✅ 最终包含 ${lut?.state.addresses.length} 个地址\n`);

    // 步骤5: 导出配置
    console.log('步骤5: 导出配置...');
    const config = await manager.exportLUTConfig(lutAddress);
    console.log('✅ 配置已导出，可保存到文件\n');

    // 步骤6: 冻结（可选）
    console.log('步骤6: 冻结LUT（使其不可修改）...');
    await manager.freezeLUT(lutAddress, payer, payer);
    console.log('✅ LUT已冻结\n');

    console.log('🎉 完整工作流执行成功！');
  } catch (error: any) {
    console.error('工作流失败:', error.message);
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   LUT管理器 - 使用示例                ║');
  console.log('╚═══════════════════════════════════════╝\n');

  console.log('⚠️  注意: 这些示例需要真实的RPC连接和密钥');
  console.log('         请根据实际情况修改代码\n');

  // 示例代码演示
  console.log('示例1: 创建LUT');
  console.log('示例2: 使用预设扩展');
  console.log('示例3: 查看LUT信息');
  console.log('示例4: 检查缺失地址');
  console.log('示例5: 在交易中使用');
  console.log('示例6: 完整工作流\n');

  console.log('取消注释以下代码运行示例：\n');
  
  // await example1_CreateLUT();
  // await example2_ExtendWithPreset();
  // await example3_GetLUTInfo();
  // await example4_FindMissingAddresses();
  // await example5_UseInTransaction();
  // await example6_CompleteWorkflow();
}

// 运行
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_CreateLUT,
  example2_ExtendWithPreset,
  example3_GetLUTInfo,
  example4_FindMissingAddresses,
  example5_UseInTransaction,
  example6_CompleteWorkflow,
};
