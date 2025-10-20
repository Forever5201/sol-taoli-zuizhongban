@echo off
echo.
echo ========================================
echo Final Fix - Forcing Compatible Versions
echo ========================================
echo.

echo [1/5] Using Node 20...
nvm use 20

echo.
echo [2/5] Removing all dependencies...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
rd /s /q node_modules 2>nul
del /f pnpm-lock.yaml 2>nul

echo.
echo [3/5] Installing with forced versions...
echo This will use:
echo   - @solana/web3.js ^1.98.4
echo   - rpc-websockets ^7.11.2
echo.
pnpm install --force

if errorlevel 1 (
    echo.
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building...
pnpm build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Starting bot...
echo.
echo ========================================
echo Configuration:
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   Balance: 0.012533571 SOL
echo   Network: Mainnet
echo   FlashLoan: Enabled (100 SOL max)
echo ========================================
echo.
echo Press Ctrl+C to stop
echo.

node packages\onchain-bot\dist\index.js
