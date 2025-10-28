/**
 * Simple Market Scanner Test - Direct execution
 */

// Load environment
require('dotenv').config();

const { Connection, PublicKey } = require('@solana/web3.js');

async function test() {
  console.log('\n=== Simple Market Scanner Test ===\n');
  
  try {
    // Test 1: Verify we can connect to RPC
    console.log('1. Testing RPC connection...');
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const slot = await connection.getSlot();
    console.log(`✅ RPC connected - Current slot: ${slot}\n`);
    
    // Test 2: Fetch pool account
    console.log('2. Fetching Raydium pool account...');
    const poolAddress = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';  // SOL/USDC
    const poolAccount = await connection.getAccountInfo(new PublicKey(poolAddress));
    
    if (!poolAccount) {
      console.log('❌ Pool account not found!');
      return;
    }
    
    console.log(`✅ Pool account fetched`);
    console.log(`   Size: ${poolAccount.data.length} bytes`);
    console.log(`   Owner: ${poolAccount.owner.toBase58()}\n`);
    
    // Test 3: Parse pool state (extract token account addresses)
    console.log('3. Parsing pool state...');
    const data = poolAccount.data;
    
    // Read decimals
    const coinDecimals = data.readBigUInt64LE(32);
    const pcDecimals = data.readBigUInt64LE(40);
    console.log(`   Coin decimals: ${coinDecimals}`);
    console.log(`   PC decimals: ${pcDecimals}`);
    
    // Read token account addresses (offset 216)
    const poolCoinTokenAccount = new PublicKey(data.slice(216, 248));
    const poolPcTokenAccount = new PublicKey(data.slice(248, 280));
    console.log(`   Coin token account: ${poolCoinTokenAccount.toBase58()}`);
    console.log(`   PC token account: ${poolPcTokenAccount.toBase58()}\n`);
    
    // Test 4: Fetch token accounts
    console.log('4. Fetching token accounts...');
    const [coinAccount, pcAccount] = await connection.getMultipleAccountsInfo([
      poolCoinTokenAccount,
      poolPcTokenAccount
    ]);
    
    if (!coinAccount || !pcAccount) {
      console.log('❌ Failed to fetch token accounts!');
      return;
    }
    
    console.log(`✅ Token accounts fetched`);
    console.log(`   Coin account size: ${coinAccount.data.length} bytes`);
    console.log(`   PC account size: ${pcAccount.data.length} bytes\n`);
    
    // Test 5: Parse token accounts (SPL Token layout)
    console.log('5. Parsing reserves...');
    const coinReserve = coinAccount.data.readBigUInt64LE(64);
    const pcReserve = pcAccount.data.readBigUInt64LE(64);
    
    console.log(`   Raw reserves:`);
    console.log(`     Coin: ${coinReserve.toString()}`);
    console.log(`     PC: ${pcReserve.toString()}`);
    
    // Calculate price
    const coinAmount = Number(coinReserve) / Math.pow(10, Number(coinDecimals));
    const pcAmount = Number(pcReserve) / Math.pow(10, Number(pcDecimals));
    const price = pcAmount / coinAmount;
    
    console.log(`\n   Adjusted amounts:`);
    console.log(`     SOL: ${coinAmount.toFixed(2)}`);
    console.log(`     USDC: ${pcAmount.toFixed(2)}`);
    console.log(`\n✅ PRICE: ${price.toFixed(2)} USDC per SOL\n`);
    
    console.log('=== ALL TESTS PASSED ===\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error(error.stack);
  }
}

test();


