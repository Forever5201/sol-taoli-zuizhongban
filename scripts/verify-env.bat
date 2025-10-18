@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Environment Verification
echo ========================================
echo.

set "ERRORS=0"

REM 检查Node.js
echo [Check 1/8] Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Node.js not found
    set /a ERRORS+=1
) else (
    for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [PASS] Node.js !NODE_VERSION!
)

REM 检查npm
echo [Check 2/8] npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] npm not found
    set /a ERRORS+=1
) else (
    for /f "tokens=1" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [PASS] npm !NPM_VERSION!
)

REM 检查TypeScript
echo [Check 3/8] TypeScript...
where tsc >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] TypeScript not installed globally (OK, using local)
) else (
    for /f "tokens=1" %%i in ('tsc --version') do set TSC_VERSION=%%i
    echo [PASS] TypeScript !TSC_VERSION!
)

REM 检查根依赖
echo [Check 4/8] Root dependencies...
if exist node_modules (
    echo [PASS] Root node_modules exists
) else (
    echo [FAIL] Root node_modules missing
    echo Run: npm install
    set /a ERRORS+=1
)

REM 检查core依赖
echo [Check 5/8] Core package dependencies...
if exist packages\core\node_modules (
    echo [PASS] Core node_modules exists
) else (
    echo [FAIL] Core node_modules missing
    echo Run: cd packages/core ^&^& npm install
    set /a ERRORS+=1
)

REM 检查onchain-bot依赖
echo [Check 6/8] Onchain-bot dependencies...
if exist packages\onchain-bot\node_modules (
    echo [PASS] Onchain-bot node_modules exists
) else (
    echo [FAIL] Onchain-bot node_modules missing
    echo Run: cd packages/onchain-bot ^&^& npm install
    set /a ERRORS+=1
)

REM 检查构建产物
echo [Check 7/8] Build output...
if exist packages\core\dist (
    echo [PASS] Core build exists
) else (
    echo [INFO] Core not built (run: npm run build)
)

REM 检查配置文件
echo [Check 8/8] Configuration files...
if exist packages\onchain-bot\config.example.toml (
    echo [PASS] Example config exists
) else (
    echo [FAIL] Example config missing
    set /a ERRORS+=1
)

echo.
echo ========================================
if %ERRORS%==0 (
    echo [SUCCESS] Environment is ready!
    echo.
    echo You can now:
    echo - Run demo: npm run demo
    echo - Start bot: npm run start:onchain-bot
) else (
    echo [WARNING] Found %ERRORS% issues
    echo.
    echo Run: scripts\setup-env.bat
    echo to fix missing dependencies
)
echo ========================================
echo.
pause
