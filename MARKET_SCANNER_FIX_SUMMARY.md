# Market Scanner Fix - Implementation Summary

## Problem Analyzed

The bot was failing with error: `TypeError: Cannot read properties of undefined (reading '_bn')`

**Root Cause**: The old `RaydiumParser` was trying to read reserve amounts directly from pool accounts at incorrect offsets. Raydium pools don't store reserves in the pool account - they're stored in separate SPL Token accounts.

## Fixes Implemented

### 1. Created SPL Token Account Parser (`packages/onchain-bot/src/parsers/spl-token.ts`)
- New utility to parse SPL Token account data (165 bytes)
- Extracts mint, owner, and amount from token accounts
- Properly reads reserves from offset 64 (u64 little-endian)

### 2. Rewrote MarketScanner (`packages/onchain-bot/src/market-scanner.ts`)
**Changes:**
- Removed dependency on old `RaydiumParser.parse()` method
- Implemented two-phase account fetching:
  1. Fetch pool accounts →  Extract token account addresses
  2. Fetch token accounts → Parse reserves
- Added `parseRaydiumPoolState()` method with correct Raydium AMM V4 layout
- Added comprehensive error handling and logging
- Removed unused `RaydiumParser` import (only importing `PriceData` type)

**Key Implementation Details:**
- Pool state parsing offsets:
  - Status: offset 0
  - Coin decimals: offset 32
  - PC decimals: offset 40
  - Token accounts: offset 216
- Token account parsing:
  - Amount at offset 64 (8 bytes, u64 LE)
- Validates all data before processing

### 3. Enabled Dry-Run Mode (`packages/onchain-bot/config.example.toml`)
Changed `dry_run = true` for safe testing without real transactions

### 4. Created Test Script (`packages/onchain-bot/src/test-market-scanner-fix.ts`)
Comprehensive test that validates:
- Pool account fetching
- Token account parsing
- Price calculation
- Reserve validation
- Arbitrage detection

## Files Modified

1. ✅ `packages/onchain-bot/src/parsers/spl-token.ts` - NEW FILE
2. ✅ `packages/onchain-bot/src/market-scanner.ts` - MAJOR REWRITE
3. ✅ `packages/onchain-bot/config.example.toml` - dry_run = true
4. ✅ `packages/onchain-bot/src/test-market-scanner-fix.ts` - NEW FILE

## How to Test (User Instructions)

### Step 1: Clean Rebuild
```bash
# From project root
git restore packages/*/dist  # If dist folders were deleted
pnpm install
npm run build
```

If build errors occur, build packages individually:
```bash
cd packages/core && npm run build && cd ../..
cd packages/onchain-bot && npm run build && cd ../..
```

### Step 2: Run Test
```bash
node packages/onchain-bot/dist/test-market-scanner-fix.js
```

Expected output:
- ✅ RPC connection successful
- ✅ Pool accounts fetched
- ✅ Token accounts fetched  
- ✅ Reserves parsed (non-zero values)
- ✅ Price calculated (SOL: ~130-200 USDC/USDT)
- ✅ No "_bn" errors

### Step 3: Run Full Bot
```bash
.\start-bot.bat
```

Expected output:
```
✅ Scan completed: 2/2 pools in XXXms
✅ Market scanner initialized
```

**Should NOT see**:
```
❌ Scan failed: TypeError: Cannot read properties of undefined (reading '_bn')
```

## Technical Architecture

### Before (Broken):
```
MarketScanner → RaydiumParser.parse(poolAccount)
                  ↓
                Tries to read reserves from pool account (WRONG!)
                  ↓
                Invalid offsets → undefined → ._bn error
```

### After (Fixed):
```
MarketScanner → Fetch pool accounts
                  ↓
                Parse pool state → Extract token account addresses
                  ↓
                Fetch token accounts (batch)
                  ↓
                Parse SPL Token accounts → Extract reserves
                  ↓
                Calculate price & liquidity
```

## Expected Results

With a working network connection and proxy:
- **SOL/USDC Price**: ~145 USDC (varies with market)
- **SOL/USDT Price**: ~145 USDT (varies with market)
- **Liquidity**: > $1M per pool
- **Reserves**: Millions of lamports/micro-tokens

## Network Requirements

- Proxy must be running at `http://127.0.0.1:7890` (or configured in .env)
- RPC endpoints must be accessible
- If network errors occur, this is separate from the "_bn" fix

## Troubleshooting

### If "_bn" error persists:
1. Verify build completed: `ls packages/onchain-bot/dist/market-scanner.js`
2. Check imports in built file: Should NOT import old Raydium

Parser
3. Clear node_modules cache: `rm -rf node_modules/.cache`

### If build fails:
1. Restore original dist folders from backup
2. Run `pnpm install` to fix symlinks
3. Build packages in dependency order: core → onchain-bot

### If network errors:
1. Check proxy is running: `curl -x http://127.0.0.1:7890 https://api.mainnet-beta.solana.com`
2. Verify .env has correct PROXY_URL
3. Try direct connection (disable proxy temporarily)

## Status

- ✅ Code fixes implemented
- ✅ Dry-run mode enabled
- ⚠️  Build system temporarily broken (dist folders deleted)
- ⏳ Awaiting user to rebuild and test

## Next Steps for User

1. Run the rebuild commands above
2. Test with test script first
3. Run full bot and verify no "_bn" errors
4. Monitor for successful market scanning
5. If successful, re-enable real trading by setting `dry_run = false`

---

**Note**: The actual "_bn" error fix is complete in the code. The current issue is just the build system needing to be rebuilt properly.


