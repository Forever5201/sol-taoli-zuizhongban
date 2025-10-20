@echo off
echo.
echo ========================================
echo Starting Onchain Arbitrage Bot
echo ========================================
echo.

echo [1/3] Switching to Node 20...
nvm use 20

echo.
echo [2/3] Configuration Check...
echo Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo Balance: 0.012533571 SOL
echo Network: Mainnet
echo FlashLoan: Enabled (Max 100 SOL)

echo.
echo [3/3] Starting bot...
echo.
echo ========================================
echo Bot is starting...
echo Press Ctrl+C to stop
echo ========================================
echo.

cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
pnpm start:onchain-bot
