@echo off
echo.
echo ========================================
echo Rebuilding All Packages
echo ========================================
echo.

echo [1/4] Building core package...
call pnpm --filter @solana-arb-bot/core build
if errorlevel 1 (
    echo ERROR: Core build failed!
    pause
    exit /b 1
)
echo Core build: OK

echo.
echo [2/4] Copying type declarations...
call scripts\copy-types.bat

echo.
echo [3/4] Building onchain-bot...
call pnpm --filter @solana-arb-bot/onchain-bot build
if errorlevel 1 (
    echo ERROR: Onchain-bot build failed!
    pause
    exit /b 1
)
echo Onchain-bot build: OK

echo.
echo [4/4] Verifying build outputs...
if not exist "packages\core\dist\index.js" (
    echo ERROR: core/dist/index.js missing!
    pause
    exit /b 1
)
if not exist "packages\core\dist\index.d.ts" (
    echo WARNING: core/dist/index.d.ts missing!
)
if not exist "packages\onchain-bot\dist\index.js" (
    echo ERROR: onchain-bot/dist/index.js missing!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build Complete!  
echo ========================================
echo.
echo All packages built successfully.
echo Ready to run: pnpm start:onchain-bot
echo.
pause
