#!/usr/bin/env ts-node

/**
 * 池子地址调查工具
 * 检查池子地址的所属程序、数据结构和可订阅性
 */

import { Connection, PublicKey } from '@solana/web3.js';

// 已知的 DEX 程序 ID
const KNOWN_PROGRAMS = {
  'Raydium AMM V4': '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  'Raydium CLMM': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  'Orca Whirlpool': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'Meteora DLMM': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'Lifinity V2': '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c',
  'Phoenix': 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
  'Stabble': 'swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ',
};

interface PoolInfo {
  address: string;
  name: string;
  owner: string;
  dataSize: number;
  knownProgram?: string;
  canSubscribe: boolean;
  recommendedAction: string;
}

async function checkPoolAddress(
  connection: Connection,
  address: string,
  name: string
): Promise<PoolInfo> {
  try {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);

    if (!accountInfo) {
      return {
        address,
        name,
        owner: 'N/A',
        dataSize: 0,
        canSubscribe: false,
        recommendedAction: '❌ 账户不存在或无效',
      };
    }

    const owner = accountInfo.owner.toString();
    const dataSize = accountInfo.data.length;

    // 检查是否属于已知程序
    let knownProgram: string | undefined;
    let canSubscribe = false;
    let recommendedAction = '';

    for (const [dexName, programId] of Object.entries(KNOWN_PROGRAMS)) {
      if (owner === programId) {
        knownProgram = dexName;
        canSubscribe = true;
        
        if (dexName === 'Raydium AMM V4') {
          recommendedAction = '✅ 可以使用现有的 Raydium AMM V4 反序列化器';
        } else if (dexName === 'Raydium CLMM') {
          recommendedAction = '✅ 可以使用现有的 Raydium CLMM 反序列化器（需完善）';
        } else if (dexName === 'Orca Whirlpool') {
          recommendedAction = '⚠️ 需要实现 Orca Whirlpool 反序列化器';
        } else {
          recommendedAction = `⚠️ 需要实现 ${dexName} 反序列化器`;
        }
        break;
      }
    }

    if (!knownProgram) {
      recommendedAction = `❌ 未知程序 (${owner.slice(0, 8)}...)，需要研究数据结构`;
    }

    return {
      address,
      name,
      owner,
      dataSize,
      knownProgram,
      canSubscribe,
      recommendedAction,
    };
  } catch (error) {
    return {
      address,
      name,
      owner: 'ERROR',
      dataSize: 0,
      canSubscribe: false,
      recommendedAction: `❌ 查询失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function main() {
  console.log('🔍 池子地址调查工具\n');
  console.log('=' .repeat(80));
  console.log('');

  // RPC 连接
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  console.log('📡 连接到 Solana RPC...');
  console.log(`   URL: ${connection.rpcEndpoint}`);
  console.log('');

  // 要检查的池子地址
  const poolsToCheck = [
    // SolFi V2 相关
    {
      address: '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc',
      name: 'USDC/USDT (SolFi V2) - 4126 uses',
    },
    {
      address: 'FkEB6uvyzuoaGpgs4yRtFtxC4WJxhejNFbUkj5R6wR32',
      name: 'USDC/USDT (SolFi V2)',
    },
    // AlphaQ
    {
      address: 'Pi9nzTjPxD8DsRfRBGfKYzmefJoJM8TcXu2jyaQjSHm',
      name: 'USDT/USDC (AlphaQ) - 6220 uses',
    },
    {
      address: '9xPhpwq6GLUkrDBNfXCbnSP9ARAMMyUQqgkrqaDW6NLV',
      name: 'USDC/USD1 (AlphaQ) - 205 uses',
    },
    // GoonFi
    {
      address: '4uWuh9fC7rrZKrN8ZdJf69MN1e2S7FPpMqcsyY1aof6K',
      name: 'USDC/SOL (GoonFi) - 5632 uses',
    },
    // Lifinity V2
    {
      address: 'DrRd8gYMJu9XGxLhwTCPdHNLXCKHsxJtMpbn62YqmwQe',
      name: 'SOL/USDC (Lifinity V2) - 5120 uses',
    },
    {
      address: '5zvhFRN45j9oePohUQ739Z4UaSrgPoJ8NLaS2izFuX1j',
      name: 'SOL/USDT (Lifinity V2) - 1376 uses',
    },
    // TesseraV
    {
      address: 'FLckHLGMJy5gEoXWwcE68Nprde1D4araK4TGLw4pQq2n',
      name: 'SOL/USDC (TesseraV) - 3038 uses',
    },
    // HumidiFi
    {
      address: 'hKgG7iEDRFNsJSwLYqz8ETHuZwzh6qMMLow8VXa8pLm',
      name: 'JUP/USDC (HumidiFi) - 5 uses',
    },
  ];

  console.log(`📊 检查 ${poolsToCheck.length} 个池子地址...\n`);

  const results: PoolInfo[] = [];
  
  for (let i = 0; i < poolsToCheck.length; i++) {
    const pool = poolsToCheck[i];
    console.log(`[${i + 1}/${poolsToCheck.length}] ${pool.name}`);
    console.log(`   地址: ${pool.address}`);
    
    const info = await checkPoolAddress(connection, pool.address, pool.name);
    results.push(info);
    
    console.log(`   程序: ${info.owner.slice(0, 8)}...${info.owner.slice(-8)}`);
    if (info.knownProgram) {
      console.log(`   识别: ${info.knownProgram}`);
    }
    console.log(`   大小: ${info.dataSize} bytes`);
    console.log(`   ${info.recommendedAction}`);
    console.log('');
    
    // 避免 RPC 限速
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('=' .repeat(80));
  console.log('\n📋 调查报告汇总\n');

  // 按程序类型分组
  const byProgram = new Map<string, PoolInfo[]>();
  for (const result of results) {
    const key = result.knownProgram || result.owner;
    if (!byProgram.has(key)) {
      byProgram.set(key, []);
    }
    byProgram.get(key)!.push(result);
  }

  byProgram.forEach((pools, program) => {
    console.log(`\n### ${program}`);
    console.log(`   池子数量: ${pools.length}`);
    console.log(`   可订阅: ${pools.filter(p => p.canSubscribe).length}/${pools.length}`);
    console.log(`   池子列表:`);
    pools.forEach(p => {
      console.log(`      - ${p.name}`);
      console.log(`        ${p.address}`);
      console.log(`        ${p.recommendedAction}`);
    });
  });

  console.log('\n' + '=' .repeat(80));
  console.log('\n💡 总结建议\n');

  const canSubscribe = results.filter(r => r.canSubscribe);
  const needImplementation = results.filter(r => r.canSubscribe && !r.recommendedAction.includes('现有'));
  const cannotSubscribe = results.filter(r => !r.canSubscribe);

  console.log(`✅ 可以立即订阅: ${canSubscribe.length} 个`);
  console.log(`⚠️  需要实现反序列化器: ${needImplementation.length} 个`);
  console.log(`❌ 无法直接订阅: ${cannotSubscribe.length} 个`);

  if (canSubscribe.length > 0) {
    console.log('\n立即可用的池子:');
    canSubscribe.forEach(p => {
      if (p.recommendedAction.includes('现有')) {
        console.log(`   ✅ ${p.name}`);
      }
    });
  }

  if (needImplementation.length > 0) {
    console.log('\n需要开发的 DEX:');
    const dexesToImplement = new Set(needImplementation.map(p => p.knownProgram).filter(Boolean));
    dexesToImplement.forEach(dex => {
      const count = needImplementation.filter(p => p.knownProgram === dex).length;
      console.log(`   ⚠️  ${dex}: ${count} 个池子`);
    });
  }

  if (cannotSubscribe.length > 0) {
    console.log('\n无法直接订阅的池子（建议继续使用 Jupiter API）:');
    cannotSubscribe.forEach(p => {
      console.log(`   ❌ ${p.name}`);
      console.log(`      ${p.recommendedAction}`);
    });
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n✨ 调查完成！\n');
}

main().catch(console.error);

