#!/usr/bin/env node
/**
 * 生成Devnet测试钱包
 */

const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

console.log('🔑 生成Devnet测试钱包\n');

// 生成新的密钥对
const keypair = Keypair.generate();

// 保存到文件
const keypairPath = path.join(__dirname, '..', 'keypairs', 'devnet-test-wallet.json');
const secretKeyArray = Array.from(keypair.secretKey);

fs.writeFileSync(
  keypairPath,
  JSON.stringify(secretKeyArray),
  'utf-8'
);

console.log('✅ 钱包已生成！');
console.log(`\n📁 保存位置: ${keypairPath}`);
console.log(`\n🔑 公钥地址: ${keypair.publicKey.toBase58()}`);
console.log(`\n💰 下一步: 获取Devnet SOL空投`);
console.log(`命令: solana airdrop 5 ${keypair.publicKey.toBase58()} --url devnet`);
console.log(`\n或使用网页水龙头: https://faucet.solana.com/`);
console.log(`\n⚠️  注意: 这是测试钱包，请勿用于主网！\n`);
