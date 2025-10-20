@echo off
echo.
echo ========================================
echo Continuing Bot Startup
echo ========================================
echo.

echo [1/4] Building packages...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
pnpm build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Checking rpc-websockets version...
pnpm list rpc-websockets | findstr "rpc-websockets"

echo.
echo [3/4] Wallet Configuration...
echo Address: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo Balance: 0.012533571 SOL
echo Network: Mainnet
echo FlashLoan: Enabled

echo.
echo [4/4] Starting bot...
echo.
echo ========================================
echo Bot is starting...
echo Press Ctrl+C to stop
echo ========================================
echo.

node packages\onchain-bot\dist\index.js
