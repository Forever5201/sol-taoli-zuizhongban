// 简单的环境验证脚本
console.log('========================================');
console.log(' 环境验证测试');
console.log('========================================\n');

// 1. Node版本
console.log('[1/5] Node.js版本:', process.version);

// 2. 检查依赖
console.log('[2/5] 检查依赖...');
try {
  require('@solana/web3.js');
  console.log('  ✅ @solana/web3.js');
} catch (e) {
  console.log('  ❌ @solana/web3.js 未安装');
}

try {
  require('toml');
  console.log('  ✅ toml');
} catch (e) {
  console.log('  ❌ toml 未安装');
}

try {
  require('pino');
  console.log('  ✅ pino');
} catch (e) {
  console.log('  ❌ pino 未安装');
}

// 3. 检查TypeScript
console.log('[3/5] 检查TypeScript...');
try {
  require('typescript');
  console.log('  ✅ typescript');
} catch (e) {
  console.log('  ❌ typescript 未安装');
}

// 4. 检查tsx
console.log('[4/5] 检查tsx运行时...');
try {
  require('tsx');
  console.log('  ✅ tsx');
} catch (e) {
  console.log('  ❌ tsx 未安装');
}

// 5. 项目结构
console.log('[5/5] 检查项目结构...');
const fs = require('fs');
const path = require('path');

const checks = [
  'packages/core/src',
  'packages/onchain-bot/src',
  'packages/core/package.json',
  'packages/onchain-bot/package.json',
];

checks.forEach(check => {
  const fullPath = path.join(__dirname, check);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${check}`);
  } else {
    console.log(`  ❌ ${check} 不存在`);
  }
});

console.log('\n========================================');
console.log(' 验证完成！');
console.log('========================================\n');

console.log('下一步：');
console.log('1. 运行: npm run cost-sim');
console.log('2. 配置: copy .env.example .env');
console.log('3. 测试: npm run start:onchain-bot');
