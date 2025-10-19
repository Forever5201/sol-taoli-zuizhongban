@echo off
REM ========================================
REM Solana Arbitrage Bot - Devnet Deployment
REM ========================================

echo.
echo ========================================
echo Solana 套利机器人 - Devnet 部署
echo ========================================
echo.

REM 检查是否存在 devnet 钱包
if not exist "keypairs\devnet-test-wallet.json" (
    echo [错误] 未找到 Devnet 钱包！
    echo.
    echo 请执行以下步骤创建 Devnet 钱包：
    echo 1. 创建新钱包: solana-keygen new -o keypairs\devnet-test-wallet.json
    echo 2. 获取 Devnet SOL: solana airdrop 2 --url devnet --keypair keypairs\devnet-test-wallet.json
    echo 3. 检查余额: solana balance --url devnet --keypair keypairs\devnet-test-wallet.json
    echo.
    pause
    exit /b 1
)

echo [1/5] 检查 Node.js 和 pnpm...
node --version
pnpm --version
if errorlevel 1 (
    echo [错误] 请先安装 Node.js 和 pnpm
    pause
    exit /b 1
)

echo.
echo [2/5] 安装依赖...
call pnpm install
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [3/5] 构建项目...
call pnpm build
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo.
echo [4/5] 检查 Devnet 钱包余额...
solana balance --url devnet --keypair keypairs\devnet-test-wallet.json
if errorlevel 1 (
    echo [警告] 无法获取余额，请确保已安装 Solana CLI
    echo 继续部署...
)

echo.
echo [5/5] 启动 Devnet 测试...
echo.
echo ========================================
echo 环境: DEVNET
echo 配置: .env.devnet
echo 钱包: keypairs\devnet-test-wallet.json
echo ========================================
echo.
echo 按 Ctrl+C 停止机器人
echo.

REM 复制 devnet 配置
copy /Y .env.devnet .env

REM 启动机器人
call pnpm start:onchain-bot

pause
