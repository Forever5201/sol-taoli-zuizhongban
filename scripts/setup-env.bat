@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Solana Arbitrage Bot - Environment Setup
echo ========================================
echo.

REM 检查Node.js是否安装
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

REM 检查Node.js版本
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM 提取主版本号（去掉v前缀）
set NODE_VERSION=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a

if %NODE_MAJOR% lss 20 (
    echo [ERROR] Node.js version must be 20 or higher!
    echo Current version: %NODE_VERSION%
    echo Please upgrade Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js %NODE_VERSION% detected
echo.

REM 检查npm
echo [2/6] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% detected
echo.

REM 清理旧的node_modules
echo [3/6] Cleaning old dependencies...
if exist node_modules (
    echo Removing root node_modules...
    rmdir /s /q node_modules
)
if exist packages\core\node_modules (
    echo Removing core node_modules...
    rmdir /s /q packages\core\node_modules
)
if exist packages\onchain-bot\node_modules (
    echo Removing onchain-bot node_modules...
    rmdir /s /q packages\onchain-bot\node_modules
)
echo [OK] Cleanup complete
echo.

REM 安装根依赖
echo [4/6] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies!
    pause
    exit /b 1
)
echo [OK] Root dependencies installed
echo.

REM 安装核心包依赖
echo [5/6] Installing core package dependencies...
cd packages\core
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install core dependencies!
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo [OK] Core dependencies installed
echo.

REM 安装onchain-bot依赖
echo [6/6] Installing onchain-bot dependencies...
cd packages\onchain-bot
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install onchain-bot dependencies!
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo [OK] Onchain-bot dependencies installed
echo.

REM 构建项目
echo [7/6] Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo [WARNING] Build failed, but dependencies are installed
    echo You can manually run: npm run build
) else (
    echo [OK] Build successful
)
echo.

echo ========================================
echo  Environment Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Review configuration files in packages/onchain-bot/
echo 2. Copy config.example.toml or config.jito.toml
echo 3. Edit your config file with your settings
echo 4. Run: npm run start:onchain-bot -- --config your-config.toml
echo.
echo Quick test commands:
echo - npm run demo                  (Test economics model)
echo - npm run cost-sim             (Cost simulator)
echo - npm run jito-monitor         (Jito tip monitor)
echo.
pause
