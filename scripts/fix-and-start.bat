@echo off
echo.
echo ========================================
echo Fixing Dependencies and Starting Bot
echo ========================================
echo.

echo [1/6] Switching to Node 20...
nvm use 20

echo.
echo [2/6] Cleaning old dependencies...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
if exist node_modules (
    echo Removing node_modules...
    rd /s /q node_modules
)
if exist pnpm-lock.yaml (
    echo Removing pnpm-lock.yaml...
    del /f pnpm-lock.yaml
)

echo.
echo [3/6] Installing dependencies with fix...
echo This will use rpc-websockets 9.0.4 (compatible version)
pnpm install

echo.
echo [4/6] Building packages...
pnpm build

echo.
echo [5/6] Wallet information...
echo Address: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo Balance: 0.012533571 SOL
echo Network: Mainnet
echo FlashLoan: Enabled (Max 100 SOL)

echo.
echo [6/6] Starting bot...
echo.
echo ========================================
echo Bot is starting...
echo Press Ctrl+C to stop
echo ========================================
echo.

node packages\onchain-bot\dist\index.js
