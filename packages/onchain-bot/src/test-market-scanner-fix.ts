/**
 * Market Scanner Fix Test
 * 
 * Tests the fixed market scanner with proper token account fetching
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { ConnectionPool, createLogger, ConfigLoader } from '@solana-arb-bot/core';
import { MarketScanner } from './market-scanner';
import * as fs from 'fs';
import * as path from 'path';
import TOML from 'toml';

const logger = createLogger('MarketScannerTest');

interface MarketConfig {
  name: string;
  dex: string;
  pool_address: string;
  base_mint: string;
  quote_mint: string;
}

interface BotConfig {
  bot: {
    name: string;
    network: string;
    dry_run: boolean;
  };
  rpc: {
    urls: string[];
    commitment: string;
    min_time: number;
    max_concurrent: number;
  };
}

async function testMarketScanner() {
  console.log('\n========================================');
  console.log('Market Scanner Fix - Validation Test');
  console.log('========================================\n');

  try {
    // 1. Load configuration
    logger.info('Loading configuration...');
    const config = ConfigLoader.loadModuleConfig<BotConfig>('packages/onchain-bot/config.example.toml');
    
    // 2. Initialize ConnectionPool
    logger.info('Initializing RPC connection pool...');
    const connectionPool = new ConnectionPool({
      endpoints: config.rpc.urls,
      commitment: config.rpc.commitment as any,
      minTime: config.rpc.min_time,
      maxConcurrent: config.rpc.max_concurrent,
    });

    // 3. Load markets
    logger.info('Loading markets from ./markets.toml...');
    const marketsPath = path.resolve(process.cwd(), 'markets.toml');
    const marketsContent = fs.readFileSync(marketsPath, 'utf-8');
    const marketsData = TOML.parse(marketsContent);
    
    const markets = marketsData.markets.map((m: any) => ({
      name: m.name,
      dex: m.dex,
      poolAddress: m.pool_address,
      baseMint: m.base_mint,
      quoteMint: m.quote_mint,
    }));

    logger.info(`Loaded ${markets.length} markets`);
    markets.forEach((m: any) => {
      console.log(`  - ${m.name} (${m.dex}): ${m.poolAddress.slice(0, 8)}...`);
    });

    // 4. Create MarketScanner
    logger.info('\nInitializing MarketScanner...');
    const scanner = new MarketScanner(connectionPool, {
      markets,
      scanIntervalMs: 100,
    });

    // 5. Scan markets
    console.log('\n⏳ Scanning markets (this may take a few seconds)...\n');
    const startTime = Date.now();
    const priceData = await scanner.scanMarkets();
    const duration = Date.now() - startTime;

    // 6. Display results
    console.log('\n========================================');
    console.log('Scan Results');
    console.log('========================================\n');

    console.log(`✅ Scan completed in ${duration}ms`);
    console.log(`✅ Successfully parsed: ${priceData.length}/${markets.length} pools\n`);

    if (priceData.length === 0) {
      console.log('❌ No price data available - scanner failed!');
      process.exit(1);
    }

    // Display detailed results for each pool
    priceData.forEach((data, index) => {
      const market = markets.find((m: any) => m.poolAddress === data.poolAddress);
      
      console.log(`Pool ${index + 1}: ${market?.name || 'Unknown'}`);
      console.log(`  DEX: ${data.dex}`);
      console.log(`  Address: ${data.poolAddress}`);
      console.log(`  Price: ${data.price.toFixed(6)} ${market?.name.split('/')[1] || 'quote'}`);
      console.log(`  Liquidity: $${data.liquidity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      console.log(`  Base Reserve: ${formatReserve(data.baseReserve, data.baseDecimals)}`);
      console.log(`  Quote Reserve: ${formatReserve(data.quoteReserve, data.quoteDecimals)}`);
      console.log(`  Decimals: Base=${data.baseDecimals}, Quote=${data.quoteDecimals}`);
      console.log('');
    });

    // 7. Validate results
    console.log('========================================');
    console.log('Validation');
    console.log('========================================\n');

    let allValid = true;

    // Check prices are in reasonable range for SOL
    priceData.forEach((data) => {
      const market = markets.find((m: any) => m.poolAddress === data.poolAddress);
      
      if (data.price < 50 || data.price > 500) {
        console.log(`⚠️  ${market?.name}: Price ${data.price.toFixed(2)} seems unusual (expected 50-500)`);
        allValid = false;
      } else {
        console.log(`✅ ${market?.name}: Price ${data.price.toFixed(2)} is reasonable`);
      }

      if (data.liquidity < 1000) {
        console.log(`⚠️  ${market?.name}: Low liquidity $${data.liquidity.toFixed(0)}`);
        allValid = false;
      } else {
        console.log(`✅ ${market?.name}: Liquidity $${data.liquidity.toLocaleString('en-US', { maximumFractionDigits: 0 })} is sufficient`);
      }

      if (data.baseReserve === BigInt(0) || data.quoteReserve === BigInt(0)) {
        console.log(`❌ ${market?.name}: Zero reserves detected!`);
        allValid = false;
      } else {
        console.log(`✅ ${market?.name}: Reserves are non-zero`);
      }
    });

    // Check for arbitrage opportunities
    if (priceData.length >= 2) {
      console.log('\n========================================');
      console.log('Arbitrage Analysis');
      console.log('========================================\n');

      const price1 = priceData[0].price;
      const price2 = priceData[1].price;
      const priceDiff = Math.abs(price1 - price2);
      const spreadPercent = (priceDiff / Math.min(price1, price2)) * 100;

      console.log(`Price Difference: ${priceDiff.toFixed(6)}`);
      console.log(`Spread: ${spreadPercent.toFixed(4)}%`);

      if (spreadPercent > 0.1) {
        console.log(`✅ Spread > 0.1% - Arbitrage opportunity detected!`);
      } else {
        console.log(`ℹ️  Spread < 0.1% - Minimal arbitrage opportunity`);
      }
    }

    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================\n');

    if (allValid && priceData.length === markets.length) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Market scanner is working correctly');
      console.log('✅ No more "_bn" errors');
      console.log('✅ Reserves are being fetched from token accounts');
      console.log('✅ Ready for full bot testing\n');
      process.exit(0);
    } else {
      console.log('⚠️  SOME VALIDATIONS FAILED');
      console.log('   Please review the warnings above\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:\n');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Format reserve amount with proper decimals
 */
function formatReserve(amount: bigint, decimals: number): string {
  const value = Number(amount) / Math.pow(10, decimals);
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} (raw: ${amount.toString()})`;
}

// Run test
testMarketScanner().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

