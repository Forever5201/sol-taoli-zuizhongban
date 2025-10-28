#!/usr/bin/env node
/**
 * Pool Configuration Validator
 * 
 * 验证 config-expanded.toml：
 * 1. TOML 语法正确性
 * 2. 池子地址重复检查
 * 3. 地址格式验证（Solana 地址格式）
 * 4. 统计报告
 */

import * as fs from 'fs';
import * as path from 'path';

interface Pool {
  address: string;
  name: string;
  lineNumber: number;
}

function isValidSolanaAddress(address: string): boolean {
  // Solana 地址是 Base58 编码，长度通常为 32-44 个字符
  // 包含字符：1-9, A-Z, a-z（不包含 0, O, I, l）
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

function parseTomlConfig(configPath: string): { pools: Pool[]; errors: string[] } {
  const content = fs.readFileSync(configPath, 'utf-8');
  const lines = content.split('\n');
  
  const pools: Pool[] = [];
  const errors: string[] = [];
  
  let currentPool: Partial<Pool> = {};
  let inPoolsSection = false;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    
    // 检测 [[pools]] 块
    if (trimmed === '[[pools]]') {
      inPoolsSection = true;
      if (currentPool.address && currentPool.name) {
        pools.push(currentPool as Pool);
      }
      currentPool = { lineNumber };
    } else if (inPoolsSection && trimmed.startsWith('address = ')) {
      const match = trimmed.match(/address\s*=\s*"([^"]+)"/);
      if (match) {
        currentPool.address = match[1];
      } else {
        errors.push(`Line ${lineNumber}: Invalid address format`);
      }
    } else if (inPoolsSection && trimmed.startsWith('name = ')) {
      const match = trimmed.match(/name\s*=\s*"([^"]+)"/);
      if (match) {
        currentPool.name = match[1];
      } else {
        errors.push(`Line ${lineNumber}: Invalid name format`);
      }
    } else if (trimmed.startsWith('[') && trimmed !== '[[pools]]') {
      // 新的 section，保存当前 pool
      inPoolsSection = false;
      if (currentPool.address && currentPool.name) {
        pools.push(currentPool as Pool);
        currentPool = {};
      }
    }
  });
  
  // 保存最后一个 pool
  if (currentPool.address && currentPool.name) {
    pools.push(currentPool as Pool);
  }
  
  return { pools, errors };
}

function validatePools(pools: Pool[]): {
  duplicates: { address: string; pools: Pool[] }[];
  invalidAddresses: Pool[];
  stats: {
    total: number;
    valid: number;
    duplicates: number;
    invalid: number;
  };
} {
  const addressMap = new Map<string, Pool[]>();
  const invalidAddresses: Pool[] = [];
  
  // 检查重复和地址格式
  pools.forEach(pool => {
    // 检查地址格式
    if (!isValidSolanaAddress(pool.address)) {
      invalidAddresses.push(pool);
    }
    
    // 收集重复地址
    const existing = addressMap.get(pool.address) || [];
    existing.push(pool);
    addressMap.set(pool.address, existing);
  });
  
  // 找出重复的地址
  const duplicates: { address: string; pools: Pool[] }[] = [];
  addressMap.forEach((poolList, address) => {
    if (poolList.length > 1) {
      duplicates.push({ address, pools: poolList });
    }
  });
  
  const stats = {
    total: pools.length,
    valid: pools.length - invalidAddresses.length,
    duplicates: duplicates.length,
    invalid: invalidAddresses.length,
  };
  
  return { duplicates, invalidAddresses, stats };
}

function main() {
  console.log('🔍 Pool Configuration Validator\n');
  console.log('='.repeat(60));
  
  // 从脚本目录定位配置文件（在项目根目录的 rust-pool-cache）
  const scriptDir = __dirname;
  const projectRoot = path.join(scriptDir, '..');
  const configPath = path.join(projectRoot, 'rust-pool-cache', 'config-expanded.toml');
  
  // 检查文件是否存在
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  }
  
  console.log(`📄 Config file: ${configPath}\n`);
  
  // 解析 TOML
  console.log('📝 Parsing TOML...');
  const { pools, errors } = parseTomlConfig(configPath);
  
  if (errors.length > 0) {
    console.error(`\n❌ Found ${errors.length} parsing errors:\n`);
    errors.forEach(err => console.error(`   ${err}`));
  } else {
    console.log('✅ TOML syntax valid\n');
  }
  
  // 验证池子
  console.log('🔎 Validating pools...');
  const { duplicates, invalidAddresses, stats } = validatePools(pools);
  
  console.log('\n📊 Statistics:');
  console.log('─'.repeat(60));
  console.log(`   Total pools:          ${stats.total}`);
  console.log(`   Valid addresses:      ${stats.valid}`);
  console.log(`   Invalid addresses:    ${stats.invalid}`);
  console.log(`   Duplicate addresses:  ${stats.duplicates}`);
  console.log('─'.repeat(60));
  
  // 报告重复项
  if (duplicates.length > 0) {
    console.log('\n⚠️  DUPLICATE ADDRESSES FOUND:\n');
    duplicates.forEach(({ address, pools: dupPools }, index) => {
      console.log(`${index + 1}. Address: ${address}`);
      dupPools.forEach(pool => {
        console.log(`   - Line ${pool.lineNumber}: ${pool.name}`);
      });
      console.log();
    });
  } else {
    console.log('\n✅ No duplicate addresses found\n');
  }
  
  // 报告无效地址
  if (invalidAddresses.length > 0) {
    console.log('⚠️  INVALID ADDRESSES FOUND:\n');
    invalidAddresses.forEach((pool, index) => {
      console.log(`${index + 1}. Line ${pool.lineNumber}: ${pool.name}`);
      console.log(`   Address: ${pool.address}`);
      console.log();
    });
  } else {
    console.log('✅ All addresses are valid Solana addresses\n');
  }
  
  // 最终结果
  console.log('='.repeat(60));
  if (errors.length === 0 && duplicates.length === 0 && invalidAddresses.length === 0) {
    console.log('🎉 Configuration is valid!\n');
    process.exit(0);
  } else {
    console.log('❌ Configuration has issues. Please fix them before proceeding.\n');
    process.exit(1);
  }
}

main();

