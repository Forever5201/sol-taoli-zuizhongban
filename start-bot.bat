@echo off
echo.
echo ========================================
echo On-Chain Arbitrage Bot
echo ========================================
echo.

echo [1/3] Switching to Node 20...
nvm use 20

echo.
echo [2/3] Building project...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
call pnpm build

echo.
echo [3/3] Starting bot...
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   Network: Mainnet
echo   Proxy: Auto-detect from .env
echo.

node packages\onchain-bot\dist\index.js
