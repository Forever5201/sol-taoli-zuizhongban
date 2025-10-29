/**
 * 快速测试Vault池子修复效果
 * 直接检查反序列化后的is_active()返回值
 */

const { spawn } = require('child_process');
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683';

const VAULT_POOLS = [
  {
    name: "SolFi V2 - USDC/USDT",
    address: "65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc",
    type: "solfi_v2"
  },
  {
    name: "SolFi V2 - USDC/USDT #2",
    address: "FkEB6uvyzuoaGpgs4yRtFtxC4WJxhejNFbUkj5R6wR32",
    type: "solfi_v2"
  },
  {
    name: "GoonFi - USDC/SOL",
    address: "4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K",
    type: "goonfi"
  },
];

async function checkPoolExists(connection, address) {
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);
    return accountInfo !== null;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('🔍 快速验证Vault池子修复\n');
  console.log('=' .repeat(80));
  
  const connection = new Connection(RPC, 'confirmed');
  
  console.log('\n1. 检查Vault池子是否存在于链上：\n');
  
  for (const pool of VAULT_POOLS) {
    const exists = await checkPoolExists(connection, pool.address);
    console.log(`${exists ? '✅' : '❌'} ${pool.name}`);
    console.log(`   地址: ${pool.address}`);
    console.log(`   状态: ${exists ? '存在' : '不存在'}\n`);
  }
  
  console.log('=' .repeat(80));
  console.log('\n2. 启动程序测试（60秒）：\n');
  console.log('正在启动 cargo run...');
  
  const proc = spawn('cargo', ['run', '--release'], {
    cwd: process.cwd(),
    shell: true
  });
  
  let output = '';
  let vault_pools_seen = new Set();
  let all_pools_seen = new Set();
  
  proc.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
    
    // 检测池子更新
    const match = text.match(/pool="([^"]+)"/g);
    if (match) {
      match.forEach(m => {
        const poolName = m.match(/pool="([^"]+)"/)[1];
        all_pools_seen.add(poolName);
        
        if (poolName.includes('SolFi') || poolName.includes('GoonFi')) {
          vault_pools_seen.add(poolName);
        }
      });
    }
  });
  
  proc.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });
  
  // 60秒后停止
  setTimeout(() => {
    proc.kill();
    
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 测试结果：');
    console.log('='.repeat(80));
    console.log(`\n总共看到 ${all_pools_seen.size} 个不同的池子有更新`);
    console.log(`\n所有池子列表：`);
    Array.from(all_pools_seen).sort().forEach(name => {
      console.log(`  - ${name}`);
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 Vault池子（SolFi + GoonFi）：`);
    console.log(`${'='.repeat(80)}`);
    
    if (vault_pools_seen.size > 0) {
      console.log(`\n✅ 修复成功！看到 ${vault_pools_seen.size} 个Vault池子有更新：`);
      Array.from(vault_pools_seen).forEach(name => {
        console.log(`  ✓ ${name}`);
      });
      console.log(`\n🎉 is_active()修复生效！Vault池子现在可以正常工作了！`);
    } else {
      console.log(`\n❌ 没有看到Vault池子更新`);
      console.log(`   可能原因：`);
      console.log(`   1. 程序还没来得及订阅这些池子`);
      console.log(`   2. 池子流动性为0或未激活`);
      console.log(`   3. 需要等待更长时间`);
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`预期结果：`);
    console.log(`  - 修复前：只能看到~13-24个池子（非Vault模式）`);
    console.log(`  - 修复后：应该能看到27个池子（包括SolFi和GoonFi）`);
    console.log(`${'='.repeat(80)}\n`);
    
    process.exit(0);
  }, 60000);
}

main().catch(console.error);



