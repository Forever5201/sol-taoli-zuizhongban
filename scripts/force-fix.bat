@echo off
echo.
echo ========================================
echo Force Fix - Override jito-ts Dependency
echo ========================================
echo.

echo [ROOT CAUSE]
echo jito-ts 3.0.1 forces @solana/web3.js ~1.77.3
echo This conflicts with our requirement of 1.98.4
echo.
echo [SOLUTION]
echo Use pnpm overrides to force ALL packages to use 1.98.4
echo.

echo [1/5] Using Node 20...
nvm use 20

echo.
echo [2/5] Complete cleanup...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
rd /s /q node_modules 2>nul
del /f pnpm-lock.yaml 2>nul

echo.
echo [3/5] Installing with forced @solana/web3.js 1.98.4...
pnpm install

if errorlevel 1 (
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Verifying version...
for /f "tokens=*" %%i in ('node -p "require('./node_modules/@solana/web3.js/package.json').version" 2^>nul') do set SOLANA_VERSION=%%i
echo Installed @solana/web3.js: %SOLANA_VERSION%

if "%SOLANA_VERSION%"=="1.98.4" (
    echo OK: Correct version installed
) else (
    echo WARNING: Version mismatch!
    pause
)

echo.
echo [5/5] Building...
pnpm build

if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Fix Complete! Starting bot...
echo ========================================
echo.
echo Configuration:
echo   Node: v20.19.5
echo   @solana/web3.js: %SOLANA_VERSION%
echo   Wallet: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   FlashLoan: Enabled
echo.
echo Press Ctrl+C to stop
echo.

node packages\onchain-bot\dist\index.js
