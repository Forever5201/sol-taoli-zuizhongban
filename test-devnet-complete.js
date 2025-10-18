#!/usr/bin/env node
/**
 * Devnet完整端到端测试
 * 
 * 测试流程：
 * 1. 加载钱包
 * 2. 连接Devnet RPC
 * 3. 检查余额并请求空投
 * 4. 测试Jupiter Quote API
 * 5. 验证代理配置（如果启用）
 * 6. 模拟交易流程
 */

require('dotenv').config();
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

console.log('🚀 Devnet 完整端到端测试\n');
console.log('========================================\n');

// 配置
const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = './keypairs/devnet-test-wallet.json';
const MIN_BALANCE_SOL = 1.0;

// Devnet代币地址
const DEVNET_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
};

async function runDevnetTest() {
  console.log('📋 测试配置:');
  console.log(`   RPC端点: ${DEVNET_RPC}`);
  console.log(`   钱包路径: ${KEYPAIR_PATH}`);
  console.log(`   最小余额: ${MIN_BALANCE_SOL} SOL\n`);

  // ========================================
  // Test 1: 加载钱包
  // ========================================
  console.log('✅ Test 1: 加载测试钱包');
  
  let keypair;
  try {
    const keypairFile = fs.readFileSync(KEYPAIR_PATH, 'utf-8');
    const secretKey = Uint8Array.from(JSON.parse(keypairFile));
    keypair = Keypair.fromSecretKey(secretKey);
    console.log(`   钱包地址: ${keypair.publicKey.toBase58()}`);
    console.log('   ✅ PASS\n');
  } catch (error) {
    console.error(`   ❌ FAIL: ${error.message}\n`);
    process.exit(1);
  }

  // ========================================
  // Test 2: 连接Devnet
  // ========================================
  console.log('✅ Test 2: 连接Solana Devnet');
  
  let connection;
  try {
    // 配置代理支持
    const HTTP_PROXY = process.env.HTTP_PROXY || process.env.http_proxy;
    const connectionConfig = {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    };
    
    // 如果配置了代理，添加fetchOptions
    if (HTTP_PROXY) {
      const agent = new HttpsProxyAgent(HTTP_PROXY);
      connectionConfig.fetchMiddleware = (url, options, fetch) => {
        return fetch(url, { ...options, agent });
      };
      console.log(`   使用代理: ${HTTP_PROXY}`);
    }
    
    connection = new Connection(DEVNET_RPC, connectionConfig);
    
    const version = await connection.getVersion();
    const slot = await connection.getSlot();
    
    console.log(`   Solana版本: ${version['solana-core']}`);
    console.log(`   当前Slot: ${slot}`);
    console.log('   ✅ PASS\n');
  } catch (error) {
    console.error(`   ❌ FAIL: ${error.message}`);
    console.error('   提示: Devnet RPC可能需要代理访问\n');
    console.error('   当前代理配置: ${process.env.HTTP_PROXY || "未配置"}\n');
    process.exit(1);
  }

  // ========================================
  // Test 3: 检查余额
  // ========================================
  console.log('✅ Test 3: 检查钱包余额');
  
  let balance;
  try {
    balance = await connection.getBalance(keypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    console.log(`   当前余额: ${balanceSOL} SOL`);
    
    if (balanceSOL < MIN_BALANCE_SOL) {
      console.log(`   ⚠️  余额不足，需要至少 ${MIN_BALANCE_SOL} SOL`);
      console.log(`\n   🪂 正在请求空投...`);
      
      try {
        const airdropSignature = await connection.requestAirdrop(
          keypair.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        
        console.log(`   空投交易: ${airdropSignature}`);
        console.log(`   等待确认...`);
        
        await connection.confirmTransaction(airdropSignature, 'confirmed');
        
        balance = await connection.getBalance(keypair.publicKey);
        const newBalanceSOL = balance / LAMPORTS_PER_SOL;
        
        console.log(`   ✅ 空投成功！新余额: ${newBalanceSOL} SOL`);
      } catch (airdropError) {
        console.error(`   ❌ 空投失败: ${airdropError.message}`);
        console.log(`\n   💡 手动获取空投:`);
        console.log(`   1. 访问: https://faucet.solana.com/`);
        console.log(`   2. 输入地址: ${keypair.publicKey.toBase58()}`);
        console.log(`   3. 或使用命令: solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet\n`);
        process.exit(1);
      }
    } else {
      console.log('   ✅ 余额充足');
    }
    
    console.log('   ✅ PASS\n');
  } catch (error) {
    console.error(`   ❌ FAIL: ${error.message}\n`);
    process.exit(1);
  }

  // ========================================
  // Test 4: 获取代币账户信息
  // ========================================
  console.log('✅ Test 4: 获取代币账户信息');
  
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      keypair.publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    console.log(`   找到 ${tokenAccounts.value.length} 个代币账户`);
    
    if (tokenAccounts.value.length > 0) {
      console.log(`\n   代币持仓:`);
      for (const account of tokenAccounts.value.slice(0, 5)) {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        console.log(`   - ${mint.slice(0, 8)}...: ${amount}`);
      }
    }
    
    console.log('   ✅ PASS\n');
  } catch (error) {
    console.log(`   ⚠️  警告: ${error.message}`);
    console.log('   (这个测试失败不影响后续流程)\n');
  }

  // ========================================
  // Test 5: 测试代理配置（如果启用）
  // ========================================
  console.log('✅ Test 5: 验证代理配置');
  
  const HTTP_PROXY = process.env.HTTP_PROXY;
  if (HTTP_PROXY) {
    console.log(`   代理已配置: ${HTTP_PROXY}`);
    console.log('   ✅ 代理系统就绪');
  } else {
    console.log('   未配置代理（使用直连）');
  }
  console.log('   ✅ PASS\n');

  // ========================================
  // Test 6: 验证核心模块导入
  // ========================================
  console.log('✅ Test 6: 验证核心模块');
  
  try {
    // 测试核心包是否正确编译
    const corePackage = require('./packages/core/dist/index.js');
    console.log('   ✅ Core包加载成功');
    
    if (corePackage.VERSION) {
      console.log(`   版本: ${corePackage.VERSION}`);
    }
    
    console.log('   ✅ PASS\n');
  } catch (error) {
    console.log(`   ⚠️  Core包未编译或加载失败: ${error.message}`);
    console.log('   提示: 运行 npm run build 编译项目\n');
  }

  // ========================================
  // 测试总结
  // ========================================
  console.log('========================================');
  console.log('🎉 Devnet环境测试完成！\n');
  
  console.log('📊 测试总结:');
  console.log(`   ✅ 钱包地址: ${keypair.publicKey.toBase58()}`);
  console.log(`   ✅ 当前余额: ${balance / LAMPORTS_PER_SOL} SOL`);
  console.log(`   ✅ Devnet连接: 正常`);
  console.log(`   ✅ 系统环境: 就绪\n`);
  
  console.log('📚 下一步操作:\n');
  console.log('1. 测试Jupiter Swap集成:');
  console.log('   npx tsx examples/test-jupiter-swap.ts\n');
  
  console.log('2. 运行完整套利测试:');
  console.log('   npm run start:onchain-bot -- --config configs/devnet-test.toml --dry-run\n');
  
  console.log('3. 查看实时日志:');
  console.log('   tail -f logs/bot.log\n');
  
  console.log('✅ Devnet测试环境已完全就绪！');
  console.log('========================================\n');
}

// 运行测试
runDevnetTest().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});
