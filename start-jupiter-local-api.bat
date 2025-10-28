@echo off
REM Jupiter 本地 API 服务器启动脚本
REM 使用 WSL Ubuntu 运行

echo ========================================
echo  Jupiter Local API Server
echo ========================================
echo.

REM 检查 WSL 是否可用
wsl --list --verbose >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] WSL 未安装或不可用
    echo 请先安装 WSL: wsl --install -d Ubuntu
    pause
    exit /b 1
)

echo [INFO] 启动 Jupiter Local API...
echo [INFO] RPC: Helius
echo [INFO] Port: 8080
echo [INFO] Mode: 允许环形套利
echo.

REM 在 WSL 中启动服务（后台运行）
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && chmod +x jupiter-swap-api && nohup ./jupiter-swap-api --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' --port 8080 --host 0.0.0.0 --allow-circular-arbitrage --total-thread-count 16 --webserver-thread-count 4 --update-thread-count 8 > jupiter-api.log 2>&1 &"

REM 等待服务启动
echo [INFO] 等待服务启动...
timeout /t 5 /nobreak >nul

REM 测试服务
echo [INFO] 测试服务健康状态...
curl -s http://localhost:8080/health >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  [SUCCESS] Jupiter API 启动成功！
    echo ========================================
    echo.
    echo  API 地址: http://localhost:8080
    echo  日志文件: jupiter-api.log
    echo.
    echo  测试命令:
    echo  curl http://localhost:8080/health
    echo.
    echo  在您的 Bot 中使用:
    echo  export JUPITER_LOCAL_API=http://localhost:8080
    echo  npm run start:flashloan
    echo.
) else (
    echo.
    echo [WARNING] 服务可能正在启动中...
    echo 请等待 30 秒后检查日志:
    echo wsl cat /mnt/e/6666666666666666666666666666/dex-cex/dex-sol/jupiter-api.log
    echo.
)

echo 按任意键退出...
pause >nul


