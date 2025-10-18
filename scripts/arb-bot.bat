@echo off
chcp 65001 >nul
REM ========================================
REM Solana Arbitrage Bot 启动脚本 (Windows)
REM ========================================

echo ========================================
echo 🚀 Solana Arbitrage Bot Launcher
echo ========================================
echo.

REM ========================================
REM 检查Node.js
REM ========================================
echo [1/4] 检查Node.js环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装
    echo.
    echo 请访问 https://nodejs.org 下载安装
    echo 推荐版本: 20.x LTS
    pause
    exit /b 1
)

REM 检查版本
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo    Node.js版本: %NODE_VERSION%
echo    ✅ Node.js已安装
echo.

REM ========================================
REM 检查依赖
REM ========================================
echo [2/4] 检查项目依赖...

if not exist "node_modules" (
    echo    ⚠️  依赖未安装
    echo    正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo    ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo    ✅ 依赖安装完成
) else (
    echo    ✅ 依赖已安装
)
echo.

REM ========================================
REM 编译代码
REM ========================================
echo [3/4] 编译TypeScript代码...

if not exist "packages\launcher\dist" (
    echo    正在编译...
    call npm run build >nul 2>nul
    if %errorlevel% neq 0 (
        echo    ❌ 编译失败
        echo    运行 'npm run build' 查看详细错误
        pause
        exit /b 1
    )
    echo    ✅ 编译完成
) else (
    echo    ✅ 代码已编译
)
echo.

REM ========================================
REM 启动Launcher
REM ========================================
echo [4/4] 启动Launcher...
echo.

REM 解析命令行参数
set CONFIG_FILE=configs\launcher.toml
if "%1"=="--config" set CONFIG_FILE=%2
if "%1"=="-c" set CONFIG_FILE=%2

echo 配置文件: %CONFIG_FILE%
echo.

REM 启动
node packages\launcher\dist\index.js --config %CONFIG_FILE%

REM 退出处理
if %errorlevel% neq 0 (
    echo.
    echo ❌ Launcher异常退出
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Launcher正常退出
pause
