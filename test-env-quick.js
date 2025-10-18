#!/usr/bin/env node
/**
 * 快速环境测试 - 验证核心依赖
 */

console.log('🧪 ========== 环境快速测试 ==========\n');

// 测试1: Node版本
console.log('✅ Test 1: Node Version');
console.log(`   Node: ${process.version}`);
console.log(`   要求: >= v20.0.0`);

if (process.version.match(/v(\d+)/)[1] < 20) {
  console.log('   ❌ Node版本过低，请升级到v20或更高');
  process.exit(1);
}
console.log('   ✅ PASS\n');

// 测试2: 必需的npm包
console.log('✅ Test 2: Required Packages');
const requiredPackages = [
  '@solana/web3.js',
  'axios',
  'bottleneck',
];

let allPackagesPresent = true;
for (const pkg of requiredPackages) {
  try {
    require.resolve(pkg);
    console.log(`   ✅ ${pkg}`);
  } catch (e) {
    console.log(`   ❌ ${pkg} - 未安装`);
    allPackagesPresent = false;
  }
}

if (!allPackagesPresent) {
  console.log('\n❌ 缺少必需的包，请运行: npm install');
  process.exit(1);
}
console.log('   ✅ PASS\n');

// 测试3: 基础Solana连接
console.log('✅ Test 3: Solana Connection');
(async () => {
  try {
    const { Connection } = require('@solana/web3.js');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const slot = await connection.getSlot();
    console.log(`   Current Slot: ${slot}`);
    console.log('   ✅ PASS\n');
    
    console.log('========================================');
    console.log('🎉 所有测试通过！环境配置正确。');
    console.log('========================================\n');
    console.log('下一步：运行Jupiter集成测试');
    console.log('命令: npx tsx examples/test-jupiter-swap.ts\n');
    
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    console.log('\n❌ Solana连接失败');
    process.exit(1);
  }
})();
