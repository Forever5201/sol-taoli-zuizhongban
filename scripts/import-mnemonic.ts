/**
 * 从助记词导入钱包
 * 无需安装 Solana CLI
 */

import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import * as fs from 'fs';
import * as path from 'path';

console.log('');
console.log('='.repeat(60));
console.log('从助记词导入钱包');
console.log('='.repeat(60));
console.log('');

// 从命令行获取助记词
const mnemonic = process.argv.slice(2).join(' ');

if (!mnemonic || mnemonic.split(' ').length !== 12) {
  console.log('使用方法：');
  console.log('  pnpm tsx scripts/import-mnemonic.ts word1 word2 word3 ... word12');
  console.log('');
  console.log('示例：');
  console.log('  pnpm tsx scripts/import-mnemonic.ts apple banana cherry dog elephant fish game house ink jump king lion');
  console.log('');
  console.log('⚠️ 请提供 12 个单词的助记词（用空格分隔）');
  console.log('');
  process.exit(1);
}

try {
  console.log('助记词：');
  console.log(mnemonic);
  console.log('');
  
  // 验证助记词
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('助记词格式不正确，请检查单词拼写');
  }
  
  console.log('✅ 助记词验证通过');
  console.log('');
  
  // 从助记词生成种子
  const seed = bip39.mnemonicToSeedSync(mnemonic, '');
  
  // 使用 Solana 标准派生路径
  const path44 = `m/44'/501'/0'/0'`;
  const derivedSeed = derivePath(path44, seed.toString('hex')).key;
  
  // 创建密钥对
  const keypair = Keypair.fromSeed(derivedSeed);
  
  // 转换为字节数组
  const secretKeyArray = Array.from(keypair.secretKey);
  
  console.log('✅ 钱包生成成功！');
  console.log('');
  console.log('钱包地址：');
  console.log(keypair.publicKey.toBase58());
  console.log('');
  
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
  console.log('1. 充值钱包地址（上面显示的地址）');
  console.log('   最少: 0.1 SOL ($15)');
  console.log('   推荐: 0.5 SOL ($75)');
  console.log('');
  console.log('2. 修改 .env 文件：');
  console.log('   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com');
  console.log('   DEFAULT_KEYPAIR_PATH=./keypairs/flashloan-wallet.json');
  console.log('');
  console.log('3. 启动机器人：');
  console.log('   pnpm start:onchain-bot');
  console.log('');
  
} catch (error: any) {
  console.error('');
  console.error('❌ 导入失败:', error.message);
  console.error('');
  console.error('请检查：');
  console.error('1. 助记词是否正确（12 个单词）');
  console.error('2. 单词拼写是否正确');
  console.error('3. 单词之间用空格分隔');
  console.error('4. 没有多余的标点符号');
  console.error('');
  process.exit(1);
}
