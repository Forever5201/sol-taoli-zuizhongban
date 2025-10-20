/**
 * 闪电贷机器人启动前检查
 * 
 * 检查所有依赖、配置和文件是否就绪
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║   闪电贷机器人 - 启动前检查               ║');
console.log('╚═══════════════════════════════════════════╝\n');

let allChecks = true;

function check(name, fn) {
  process.stdout.write(`[${name}] 检查中...`);
  try {
    const result = fn();
    if (result === true) {
      console.log(' ✅ 通过');
      return true;
    } else {
      console.log(` ❌ 失败`);
      if (result) console.log(`   ${result}`);
      allChecks = false;
      return false;
    }
  } catch (error) {
    console.log(` ❌ 失败`);
    console.log(`   错误: ${error.message}`);
    allChecks = false;
    return false;
  }
}

// 1. 检查 Node.js 版本
check('Node.js 版本', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major >= 20) {
    return true;
  } else {
    return `当前版本: ${version}, 需要: >=20.0.0`;
  }
});

// 2. 检查 pnpm
check('pnpm', () => {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return '请安装 pnpm: npm install -g pnpm';
  }
});

// 3. 检查钱包文件
check('钱包文件', () => {
  const walletPath = path.join(__dirname, 'keypairs', 'flashloan-wallet.json');
  if (fs.existsSync(walletPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      if (Array.isArray(content) && content.length === 64) {
        return true;
      } else {
        return '钱包文件格式不正确';
      }
    } catch (error) {
      return '钱包文件无法解析';
    }
  } else {
    return '钱包文件不存在: keypairs/flashloan-wallet.json';
  }
});

// 4. 检查配置文件
check('配置文件', () => {
  const configPath = path.join(__dirname, 'configs', 'flashloan-serverchan.toml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    // 检查关键配置项
    if (content.includes('send_key') && 
        content.includes('flashloan') && 
        content.includes('jito')) {
      return true;
    } else {
      return '配置文件缺少必需字段';
    }
  } else {
    return '配置文件不存在: configs/flashloan-serverchan.toml';
  }
});

// 5. 检查代币列表文件
check('代币列表', () => {
  const mintsPath = path.join(__dirname, 'mints-high-liquidity.txt');
  if (fs.existsSync(mintsPath)) {
    const content = fs.readFileSync(mintsPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    if (lines.length > 0) {
      return true;
    } else {
      return '代币列表为空';
    }
  } else {
    return '代币列表文件不存在: mints-high-liquidity.txt';
  }
});

// 6. 检查 node_modules
check('依赖安装', () => {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    // 检查关键依赖
    const criticalDeps = [
      '@solana/web3.js',
      '@solana/spl-token',
      'axios',
      'toml',
    ];
    
    for (const dep of criticalDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (!fs.existsSync(depPath)) {
        return `缺少依赖: ${dep}`;
      }
    }
    return true;
  } else {
    return '请先运行: pnpm install';
  }
});

// 7. 检查构建文件
check('项目构建', () => {
  const distPaths = [
    path.join(__dirname, 'packages', 'core', 'dist'),
    path.join(__dirname, 'packages', 'onchain-bot', 'dist'),
  ];
  
  let allBuilt = true;
  for (const distPath of distPaths) {
    if (!fs.existsSync(distPath)) {
      allBuilt = false;
      break;
    }
  }
  
  if (allBuilt) {
    return true;
  } else {
    return '请先运行: pnpm build';
  }
});

// 8. 检查闪电贷核心文件
check('闪电贷核心代码', () => {
  const flashloanFiles = [
    'packages/core/src/flashloan/index.ts',
    'packages/core/src/flashloan/solend-adapter.ts',
    'packages/core/src/flashloan/transaction-builder.ts',
    'packages/jupiter-bot/src/flashloan-bot.ts',
  ];
  
  for (const file of flashloanFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      return `缺少文件: ${file}`;
    }
  }
  return true;
});

// 9. 检查 Server酱配置
check('Server酱配置', () => {
  const configPath = path.join(__dirname, 'configs', 'flashloan-serverchan.toml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    // 检查是否有有效的 send_key
    const sendKeyMatch = content.match(/send_key\s*=\s*"([^"]+)"/);
    if (sendKeyMatch && sendKeyMatch[1] !== 'YOUR_SENDKEY_HERE') {
      return true;
    } else {
      return 'Server酱 SendKey 未配置';
    }
  }
  return '配置文件不存在';
});

// 10. 检查启动脚本
check('启动脚本', () => {
  const scripts = [
    'start-flashloan-bot.bat',
    'start-flashloan-bot.sh',
  ];
  
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    if (!fs.existsSync(scriptPath)) {
      return `缺少脚本: ${script}`;
    }
  }
  return true;
});

console.log('\n' + '═'.repeat(45));

if (allChecks) {
  console.log('\n🎉 所有检查通过！机器人已就绪！\n');
  console.log('下一步：');
  console.log('  1. 查看配置: configs/flashloan-serverchan.toml');
  console.log('  2. 测试 Server酱: node test-serverchan-simple.js');
  console.log('  3. 模拟运行: 设置 dry_run = true');
  console.log('  4. 启动机器人:');
  console.log('     Windows: start-flashloan-bot.bat');
  console.log('     Linux/Mac: ./start-flashloan-bot.sh\n');
} else {
  console.log('\n❌ 部分检查失败，请修复上述问题后重试\n');
  console.log('常见解决方案：');
  console.log('  - 运行 pnpm install 安装依赖');
  console.log('  - 运行 pnpm build 构建项目');
  console.log('  - 检查钱包文件格式是否正确');
  console.log('  - 配置 Server酱 SendKey\n');
  process.exit(1);
}

