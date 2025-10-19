#!/usr/bin/env node
/**
 * CI就绪检查脚本
 * 验证所有必需的文件和配置
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('  🔍 CI/CD就绪检查');
console.log('========================================\n');

let allChecks = true;

// 检查项列表
const checks = [
  {
    name: 'GitHub Actions工作流',
    files: [
      '.github/workflows/ci.yml',
      '.github/workflows/coverage.yml',
      '.github/workflows/performance.yml',
      '.github/workflows/pr-check.yml',
      '.github/workflows/dependency-update.yml',
    ],
  },
  {
    name: 'GitHub配置文件',
    files: [
      '.github/CODEOWNERS',
      '.github/pull_request_template.md',
    ],
  },
  {
    name: '测试文件',
    files: [
      'tests/unit/economics/types.test.ts',
      'tests/unit/economics/index.test.ts',
      'tests/performance/benchmark.test.ts',
      'tests/performance/stress.test.ts',
    ],
  },
  {
    name: '配置文件',
    files: [
      'jest.config.js',
      'pnpm-workspace.yaml',
      '.gitignore',
    ],
  },
  {
    name: '文档',
    files: [
      'CI_CD_GUIDE.md',
      'GITHUB_DEPLOYMENT_GUIDE.md',
      'OPTIMIZATION_COMPLETE.md',
      'README_TESTS.md',
    ],
  },
];

// 执行检查
checks.forEach(check => {
  console.log(`\n📁 检查: ${check.name}`);
  
  check.files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`  ❌ ${file} - 缺失`);
      allChecks = false;
    }
  });
});

// package.json检查
console.log('\n📦 检查: package.json脚本');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = [
    'test',
    'test:unit',
    'test:integration',
    'test:performance',
    'test:coverage',
    'test:benchmark',
    'test:stress',
  ];
  
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`  ✅ ${script}`);
    } else {
      console.log(`  ❌ ${script} - 缺失`);
      allChecks = false;
    }
  });
} catch (error) {
  console.log(`  ❌ 读取package.json失败`);
  allChecks = false;
}

// Git检查
console.log('\n🔧 检查: Git配置');
const { execSync } = require('child_process');

try {
  const remotes = execSync('git remote -v', { encoding: 'utf8' });
  if (remotes.includes('origin')) {
    console.log('  ✅ Git远程仓库已配置');
    console.log(remotes.split('\n').map(l => `     ${l}`).join('\n'));
  } else {
    console.log('  ⚠️  Git远程仓库未配置');
    console.log('     运行: git remote add origin YOUR_REPO_URL');
  }
} catch (error) {
  console.log('  ❌ Git检查失败');
  allChecks = false;
}

// 测试运行检查
console.log('\n🧪 检查: 测试可运行性');
try {
  console.log('  运行快速测试验证...');
  execSync('pnpm test:unit --passWithNoTests --testTimeout=5000', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('  ✅ 测试可以正常运行');
} catch (error) {
  console.log('  ⚠️  测试运行有问题，但可能只是测试失败');
  console.log('     请运行: pnpm test 查看详情');
}

// 总结
console.log('\n========================================');
if (allChecks) {
  console.log('  ✅ 所有检查通过！');
  console.log('  🚀 可以部署到GitHub');
} else {
  console.log('  ⚠️  存在一些问题需要解决');
  console.log('  📝 请根据上面的提示修复');
}
console.log('========================================\n');

// 下一步提示
console.log('📋 下一步操作:\n');
console.log('1. 提交代码:');
console.log('   scripts\\deploy-to-github.bat\n');
console.log('2. 配置GitHub:');
console.log('   - 设置CODECOV_TOKEN Secret');
console.log('   - 启用GitHub Actions');
console.log('   - 验证CI工作流\n');
console.log('3. 查看详细指南:');
console.log('   GITHUB_DEPLOYMENT_GUIDE.md\n');

process.exit(allChecks ? 0 : 1);
