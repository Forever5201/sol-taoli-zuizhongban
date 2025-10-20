@echo off
REM ===================================================================
REM 闪电贷套利机器人 - 干运行模式（带自托管 Jupiter Server）
REM ===================================================================

echo.
echo ============================================
echo 🚀 Solana 闪电贷套利机器人
echo 🏭 自托管 Jupiter Server 模式
echo 🎭 干运行模式 (DRY RUN - 模拟运行)
echo ============================================
echo.

echo [1/3] 检查钱包配置...
if not exist "keypairs\flashloan-wallet.json" (
    echo ❌ 错误: 未找到钱包文件
    pause
    exit /b 1
)
echo ✅ 钱包文件存在
echo.

echo [2/3] 检查配置文件...
if not exist "configs\flashloan-dryrun.toml" (
    echo ❌ 错误: 未找到配置文件
    pause
    exit /b 1
)
echo ✅ 配置文件存在
echo.

echo [3/3] 启动闪电贷套利机器人...
echo.
echo ============================================
echo 💡 系统配置：
echo   - Jupiter Server: 自托管（本地8080端口）
echo   - 钱包: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
echo   - 模式: 干运行（不发送真实交易）
echo   - Worker: 2个线程
echo   - 查询间隔: 500ms
echo ============================================
echo.
echo 🚀 正在启动...
echo.

REM 使用 tsx 直接运行 TypeScript 代码（不需要编译）
pnpm tsx packages/jupiter-bot/src/flashloan-bot.ts --config=configs/flashloan-dryrun.toml

REM 如果机器人退出
echo.
echo ====================================
echo 机器人已停止
echo ====================================
pause

