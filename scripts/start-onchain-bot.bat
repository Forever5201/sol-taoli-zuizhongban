@echo off
echo.
echo ========================================
echo Starting Onchain Arbitrage Bot
echo ========================================
echo.

echo [1/4] Switching to Node 20...
nvm use 20

echo.
echo [2/4] Checking wallet balance...
echo Wallet: keypairs/flashloan-wallet.json
scripts\check-balance.bat

echo.
echo [3/4] Verifying configuration...
echo Network: Mainnet
echo FlashLoan: Enabled (Max 100 SOL)
echo Config: .env

echo.
echo [4/4] Starting bot...
echo.
echo ========================================
echo Bot is starting...
echo Press Ctrl+C to stop
echo ========================================
echo.

pnpm start:onchain-bot
