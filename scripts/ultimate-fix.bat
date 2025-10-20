@echo off
echo.
echo ========================================
echo Ultimate Fix - Natural Dependency Resolution
echo ========================================
echo.

echo [ANALYSIS]
echo Problem: We forced wrong rpc-websockets version
echo Solution: Let pnpm install correct versions naturally
echo.
echo @solana/web3.js 1.98.4 requires rpc-websockets ^9.0.2
echo Our override forced 7.11.2 (wrong!)
echo.

echo [1/5] Using Node 20...
nvm use 20

echo.
echo [2/5] Complete cleanup...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
rd /s /q node_modules 2>nul
del /f pnpm-lock.yaml 2>nul

echo.
echo [3/5] Fresh install with correct versions...
pnpm install

if errorlevel 1 (
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building...
pnpm build

if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Starting bot...
echo.
echo ========================================
echo Configuration:
echo   Node: v20.19.5
echo   @solana/web3.js: 1.98.4
echo   rpc-websockets: 9.x (correct!)
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   Balance: 0.012533571 SOL
echo   FlashLoan: Enabled
echo ========================================
echo.

node packages\onchain-bot\dist\index.js
