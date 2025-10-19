// 快速验证测试环境
console.log('=== 测试环境验证 ===\n');

// 1. 检查核心模块加载
try {
  const { BASE_FEE_PER_SIGNATURE } = require('./packages/core/src/economics/types');
  console.log('✅ 类型模块加载成功');
  console.log('   BASE_FEE_PER_SIGNATURE:', BASE_FEE_PER_SIGNATURE);
} catch (e) {
  console.log('❌ 类型模块加载失败:', e.message);
}

// 2. 检查Jest
try {
  const jest = require('jest');
  console.log('✅ Jest已安装，版本:', require('jest/package.json').version);
} catch (e) {
  console.log('❌ Jest未安装');
}

// 3. 检查ts-jest
try {
  require('ts-jest');
  console.log('✅ ts-jest已安装');
} catch (e) {
  console.log('❌ ts-jest未安装');
}

// 4. 检查测试文件
const fs = require('fs');
const testFiles = [
  './tests/unit/economics/cost-calculator.test.ts',
  './tests/unit/economics/circuit-breaker.test.ts',
  './tests/integration/economics-system.test.ts'
];

console.log('\n测试文件检查:');
testFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(exists ? '✅' : '❌', file);
});

console.log('\n=== 验证完成 ===');
