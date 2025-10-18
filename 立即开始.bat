@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 Solana套利机器人 - 快速开始
echo ========================================
echo.

echo [1/4] 安装核心依赖...
cd packages\core
call npm install
if %errorlevel% neq 0 (
    echo ❌ 核心依赖安装失败
    pause
    exit /b 1
)
cd ..\..

echo.
echo [2/4] 安装根依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 根依赖安装失败
    pause
    exit /b 1
)

echo.
echo [3/4] 测试Jupiter集成...
call npm run test-jupiter
if %errorlevel% neq 0 (
    echo ⚠️ Jupiter测试失败，但可以继续
)

echo.
echo [4/4] 安装OnChainBot依赖...
cd packages\onchain-bot
call npm install
cd ..\..

echo.
echo ========================================
echo ✅ 安装完成！
echo ========================================
echo.
echo 📚 下一步：
echo 1. 阅读：下一步行动计划_详细版.md
echo 2. 阅读：JUPITER_SWAP_INTEGRATION.md
echo 3. 修改：packages\onchain-bot\src\index.ts
echo 4. 测试：npm run start:onchain-bot
echo.
echo 🎯 关键任务：
echo - 集成真实Swap到OnChainBot（2小时）
echo - Devnet完整测试（1小时）
echo - 准备Mainnet部署
echo.
pause
