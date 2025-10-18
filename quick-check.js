// 快速环境检查
const fs = require('fs');
const path = require('path');

console.log('\n=== 快速环境检查 ===\n');

// Node版本
console.log('✅ Node.js:', process.version);

// 检查node_modules
const checks = {
  '根目录依赖': 'node_modules',
  'Core包依赖': 'packages/core/node_modules',
  'OnChain-Bot依赖': 'packages/onchain-bot/node_modules',
  'Core源码': 'packages/core/src',
  'OnChain-Bot源码': 'packages/onchain-bot/src',
};

console.log('\n文件结构检查:');
Object.entries(checks).forEach(([name, dir]) => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`${exists ? '✅' : '❌'} ${name}: ${dir}`);
});

// 统计依赖数量
const rootModules = fs.existsSync('node_modules') 
  ? fs.readdirSync('node_modules').filter(f => !f.startsWith('.')).length 
  : 0;

console.log(`\n依赖统计:`);
console.log(`  根目录: ${rootModules} 个包`);

console.log('\n=== 环境就绪！ ===\n');
console.log('可用命令:');
console.log('  npm run build        (构建项目)');
console.log('  npm run cost-sim     (成本模拟器)');
console.log('  npm run jito-monitor (Jito监控)');
console.log('');
