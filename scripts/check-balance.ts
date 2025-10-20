/**
 * 查询钱包余额工具
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';

const WALLET_PATH = './keypairs/flashloan-wallet.json';

async function checkBalance() {
  console.log('');
  console.log('='.repeat(60));
  console.log('查询钱包余额');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 读取钱包
    const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
    console.log('密钥长度:', secretKey.length, '字节');
    
    if (secretKey.length !== 64) {
      throw new Error(`密钥长度错误: ${secretKey.length} 字节 (应该是 64 字节)`);
    }
    
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const publicKey = keypair.publicKey;

    console.log('钱包地址：');
    console.log(publicKey.toBase58());
    console.log('');

    // 查询主网余额
    console.log('查询主网余额...');
    const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    try {
      const mainnetBalance = await mainnetConnection.getBalance(publicKey);
      const mainnetSOL = mainnetBalance / LAMPORTS_PER_SOL;
      
      console.log('✅ 主网余额:', mainnetSOL.toFixed(9), 'SOL');
      
      if (mainnetBalance > 0) {
        console.log('   =', (mainnetBalance).toLocaleString(), 'lamports');
      }
    } catch (error: any) {
      console.log('❌ 主网查询失败:', error.message);
    }
    
    console.log('');

    // 查询测试网余额
    console.log('查询测试网余额...');
    const devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    try {
      const devnetBalance = await devnetConnection.getBalance(publicKey);
      const devnetSOL = devnetBalance / LAMPORTS_PER_SOL;
      
      console.log('✅ 测试网余额:', devnetSOL.toFixed(9), 'SOL');
      
      if (devnetBalance > 0) {
        console.log('   =', (devnetBalance).toLocaleString(), 'lamports');
      }
    } catch (error: any) {
      console.log('❌ 测试网查询失败:', error.message);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('在线查询链接：');
    console.log(`https://solscan.io/account/${publicKey.toBase58()}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkBalance();
