#!/usr/bin/env node
/**
 * Devnet测试 - 使用替代RPC端点
 */

require('dotenv').config();
const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');

console.log('🚀 Devnet测试 - 替代RPC方案\n');

const KEYPAIR_PATH = './keypairs/devnet-test-wallet.json';

// 多个Devnet RPC端点（按优先级）
const RPC_ENDPOINTS = [
  'https://api.devnet.solana.com',
  'https://rpc-devnet.helius.xyz/?api-key=public',
  'https://rpc.ankr.com/solana_devnet',
];

async function testWithMultipleRPC() {
  // 加载钱包
  console.log('✅ 加载测试钱包');
  const keypairFile = fs.readFileSync(KEYPAIR_PATH, 'utf-8');
  const secretKey = Uint8Array.from(JSON.parse(keypairFile));
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log(`   地址: ${keypair.publicKey.toBase58()}\n`);

  // 尝试每个RPC端点
  for (const rpcUrl of RPC_ENDPOINTS) {
    console.log(`🔍 测试RPC: ${rpcUrl}`);
    
    try {
      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 10000,
      });

      // 快速测试
      const slot = await connection.getSlot();
      console.log(`   ✅ 成功！当前Slot: ${slot}`);
      
      // 获取余额
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      console.log(`   💰 余额: ${balanceSOL} SOL\n`);
      
      console.log('========================================');
      console.log(`🎉 找到可用的RPC端点！`);
      console.log(`\n推荐配置:`);
      console.log(`DEVNET_RPC=${rpcUrl}\n`);
      
      return { rpcUrl, connection, keypair, balance };
      
    } catch (error) {
      console.log(`   ❌ 失败: ${error.message}\n`);
      continue;
    }
  }

  console.log('❌ 所有RPC端点都无法连接');
  console.log('\n💡 这是网络环境问题，不是代码问题');
  console.log('建议:');
  console.log('1. 检查Clash的TUN模式设置');
  console.log('2. 尝试切换Clash节点');
  console.log('3. 使用VPS进行实际测试');
  console.log('4. 等待网络恢复后再试\n');
  
  return null;
}

testWithMultipleRPC().catch(console.error);
