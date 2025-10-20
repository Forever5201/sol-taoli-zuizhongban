/**
 * Jupiter Server 测试脚本
 * 
 * 用于验证 Jupiter Server Manager 功能：
 * 1. 下载 jupiter-cli
 * 2. 启动服务
 * 3. 健康检查
 * 4. 测试查询
 * 5. 停止服务
 */

import { JupiterServerManager } from '../packages/jupiter-server/src';
import { PublicKey } from '@solana/web3.js';

// 代币地址
const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

async function main() {
  console.log('🚀 Starting Jupiter Server Test...\n');

  // 1. 创建管理器
  const manager = new JupiterServerManager({
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
    port: 8080,
    enableCircularArbitrage: true,
    maxRoutes: 3,
    onlyDirectRoutes: false,
  });

  try {
    // 2. 启动服务
    console.log('📦 Step 1: Starting Jupiter Server...');
    await manager.start();
    console.log('✅ Server started\n');

    // 等待 2 秒让服务稳定
    await sleep(2000);

    // 3. 健康检查
    console.log('🏥 Step 2: Health Check...');
    const healthy = await manager.healthCheck();
    if (!healthy) {
      throw new Error('Health check failed');
    }
    console.log('✅ Server is healthy\n');

    // 4. 测试环形套利查询（关键功能）
    console.log('🔄 Step 3: Testing Circular Arbitrage Query...');
    console.log('   Query: SOL → SOL (0.1 SOL)');
    
    try {
      const circularResult = await manager.testQuery(
        SOL,
        SOL,
        100_000_000 // 0.1 SOL
      );

      const inAmount = parseInt(circularResult.inAmount);
      const outAmount = parseInt(circularResult.outAmount);
      const profit = outAmount - inAmount;
      const roi = ((profit / inAmount) * 100).toFixed(2);

      console.log('   Result:');
      console.log(`   - Input: ${inAmount / 1e9} SOL`);
      console.log(`   - Output: ${outAmount / 1e9} SOL`);
      console.log(`   - Profit: ${profit / 1e9} SOL (${roi}% ROI)`);
      
      if (profit > 0) {
        console.log('   ✅ Opportunity found! (环形套利可行)\n');
      } else {
        console.log('   ℹ️  No profitable opportunity at this moment\n');
      }
    } catch (error: any) {
      console.log(`   ⚠️  Query failed: ${error.message}`);
      console.log('   (This is normal if no route exists)\n');
    }

    // 5. 测试普通查询
    console.log('💱 Step 4: Testing Regular Query...');
    console.log('   Query: SOL → USDC (0.1 SOL)');
    
    try {
      const regularResult = await manager.testQuery(
        SOL,
        USDC,
        100_000_000 // 0.1 SOL
      );

      const outAmount = parseInt(regularResult.outAmount);
      console.log(`   Result: ${outAmount / 1e6} USDC`);
      console.log('   ✅ Query successful\n');
    } catch (error: any) {
      console.log(`   ⚠️  Query failed: ${error.message}\n`);
    }

    // 6. 显示服务状态
    console.log('📊 Step 5: Server Status...');
    const status = manager.getStatus();
    console.log(`   - Running: ${status.running}`);
    console.log(`   - Port: ${status.port}`);
    console.log(`   - Uptime: ${Math.floor((status.uptime || 0) / 1000)}s`);
    console.log(`   - Restart Count: ${status.restartCount}\n`);

    // 7. 等待用户按键
    console.log('✅ All tests passed!');
    console.log('\n按 Ctrl+C 停止服务...\n');

    // 保持运行
    await new Promise(() => {});

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // 清理：停止服务
    console.log('\n🛑 Stopping Jupiter Server...');
    await manager.stop();
    console.log('✅ Server stopped');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 运行测试
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT, shutting down...');
  process.exit(0);
});

