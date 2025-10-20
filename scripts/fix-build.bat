@echo off
echo ========================================
echo Fixing TypeScript Build Issues
echo ========================================
echo.

cd /d E:\6666666666666666666666666666\dex-cex\dex-sol

echo [1/5] Cleaning old builds...
call pnpm --filter @solana-arb-bot/core clean
call pnpm --filter @solana-arb-bot/onchain-bot clean

echo.
echo [2/5] Building core with verbose output...
cd packages\core
call npx tsc --declaration --declarationMap --emitDeclarationOnly
cd ..\..

echo.
echo [3/5] Checking generated files...
dir packages\core\dist\index.d.ts 2>nul
if errorlevel 1 (
    echo ERROR: index.d.ts not generated!
    echo Trying alternative approach...
    cd packages\core
    call npx tsc --declaration true
    cd ..\..
)

echo.
echo [4/5] Building core JavaScript...
cd packages\core
call npx tsc --declaration false
cd ..\..

echo.
echo [5/5] Checking results...
dir packages\core\dist\*.js
dir packages\core\dist\*.d.ts

echo.
echo ========================================
echo Build process complete
echo ========================================
pause
