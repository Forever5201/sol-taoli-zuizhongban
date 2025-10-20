@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo Step-by-Step Bot Startup
echo ========================================
echo.

cd /d E:\6666666666666666666666666666\dex-cex\dex-sol

echo [STEP 1] Verify dependencies are installed...
if not exist "node_modules" (
    echo ERROR: node_modules not found!
    echo Please run: pnpm install
    pause
    exit /b 1
)
echo OK: node_modules exists

echo.
echo [STEP 2] Building TypeScript code...
call pnpm build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo OK: Build complete

echo.
echo [STEP 3] Verify compiled files...
if not exist "packages\onchain-bot\dist\index.js" (
    echo ERROR: Compiled file not found!
    pause
    exit /b 1
)
echo OK: Compiled files exist

echo.
echo [STEP 4] Check rpc-websockets version...
for /f "tokens=*" %%i in ('node -p "try{require('./node_modules/.pnpm/node_modules/rpc-websockets/package.json').version}catch(e){'not found'}" 2^>nul') do set RPC_VERSION=%%i
echo rpc-websockets: !RPC_VERSION!

echo.
echo [STEP 5] Starting bot...
echo.
echo ========================================
echo Bot Configuration:
echo   Node: v20.19.5
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   Balance: 0.012533571 SOL
echo   Network: Mainnet
echo   FlashLoan: Enabled
echo ========================================
echo.
echo Press Ctrl+C to stop
echo.

node packages\onchain-bot\dist\index.js

pause
