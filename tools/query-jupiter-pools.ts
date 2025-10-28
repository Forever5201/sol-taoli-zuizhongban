#!/usr/bin/env tsx
/**
 * Query Jupiter API for pool addresses
 * Extracts actual pool addresses from Jupiter route responses
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Token mint addresses
const TOKEN_MINTS: { [key: string]: string } = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'USD1': 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
  'USDS': 'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

// Jupiter internal DEX names to real protocol mappings
const DEX_NAME_MAPPING: { [key: string]: string } = {
  'Raydium': 'Raydium V4',
  'Raydium CLMM': 'Raydium CLMM',
  'Orca': 'Orca V2',
  'Whirlpool': 'Whirlpool',
  'Meteora DLMM': 'Meteora DLMM',
  'Lifinity V2': 'Lifinity V2',
  // Jupiter internal names (may need adjustments)
  'SolFi V2': 'SolFi V2',
  'AlphaQ': 'AlphaQ',
  'HumidiFi': 'HumidiFi',
  'TesseraV': 'TesseraV',
  'GoonFi': 'GoonFi',
};

interface PoolCandidate {
  rank: number;
  dex: string;
  pair: string;
  tokenA: string;
  tokenB: string;
  usageCount: number;
}

interface PoolResult {
  rank: number;
  dex: string;
  pair: string;
  tokenA: string;
  tokenB: string;
  inputMint: string;
  outputMint: string;
  querySuccess: boolean;
  poolsFound: Array<{
    address: string;
    dexLabel: string;
    ammKey?: string;
  }>;
  errorMessage?: string;
}

const JUPITER_QUOTE_API = 'https://lite-api.jup.ag/swap/v1/quote'; // 使用免费的 Lite API
const DELAY_MS = 500; // Delay between requests to avoid rate limiting

// 使用与项目一致的代理配置方式
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

let httpsAgent: any;
if (proxyUrl) {
  httpsAgent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    timeout: 10000,
    keepAlive: true,
    keepAliveMsecs: 500,
    maxSockets: 10,
    maxFreeSockets: 5,
    scheduling: 'lifo' as any,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryJupiterForPools(
  inputMint: string,
  outputMint: string,
  amount: number = 1000000000 // 1 SOL or 1 token
): Promise<any> {
  try {
    const url = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
    console.log(`   Querying: ${url.substring(0, 100)}...`);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'br, gzip, deflate',
      },
      httpsAgent,
      httpAgent: httpsAgent,
      proxy: false, // Disable axios auto-proxy, use our agent
      validateStatus: (status) => status < 500,
      maxRedirects: 0,
      decompress: true,
    });
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`API Error ${error.response.status}: ${error.response.statusText}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout');
    } else {
      throw new Error(`Network error: ${error.message}`);
    }
  }
}

function extractPoolsFromRoute(routeData: any): Array<{ address: string; dexLabel: string; ammKey?: string }> {
  const pools: Array<{ address: string; dexLabel: string; ammKey?: string }> = [];
  
  if (!routeData || !routeData.routePlan) {
    return pools;
  }

  // Jupiter v6 API structure: routePlan is an array of swap steps
  for (const step of routeData.routePlan) {
    if (step.swapInfo) {
      const swapInfo = step.swapInfo;
      
      // Extract AMM key (pool address)
      const ammKey = swapInfo.ammKey;
      const label = swapInfo.label || 'Unknown';
      
      if (ammKey && ammKey.length === 43 || ammKey.length === 44) {
        pools.push({
          address: ammKey,
          dexLabel: label,
          ammKey: ammKey,
        });
      }
    }
  }

  return pools;
}

async function queryAllPools() {
  console.log('🔍 Loading S+ tier pools from practical-ranking-data.json...\n');
  
  // Try multiple possible paths
  const possiblePaths = [
    'packages/core/practical-ranking-data.json',
    './packages/core/practical-ranking-data.json',
    '../packages/core/practical-ranking-data.json',
    'practical-ranking-data.json',
  ];
  
  let dataPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dataPath = p;
      break;
    }
  }
  
  if (!dataPath) {
    throw new Error('Cannot find practical-ranking-data.json in any expected location');
  }
  
  console.log(`   Found data file at: ${dataPath}\n`);
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  const sPlusPools: PoolCandidate[] = data.recommendations.sPlus.map((p: any) => ({
    rank: p.rank,
    dex: p.dex,
    pair: p.pair,
    tokenA: p.tokenA,
    tokenB: p.tokenB,
    usageCount: p.usageCount,
  }));

  console.log(`📊 Found ${sPlusPools.length} S+ tier pools\n`);

  const results: PoolResult[] = [];
  const allDiscoveredPools = new Map<string, { dex: string; pair: string; dexLabel: string }>();

  for (const pool of sPlusPools) {
    console.log(`\n[${ pool.rank}/${sPlusPools.length}] ${pool.dex} - ${pool.pair}`);
    console.log(`   Usage: ${pool.usageCount} times`);

    // Get token mints
    const inputMint = TOKEN_MINTS[pool.tokenA];
    const outputMint = TOKEN_MINTS[pool.tokenB];

    if (!inputMint || !outputMint) {
      console.log(`   ⚠️  Skipping: Unknown token (${pool.tokenA} or ${pool.tokenB})`);
      results.push({
        rank: pool.rank,
        dex: pool.dex,
        pair: pool.pair,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        inputMint: inputMint || 'unknown',
        outputMint: outputMint || 'unknown',
        querySuccess: false,
        poolsFound: [],
        errorMessage: 'Unknown token mint address',
      });
      continue;
    }

    try {
      // Query Jupiter API
      const routeData = await queryJupiterForPools(inputMint, outputMint);
      
      // Extract pools from route
      const pools = extractPoolsFromRoute(routeData);
      
      console.log(`   ✅ Found ${pools.length} pools in route`);
      
      pools.forEach((p, i) => {
        console.log(`      Pool ${i + 1}: ${p.address} (${p.dexLabel})`);
        
        // Store unique pools
        if (!allDiscoveredPools.has(p.address)) {
          allDiscoveredPools.set(p.address, {
            dex: pool.dex,
            pair: pool.pair,
            dexLabel: p.dexLabel,
          });
        }
      });

      results.push({
        rank: pool.rank,
        dex: pool.dex,
        pair: pool.pair,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        inputMint,
        outputMint,
        querySuccess: true,
        poolsFound: pools,
      });

      // Delay to avoid rate limiting
      await sleep(DELAY_MS);
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        rank: pool.rank,
        dex: pool.dex,
        pair: pool.pair,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        inputMint,
        outputMint,
        querySuccess: false,
        poolsFound: [],
        errorMessage: error.message,
      });
      
      // Still delay on error
      await sleep(DELAY_MS);
    }
  }

  return { results, allDiscoveredPools };
}

function generateTOMLOutput(poolsMap: Map<string, { dex: string; pair: string; dexLabel: string }>) {
  let toml = `# Tier 6: Data-Driven High-Frequency Pools (S+ Tier)
# Auto-generated from Jupiter API query
# Generated: ${new Date().toLocaleString('zh-CN')}

`;

  const poolsArray = Array.from(poolsMap.entries());
  
  poolsArray.forEach(([address, info], index) => {
    toml += `# ${index + 1}. ${info.dex} - ${info.pair} (Jupiter: ${info.dexLabel})
[[pools]]
address = "${address}"
name = "${info.pair} (${info.dexLabel})"

`;
  });

  return toml;
}

function generateReport(
  results: PoolResult[],
  poolsMap: Map<string, { dex: string; pair: string; dexLabel: string }>
) {
  const successCount = results.filter(r => r.querySuccess).length;
  const totalPools = poolsMap.size;
  
  let report = `# Pool Query Report

**Generated**: ${new Date().toLocaleString('zh-CN')}  
**Total Queries**: ${results.length}  
**Successful Queries**: ${successCount} (${((successCount / results.length) * 100).toFixed(1)}%)  
**Unique Pools Found**: ${totalPools}

---

## Query Results

`;

  results.forEach(r => {
    report += `### ${r.rank}. ${r.dex} - ${r.pair}

- **Status**: ${r.querySuccess ? '✅ Success' : '❌ Failed'}
- **Input Mint**: \`${r.inputMint}\`
- **Output Mint**: \`${r.outputMint}\`
`;

    if (r.querySuccess) {
      report += `- **Pools Found**: ${r.poolsFound.length}\n\n`;
      r.poolsFound.forEach((p, i) => {
        report += `  ${i + 1}. \`${p.address}\` (${p.dexLabel})\n`;
      });
    } else {
      report += `- **Error**: ${r.errorMessage}\n`;
    }
    
    report += '\n';
  });

  report += `---

## Unique Pools Summary

Total unique pools discovered: **${totalPools}**

`;

  const poolsArray = Array.from(poolsMap.entries());
  poolsArray.forEach(([address, info], index) => {
    report += `${index + 1}. \`${address}\`
   - **Pair**: ${info.pair}
   - **DEX**: ${info.dex} (Jupiter label: ${info.dexLabel})

`;
  });

  report += `---

## Next Steps

1. Review the pools in \`rust-pool-cache/pools-to-add.toml\`
2. Verify pool addresses are valid
3. Append to \`rust-pool-cache/config-expanded.toml\`
4. Test configuration with Rust Pool Cache

---

**Report End**
`;

  return report;
}

async function main() {
  console.log('🚀 Jupiter Pool Query Tool\n');
  console.log(`🌐 Proxy: ${proxyUrl ? `Enabled (${proxyUrl})` : 'Disabled'}`);
  console.log('=' .repeat(60));
  
  try {
    const { results, allDiscoveredPools } = await queryAllPools();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Query Complete!\n');
    console.log(`   Total queries: ${results.length}`);
    console.log(`   Successful: ${results.filter(r => r.querySuccess).length}`);
    console.log(`   Failed: ${results.filter(r => !r.querySuccess).length}`);
    console.log(`   Unique pools found: ${allDiscoveredPools.size}`);
    
    // Determine base directory (go up from wherever we are running)
    const baseDir = process.cwd();
    
    // Generate TOML output
    const tomlOutput = generateTOMLOutput(allDiscoveredPools);
    const tomlPath = path.join(baseDir, 'rust-pool-cache', 'pools-to-add.toml');
    fs.mkdirSync(path.dirname(tomlPath), { recursive: true });
    fs.writeFileSync(tomlPath, tomlOutput, 'utf-8');
    console.log(`\n✅ TOML config written to: ${tomlPath}`);
    
    // Generate report
    const report = generateReport(results, allDiscoveredPools);
    const reportPath = path.join(baseDir, 'POOL_QUERY_REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`✅ Report written to: ${reportPath}`);
    
    // Export raw data
    const rawData = {
      generatedAt: new Date().toISOString(),
      queryResults: results,
      uniquePools: Array.from(allDiscoveredPools.entries()).map(([address, info]) => ({
        address,
        ...info,
      })),
    };
    const dataPath = path.join(baseDir, 'pool-query-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(rawData, null, 2), 'utf-8');
    console.log(`✅ Raw data written to: ${dataPath}`);
    
    console.log('\n🎉 All done!\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

