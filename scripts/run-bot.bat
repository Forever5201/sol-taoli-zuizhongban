@echo off
echo.
echo ========================================
echo Running Onchain Arbitrage Bot
echo ========================================
echo.

echo [1/3] Building code...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
pnpm build

echo.
echo [2/3] Bot Configuration:
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   Balance: 0.012533571 SOL
echo   Network: Mainnet
echo   FlashLoan: Enabled (100 SOL)

echo.
echo [3/3] Starting bot...
echo.
echo ========================================
echo Press Ctrl+C to stop
echo ========================================
echo.

node packages\onchain-bot\dist\index.js
