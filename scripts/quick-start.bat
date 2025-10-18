@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Solana 套利机器人 - 快速配置
echo ========================================
echo.

REM 步骤1：检查配置文件
echo [Step 1/4] 检查配置文件...
if exist test-config.toml (
    echo [OK] 找到测试配置文件
) else (
    echo [ERROR] 找不到 test-config.toml
    echo 请确保在项目根目录运行此脚本
    pause
    exit /b 1
)
echo.

REM 步骤2：创建 keypairs 目录
echo [Step 2/4] 创建密钥目录...
if not exist keypairs (
    mkdir keypairs
    echo [OK] 已创建 keypairs 目录
) else (
    echo [OK] keypairs 目录已存在
)
echo.

REM 步骤3：检查钱包
echo [Step 3/4] 检查钱包文件...
if exist keypairs\test-wallet.json (
    echo [OK] 找到钱包文件
    echo.
    echo 是否要创建新钱包？当前钱包将被备份。
    choice /C YN /M "创建新钱包 (Y/N)"
    if errorlevel 2 goto skip_wallet
    if errorlevel 1 goto create_wallet
) else (
    goto create_wallet
)

:create_wallet
echo.
echo 正在创建新钱包...
solana-keygen new -o keypairs\test-wallet.json --no-passphrase
if %errorlevel% neq 0 (
    echo [ERROR] 创建钱包失败
    echo 请确保已安装 Solana CLI
    echo 下载地址：https://docs.solana.com/cli/install-solana-cli-tools
    pause
    exit /b 1
)
echo [OK] 钱包创建成功
echo.

REM 步骤4：获取测试币
echo [Step 4/4] 获取 Devnet 测试币...
echo 正在请求空投...
solana airdrop 2 keypairs\test-wallet.json --url devnet
if %errorlevel% neq 0 (
    echo [WARNING] 第一次空投失败，重试中...
    timeout /t 2 /nobreak >nul
    solana airdrop 2 keypairs\test-wallet.json --url devnet
)

echo.
echo 等待2秒...
timeout /t 2 /nobreak >nul

echo 再次请求空投...
solana airdrop 2 keypairs\test-wallet.json --url devnet

echo.
echo 查看余额...
solana balance keypairs\test-wallet.json --url devnet

goto config_done

:skip_wallet
echo [OK] 跳过钱包创建
echo.

:config_done
echo.
echo ========================================
echo  配置完成！
echo ========================================
echo.
echo 你的钱包地址：
solana-keygen pubkey keypairs\test-wallet.json
echo.
echo 你的钱包余额：
solana balance keypairs\test-wallet.json --url devnet
echo.
echo ========================================
echo  下一步
echo ========================================
echo.
echo 1. 查看配置指南：
echo    notepad 配置步骤.md
echo.
echo 2. 运行干运行测试：
echo    npm run start:onchain-bot -- --config test-config.toml
echo.
echo 3. 如果成功，编辑配置文件改为真实测试：
echo    notepad test-config.toml
echo    找到 dry_run = true 改为 dry_run = false
echo.
echo 4. 重新运行：
echo    npm run start:onchain-bot -- --config test-config.toml
echo.
pause
