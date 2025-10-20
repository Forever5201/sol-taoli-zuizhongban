@echo off
echo.
echo ========================================
echo Starting Solana Arbitrage Bot
echo ========================================
echo.

echo [1/3] Checking wallet balance...
call scripts\check-balance.bat

echo.
echo [2/3] Verifying configuration...
echo Config: .env
echo Wallet: keypairs/flashloan-wallet.json
echo.

echo [3/3] Starting bot...
echo.
pnpm start:onchain-bot

pause
