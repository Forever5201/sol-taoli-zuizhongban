/**
 * 私钥格式转换工具
 * 将 Base58 格式私钥转换为字节数组格式
 */

const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

// 从命令行获取 Base58 私钥
const base58PrivateKey = process.argv[2];

if (!base58PrivateKey) {
  console.log('');
  console.log('使用方法：');
  console.log('  node scripts/convert-private-key.js YOUR_BASE58_PRIVATE_KEY');
  console.log('');
  console.log('示例：');
  console.log('  node scripts/convert-private-key.js Fwh3ZVguNdXL...');
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
  const outputPath = path.join(__dirname, '..', 'keypairs', 'flashloan-wallet.json');
  fs.writeFileSync(outputPath, JSON.stringify(secretKeyArray));
  
  console.log('✅ 已保存到文件:');
  console.log(outputPath);
  console.log('');
  
  // 验证
  const { Keypair } = require('@solana/web3.js');
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  
  console.log('✅ 验证成功！');
  console.log('');
  console.log('钱包地址:');
  console.log(keypair.publicKey.toBase58());
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('下一步：');
  console.log('1. 修改 .env 文件中的 SOLANA_RPC_URL');
  console.log('2. 确保 DEFAULT_KEYPAIR_PATH=./keypairs/flashloan-wallet.json');
  console.log('3. 充值钱包地址（至少 0.1 SOL）');
  console.log('4. 运行: pnpm start:onchain-bot');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('❌ 转换失败:', error.message);
  console.error('');
  console.error('请检查：');
  console.error('1. 私钥格式是否正确');
  console.error('2. 是否复制完整（88 个字符）');
  console.error('3. 没有多余的空格或换行');
  console.error('');
  process.exit(1);
}
