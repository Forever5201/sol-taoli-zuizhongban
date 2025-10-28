@echo off
REM Rebuild script for market scanner fix

echo ========================================
echo Rebuilding After Market Scanner Fix
echo ========================================
echo.

echo [1/4] Switching to Node 20...
call nvm use 20 2>NUL

echo [2/4] Installing dependencies...
call pnpm install --frozen-lockfile

echo [3/4] Building core package...
cd packages\core
call npm run build
cd ..\..

echo [4/4] Building onchain-bot package...
cd packages\onchain-bot
call npm run build
cd ..\..

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Test: node packages/onchain-bot/dist/test-market-scanner-fix.js
echo 2. Run bot: .\start-bot.bat
echo.


