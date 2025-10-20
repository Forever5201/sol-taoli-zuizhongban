@echo off
echo.
echo ========================================
echo Starting Onchain Bot (Compiled Version)
echo ========================================
echo.

echo [1/4] Switching to Node 20...
nvm use 20

echo.
echo [2/4] Checking configuration...
echo Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo Balance: 0.012533571 SOL
echo Network: Mainnet
echo FlashLoan: Enabled

echo.
echo [3/4] Building packages...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
call pnpm build

echo.
echo [4/4] Starting bot (compiled JavaScript)...
echo.
echo ========================================
echo Bot is starting...
echo Press Ctrl+C to stop
echo ========================================
echo.

node packages\onchain-bot\dist\index.js
