@echo off
REM 方案 3：使用 Windows RPC 代理
REM 
REM 步骤：
REM 1. 启动 Node.js RPC 代理（Windows）
REM 2. 启动 Jupiter API，连接到本地代理（WSL）

echo ========================================
echo  启动 Jupiter API (通过 RPC 代理)
echo ========================================
echo.

REM 1. 在后台启动 RPC 代理
echo [1/3] 启动 Solana RPC 代理...
start /B cmd /c "node solana-rpc-proxy.js > rpc-proxy.log 2>&1"
timeout /t 3 /nobreak > nul
echo      ✅ RPC 代理已启动 (http://localhost:8899)
echo.

REM 2. 获取 Windows 在 WSL 中的 IP
echo [2/3] 检测 Windows IP...
for /f "tokens=*" %%i in ('wsl bash -c "ip route show | grep -i default | awk '{ print $3}'"') do set WINDOWS_IP=%%i
echo      Windows IP: %WINDOWS_IP%
echo.

REM 3. 启动 Jupiter API（连接到 Windows 的 RPC 代理）
echo [3/3] 启动 Jupiter API...
echo      连接到: http://%WINDOWS_IP%:8899
echo.
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && ./jupiter-swap-api --rpc-url 'http://%WINDOWS_IP%:8899' --port 8080 --host 0.0.0.0 --allow-circular-arbitrage --total-thread-count 8"

echo.
echo ❌ Jupiter API 已停止
pause


