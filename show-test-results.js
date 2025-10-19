const { execSync } = require('child_process');

console.log('🧪 运行测试...\n');

try {
  const output = execSync('pnpm test --no-coverage', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
} catch (error) {
  const output = error.stdout || error.stderr || error.message;
  
  // 提取关键信息
  const lines = output.split('\n');
  let inFailure = false;
  
  console.log('\n=== 测试结果摘要 ===\n');
  
  for (const line of lines) {
    if (line.includes('FAIL') || line.includes('PASS')) {
      console.log(line);
    }
    if (line.includes('Test Suites:') || line.includes('Tests:')) {
      console.log(line);
    }
    if (line.includes('Cannot find module')) {
      inFailure = true;
    }
    if (inFailure && line.trim()) {
      console.log('  ', line);
      if (line.includes('at ')) inFailure = false;
    }
  }
}
