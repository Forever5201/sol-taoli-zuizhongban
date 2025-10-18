@echo off
REM
REM Devnet 测试脚本（Windows版本）
REM

echo ==========================================
echo    Devnet 测试脚本
echo ==========================================
echo.

REM 检查 Node.js
echo [1/5] 检查 Node.js 环境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装
    exit /b 1
)
echo ✅ Node.js 已安装
echo.

REM 检查依赖
echo [2/5] 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
)
echo ✅ 依赖已就绪
echo.

REM 检查配置
echo [3/5] 检查配置...
if not exist "configs\global.toml" (
    echo ❌ 全局配置不存在
    echo 请先创建 configs\global.toml
    exit /b 1
)
echo ✅ 配置文件存在
echo.

REM 检查密钥
echo [4/5] 检查密钥文件...
if not exist "test-keypair.json" (
    echo ⚠️  测试密钥不存在
    echo 请先创建测试密钥
    exit /b 1
)
echo ✅ 密钥文件存在
echo.

REM 运行 Bot
echo [5/5] 启动 Bot（60秒测试）...
echo.
timeout /t 60 /nobreak > nul & npm run start:onchain-bot -- --config packages/onchain-bot/config.example.toml
echo.

REM 检查日志
echo 检查日志...
if exist "logs\onchain-bot.log" (
    echo ✅ 日志文件已生成
) else (
    echo ⚠️  未找到日志文件
)

echo.
echo ========== 测试完成 ==========
echo.
pause


