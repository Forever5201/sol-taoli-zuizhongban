#!/usr/bin/env node
/**
 * 直接运行Jest测试，绕过npm workspace
 */

const { execSync } = require('child_process');
const path = require('path');

// 确保在项目根目录
process.chdir(__dirname);

console.log('🚀 运行测试套件...\n');
console.log('工作目录:', __dirname);
console.log('Jest配置:', path.join(__dirname, 'jest.config.js'), '\n');

try {
  // 直接运行Jest，使用绝对路径
  const jestPath = path.join(__dirname, 'node_modules', '.bin', 'jest');
  const configPath = path.join(__dirname, 'jest.config.js');
  
  const args = process.argv.slice(2);
  const command = `"${jestPath}" --config="${configPath}" ${args.join(' ')}`;
  
  console.log('执行命令:', command, '\n');
  
  execSync(command, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  console.log('\n✅ 测试完成！');
} catch (error) {
  console.error('\n❌ 测试失败');
  process.exit(1);
}
