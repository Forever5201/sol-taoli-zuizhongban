@echo off
echo.
echo ========================================
echo Upgrading to Node.js 20.latest
echo ========================================
echo.

echo [Step 1/5] Installing latest Node.js 20...
nvm install 20

echo.
echo [Step 2/5] Using latest Node.js 20...
nvm use 20

echo.
echo [Step 3/5] Verifying version...
node --version

echo.
echo [Step 4/5] Cleaning dependencies...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
if exist node_modules (
    rd /s /q node_modules
)
if exist pnpm-lock.yaml (
    del /f pnpm-lock.yaml
)

echo.
echo [Step 5/5] Installing dependencies...
pnpm install

echo.
echo ========================================
echo Upgrade Complete!
echo ========================================
echo.
node --version
echo.
pause
