@echo off
REM ===================================================================
REM 闪电贷套利机器人 - 干运行模式启动脚本
REM ===================================================================

echo.
echo ====================================
echo 🚀 Solana 闪电贷套利机器人
echo 🎭 干运行模式 (DRY RUN - 模拟运行)
echo ====================================
echo.

REM 检查钱包文件
echo [1/3] 检查钱包配置...
if not exist "keypairs\flashloan-wallet.json" (
    echo ❌ 错误: 未找到钱包文件
    echo 请确保 keypairs\flashloan-wallet.json 存在
    pause
    exit /b 1
)
echo ✅ 钱包文件存在
echo.

REM 检查配置文件
echo [2/3] 检查配置文件...
if not exist "configs\flashloan-dryrun.toml" (
    echo ❌ 错误: 未找到配置文件
    echo 请确保 configs\flashloan-dryrun.toml 存在
    pause
    exit /b 1
)
echo ✅ 配置文件存在
echo.

REM 显示钱包信息
echo 📄 钱包信息:
echo 地址: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
solana balance keypairs\flashloan-wallet.json 2>nul
if %ERRORLEVEL% neq 0 (
    echo (无法查询余额，请确保Solana CLI已安装)
)
echo.

REM 启动机器人
echo [3/3] 启动闪电贷套利机器人（干运行模式）...
echo.
echo ====================================
echo 🎭 干运行模式说明：
echo ✅ 会扫描真实的套利机会
echo ✅ 会计算闪电贷金额和利润
echo ✅ 会显示详细的交易路径
echo ❌ 但不会发送真实交易
echo ❌ 不会消耗 SOL（除了少量 RPC 查询）
echo ====================================
echo.
echo 💡 提示：
echo - 按 Ctrl+C 可以随时停止机器人
echo - 日志文件: logs\flashloan-dryrun.log
echo - 配置文件: configs\flashloan-dryrun.toml
echo.
echo 🚀 正在启动...
echo.

REM 启动机器人（使用干运行配置）
pnpm start:flashloan -- --config=configs/flashloan-dryrun.toml

REM 如果机器人退出
echo.
echo ====================================
echo 机器人已停止
echo ====================================
pause

