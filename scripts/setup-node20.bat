@echo off
echo.
echo ========================================
echo Node.js 20 Setup Script
echo ========================================
echo.

echo [Step 1/6] Checking nvm installation...
nvm version
if errorlevel 1 (
    echo.
    echo ERROR: nvm not found!
    echo.
    echo Please:
    echo 1. Close this terminal
    echo 2. Open a NEW PowerShell window
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)
echo OK: nvm is installed

echo.
echo [Step 2/6] Installing Node.js 20.11.0...
nvm install 20.11.0

echo.
echo [Step 3/6] Switching to Node.js 20...
nvm use 20.11.0

echo.
echo [Step 4/6] Verifying Node version...
node --version

echo.
echo [Step 5/6] Cleaning old dependencies...
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
echo [Step 6/6] Installing dependencies...
pnpm install

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Node version:
node --version
echo.
echo Next step: Run the bot
echo   pnpm start:onchain-bot
echo.
pause
