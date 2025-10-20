@echo off
echo.
echo ========================================
echo Build System Diagnostics
echo ========================================
echo.

set ERRORS=0

echo [1/6] Checking TypeScript installation...
where tsc >nul 2>&1
if errorlevel 1 (
    echo ERROR: TypeScript not found!
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%i in ('tsc --version') do echo OK: %%i
)

echo.
echo [2/6] Checking pnpm installation...
where pnpm >nul 2>&1
if errorlevel 1 (
    echo ERROR: pnpm not found!
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%i in ('pnpm --version') do echo OK: pnpm %%i
)

echo.
echo [3/6] Checking core package build...
if exist "packages\core\dist\index.js" (
    echo OK: core/dist/index.js exists
) else (
    echo ERROR: core/dist/index.js missing!
    set /a ERRORS+=1
)

if exist "packages\core\dist\index.d.ts" (
    echo OK: core/dist/index.d.ts exists
) else (
    echo WARNING: core/dist/index.d.ts missing!
    echo Run: scripts\copy-types.bat
)

echo.
echo [4/6] Checking onchain-bot build...
if exist "packages\onchain-bot\dist\index.js" (
    echo OK: onchain-bot/dist/index.js exists
) else (
    echo ERROR: onchain-bot/dist/index.js missing!
    set /a ERRORS+=1
)

echo.
echo [5/6] Checking wallet configuration...
if exist "keypairs\flashloan-wallet.json" (
    echo OK: Wallet file exists
) else (
    echo ERROR: Wallet file missing!
    set /a ERRORS+=1
)

if exist ".env" (
    echo OK: .env file exists
) else (
    echo ERROR: .env file missing!
    set /a ERRORS+=1
)

echo.
echo [6/6] Checking node_modules...
if exist "node_modules" (
    echo OK: node_modules exists
) else (
    echo ERROR: node_modules missing! Run: pnpm install
    set /a ERRORS+=1
)

echo.
echo ========================================
echo Diagnostic Summary
echo ========================================
echo.

if %ERRORS%==0 (
    echo Status: ALL CHECKS PASSED
    echo.
    echo System is ready to run!
    echo Next: pnpm start:onchain-bot
) else (
    echo Status: %ERRORS% ERROR(S) FOUND
    echo.
    echo Recommended actions:
    echo 1. Run: pnpm install
    echo 2. Run: scripts\rebuild-all.bat
    echo 3. Check wallet and .env files
)

echo.
pause
