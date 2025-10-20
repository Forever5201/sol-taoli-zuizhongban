/**
 * 从 Base58 私钥导入钱包
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

console.log('');
console.log('='.repeat(60));
console.log('从私钥导入钱包');
console.log('='.repeat(60));
console.log('');

// 从命令行获取私钥
const privateKeyBase58 = process.argv[2];

if (!privateKeyBase58) {
  console.log('使用方法：');
  console.log('  pnpm tsx scripts/import-private-key.ts <BASE58_PRIVATE_KEY>');
  console.log('');
  console.log('示例：');
  console.log('  pnpm tsx scripts/import-private-key.ts 5Kb8kLf9io...');
  console.log('');
  process.exit(1);
}

try {
  console.log('私钥长度：', privateKeyBase58.length, '个字符');
  console.log('');
  
  // 解码 Base58 私钥
  const decoded = bs58.decode(privateKeyBase58);
  console.log('解码后长度：', decoded.length, '字节');
  console.log('');
  
  let secretKey: Uint8Array;
  
  if (decoded.length === 64) {
    // 完整的 64 字节密钥对
    secretKey = decoded;
    console.log('✅ 检测到完整密钥对（64 字节）');
  } else if (decoded.length === 32) {
    // 仅私钥部分（32 字节）
    console.log('⚠️  检测到 32 字节私钥，需要生成完整密钥对');
    const keypair = Keypair.fromSeed(decoded);
    secretKey = keypair.secretKey;
  } else {
    throw new Error(`不支持的密钥长度: ${decoded.length} 字节`);
  }
  
  // 创建密钥对
  const keypair = Keypair.fromSecretKey(secretKey);
  
  console.log('');
  console.log('✅ 钱包导入成功！');
  console.log('');
  console.log('钱包地址：');
  console.log(keypair.publicKey.toBase58());
  console.log('');
  
  // 转换为字节数组
  const secretKeyArray = Array.from(keypair.secretKey);
  
  // 保存到文件
  const outputPath = path.join(process.cwd(), 'keypairs', 'flashloan-wallet.json');
  fs.writeFileSync(outputPath, JSON.stringify(secretKeyArray));
  
  console.log('✅ 已保存到文件：');
  console.log(outputPath);
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ 配置完成！下一步：');
  console.log('');
  console.log('1. 查询余额：');
  console.log('   pnpm tsx scripts/check-balance.ts');
  console.log('');
  console.log('2. 启动机器人：');
  console.log('   pnpm start:onchain-bot');
  console.log('');
  
} catch (error: any) {
  console.error('');
  console.error('❌ 导入失败:', error.message);
  console.error('');
  console.error('可能的原因：');
  console.error('1. 私钥格式不正确');
  console.error('2. 不是有效的 Base58 字符串');
  console.error('3. 长度不对（应该是 64 或 32 字节解码后）');
  console.error('');
  process.exit(1);
}
