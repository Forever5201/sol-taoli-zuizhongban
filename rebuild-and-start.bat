@echo off
echo.
echo ========================================
echo Rebuild and Start Bot
echo ========================================
echo.

echo [1/3] Switching to Node 20...
nvm use 20

echo.
echo [2/3] Rebuilding project...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
call pnpm build

if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Starting bot with proxy...
echo.
echo Configuration:
echo   Proxy: http://127.0.0.1:7890 (from .env)
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   Network: Mainnet
echo.

node packages\onchain-bot\dist\index.js
