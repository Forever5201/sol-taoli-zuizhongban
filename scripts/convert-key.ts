/**
 * 私钥格式转换工具
 * 将 Base58 格式私钥转换为字节数组格式
 */

import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';

// 从命令行获取 Base58 私钥
const base58PrivateKey = process.argv[2];

if (!base58PrivateKey) {
  console.log('');
  console.log('使用方法：');
  console.log('  pnpm tsx scripts/convert-key.ts YOUR_BASE58_PRIVATE_KEY');
  console.log('');
  console.log('示例：');
  console.log('  pnpm tsx scripts/convert-key.ts Fwh3ZVguNdXL...');
  console.log('');
  process.exit(1);
}

try {
  console.log('');
  console.log('='.repeat(60));
  console.log('私钥格式转换工具');
  console.log('='.repeat(60));
  console.log('');
  
  // 转换为字节数组
  const secretKey = bs58.decode(base58PrivateKey);
  const secretKeyArray = Array.from(secretKey);
  
  console.log('✅ 转换成功！');
  console.log('');
  console.log('原格式 (Base58):');
  console.log(base58PrivateKey);
  console.log('');
  console.log('新格式 (字节数组):');
  console.log(JSON.stringify(secretKeyArray));
  console.log('');
  
  // 保存到文件
  const outputPath = path.join(process.cwd(), 'keypairs', 'flashloan-wallet.json');
  fs.writeFileSync(outputPath, JSON.stringify(secretKeyArray));
  
  console.log('✅ 已保存到文件:');
  console.log(outputPath);
  console.log('');
  
  // 验证
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  
  console.log('✅ 验证成功！');
  console.log('');
  console.log('钱包地址:');
  console.log(keypair.publicKey.toBase58());
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ 配置完成！下一步：');
  console.log('');
  console.log('1. 充值钱包地址（上面显示的地址）');
  console.log('   最少: 0.1 SOL');
  console.log('   推荐: 0.5 SOL');
  console.log('');
  console.log('2. 修改 .env 文件:');
  console.log('   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com');
  console.log('   DEFAULT_KEYPAIR_PATH=./keypairs/flashloan-wallet.json');
  console.log('');
  console.log('3. 启动机器人:');
  console.log('   pnpm start:onchain-bot');
  console.log('');
  
} catch (error: any) {
  console.error('');
  console.error('❌ 转换失败:', error.message);
  console.error('');
  console.error('请检查：');
  console.error('1. 私钥格式是否正确（Base58 字符串）');
  console.error('2. 是否复制完整（88 个字符）');
  console.error('3. 没有多余的空格或换行');
  console.error('');
  process.exit(1);
}
