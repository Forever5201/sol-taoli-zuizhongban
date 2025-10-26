@echo off
chcp 65001 >nul
REM ===================================================================
REM 闪电贷套利机器人 - 干运行模式启动脚本
REM ===================================================================

echo.
echo ====================================
echo [Solana Flashloan Arbitrage Bot]
echo [DRY RUN MODE - Simulation Only]
echo ====================================
echo.

REM 检查钱包文件
echo [1/3] Checking wallet configuration...
if not exist "keypairs\flashloan-wallet.json" (
    echo [ERROR] Wallet file not found
    echo Please ensure keypairs\flashloan-wallet.json exists
    pause
    exit /b 1
)
echo [OK] Wallet file exists
echo.

REM 检查配置文件
echo [2/3] Checking config file...
if not exist "configs\flashloan-dryrun.toml" (
    echo [ERROR] Config file not found
    echo Please ensure configs\flashloan-dryrun.toml exists
    pause
    exit /b 1
)
echo [OK] Config file exists
echo.

REM 显示钱包信息
echo [Wallet Info]
echo Address: 6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG
solana balance keypairs\flashloan-wallet.json 2>nul
if %ERRORLEVEL% neq 0 (
    echo (Cannot query balance, ensure Solana CLI is installed)
)
echo.

REM 启动机器人
echo [3/3] Starting Flashloan Arbitrage Bot (Dry Run Mode)...
echo.
echo ====================================
echo [DEEP SIMULATION MODE DESCRIPTION]
echo [+] Will scan REAL arbitrage opportunities
echo [+] Will BUILD REAL swap instructions (Jupiter API)
echo [+] Will SIGN transactions with your wallet
echo [+] Will CALCULATE Jito tip
echo [+] Will BUILD complete Jito Bundle
echo [-] Will NOT send Bundle to chain
echo [-] Will NOT consume SOL (no gas fees)
echo ====================================
echo.
echo [Tips]
echo - Press Ctrl+C to stop the bot anytime
echo - Log file: logs\flashloan-dryrun.log
echo - Config file: configs\flashloan-dryrun.toml
echo.
echo [Starting...]
echo.

REM 启动机器人（使用干运行配置）
pnpm start:flashloan -- --config=configs/flashloan-dryrun.toml

REM 如果机器人退出
echo.
echo ====================================
echo 机器人已停止
echo ====================================
pause

