@echo off
REM ========================================
REM 闪电贷套利配置向导
REM ========================================

echo.
echo ========================================
echo   闪电贷套利系统配置向导
echo ========================================
echo.

REM 步骤 1: 复制配置文件
echo [步骤 1/5] 复制配置文件...
if exist .env.flashloan (
    echo.
    echo 发现现有配置文件 .env.flashloan
    choice /C YN /M "是否使用现有配置"
    if errorlevel 2 (
        echo 创建新配置...
        copy /Y .env.example .env.flashloan
    )
) else (
    copy /Y .env.example .env.flashloan
    echo 已创建配置文件 .env.flashloan
)

REM 激活配置
copy /Y .env.flashloan .env
echo 已激活闪电贷配置
echo.

REM 步骤 2: 检查钱包
echo [步骤 2/5] 检查钱包...
echo.
if exist keypairs\flashloan-wallet.json (
    echo [OK] 发现现有钱包: keypairs\flashloan-wallet.json
    echo.
    echo 钱包地址:
    solana-keygen pubkey keypairs\flashloan-wallet.json 2>nul
    if errorlevel 1 (
        echo [警告] 无法读取钱包，可能需要重新创建
    ) else (
        echo.
        echo 查询余额...
        solana balance --keypair keypairs\flashloan-wallet.json 2>nul
        if errorlevel 1 (
            echo [提示] 无法查询余额，请确保已安装 Solana CLI
        )
    )
) else (
    echo [提示] 未发现钱包文件
    echo.
    echo 创建新钱包需要 Solana CLI
    echo 安装方法: https://docs.solana.com/cli/install-solana-cli-tools
    echo.
    choice /C YN /M "现在创建新钱包"
    if errorlevel 2 (
        echo.
        echo 跳过钱包创建
        echo 请稍后手动创建: solana-keygen new -o keypairs\flashloan-wallet.json
    ) else (
        echo.
        echo 创建新钱包...
        if not exist keypairs mkdir keypairs
        solana-keygen new -o keypairs\flashloan-wallet.json
        if errorlevel 0 (
            echo.
            echo [成功] 钱包已创建！
            echo [重要] 请妥善保管助记词！
            echo.
            echo 钱包地址:
            solana-keygen pubkey keypairs\flashloan-wallet.json
        ) else (
            echo.
            echo [错误] 钱包创建失败
            echo 请确保已安装 Solana CLI
        )
    )
)
echo.

REM 步骤 3: RPC 配置
echo [步骤 3/5] RPC 配置...
echo.
echo 当前配置的 RPC:
findstr "SOLANA_RPC_URL" .env
echo.
echo [重要] 免费 RPC 性能有限，强烈推荐使用付费 RPC:
echo   - QuickNode: https://www.quicknode.com/
echo   - Helius: https://www.helius.dev/
echo   - Alchemy: https://www.alchemy.com/
echo.
choice /C YN /M "是否现在配置自定义 RPC"
if errorlevel 2 (
    echo.
    echo 使用默认 RPC (性能可能受限)
) else (
    echo.
    set /p RPC_URL="请输入您的 RPC URL: "
    echo SOLANA_RPC_URL=!RPC_URL! >> .env.temp
    echo SOLANA_RPC_URLS=!RPC_URL! >> .env.temp
    
    REM 更新配置文件
    powershell -Command "(Get-Content .env) -replace 'SOLANA_RPC_URL=.*', 'SOLANA_RPC_URL=!RPC_URL!' | Set-Content .env.temp"
    move /Y .env.temp .env
    echo.
    echo [成功] RPC 已更新
)
echo.

REM 步骤 4: 闪电贷参数
echo [步骤 4/5] 闪电贷参数配置...
echo.
echo 当前配置:
findstr "MAX_FLASHLOAN_AMOUNT" .env
findstr "MIN_PROFIT_AFTER_FEES" .env
echo.
echo 建议配置:
echo   新手: 最大借款 20 SOL, 最小利润 0.5 SOL
echo   进阶: 最大借款 100 SOL, 最小利润 0.5 SOL
echo   专家: 最大借款 200 SOL, 最小利润 1 SOL
echo.
choice /C 123S /M "选择配置 (1=新手, 2=进阶, 3=专家, S=跳过)"
if errorlevel 4 (
    echo 跳过配置
) else if errorlevel 3 (
    echo MAX_FLASHLOAN_AMOUNT=200000000000 > .env.temp
    echo MIN_PROFIT_AFTER_FEES=1000000000 >> .env.temp
    echo [成功] 已设置专家配置
) else if errorlevel 2 (
    echo MAX_FLASHLOAN_AMOUNT=100000000000 > .env.temp
    echo MIN_PROFIT_AFTER_FEES=500000000 >> .env.temp
    echo [成功] 已设置进阶配置
) else (
    echo MAX_FLASHLOAN_AMOUNT=20000000000 > .env.temp
    echo MIN_PROFIT_AFTER_FEES=500000000 >> .env.temp
    echo [成功] 已设置新手配置
)
echo.

REM 步骤 5: 验证配置
echo [步骤 5/5] 验证配置...
echo.
echo 正在运行闪电贷演示...
call pnpm tsx packages/core/src/flashloan/example.ts
echo.

REM 配置完成
echo.
echo ========================================
echo 配置完成！
echo ========================================
echo.
echo 配置文件位置: .env
echo 钱包位置: keypairs\flashloan-wallet.json
echo.
echo [下一步]
echo.
echo 1. 充值钱包（至少 0.1 SOL）
echo    地址:
solana-keygen pubkey keypairs\flashloan-wallet.json 2>nul
echo.
echo 2. 检查余额:
echo    solana balance --keypair keypairs\flashloan-wallet.json
echo.
echo 3. 启动机器人:
echo    pnpm start:onchain-bot
echo.
echo 4. 或运行演示:
echo    scripts\flashloan-demo.bat
echo.
echo ========================================
echo.

pause
