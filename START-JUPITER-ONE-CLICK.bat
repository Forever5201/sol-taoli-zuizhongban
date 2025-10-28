@echo off
SETLOCAL EnableDelayedExpansion

echo ========================================
echo  Jupiter 本地 API - 一键启动
echo ========================================
echo.
echo 此脚本将自动:
echo 1. 修复 WSL DNS 配置
echo 2. 启动 Windows RPC 代理
echo 3. 启动 Jupiter 本地 API
echo 4. 测试 API 可用性
echo.
pause

REM ===== 步骤 1: 修复 WSL DNS =====
echo.
echo [1/4] 修复 WSL DNS 配置...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 关闭 WSL
wsl --shutdown
timeout /t 2 /nobreak > nul

REM 配置 DNS（使用 root 权限）
wsl -u root bash -c "rm -f /etc/resolv.conf && echo 'nameserver 8.8.8.8' > /etc/resolv.conf && echo 'nameserver 1.1.1.1' >> /etc/resolv.conf && echo '✅ DNS 配置完成'"

REM 测试 DNS
echo.
echo 测试 DNS 解析...
wsl bash -c "ping -c 1 europa2.jup.ag > /dev/null 2>&1 && echo '✅ DNS 正常' || echo '⚠️  DNS 仍有问题，但继续尝试...'"

REM ===== 步骤 2: 启动 RPC 代理 =====
echo.
echo [2/4] 启动 Windows RPC 代理...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 检查是否已在运行
netstat -ano | findstr ":8899" > nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ RPC 代理已在运行
) else (
    echo 启动 RPC 代理...
    start /B cmd /c "node solana-rpc-proxy.js > rpc-proxy.log 2>&1"
    timeout /t 3 /nobreak > nul
    echo ✅ RPC 代理已启动 ^(端口 8899^)
)

REM ===== 步骤 3: 启动 Jupiter API =====
echo.
echo [3/4] 启动 Jupiter 本地 API...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ⏳ 正在启动 Jupiter API（需要 30-60 秒加载市场数据）...
echo    请在新窗口中查看实时日志
echo.

REM 获取 Windows IP（WSL 中）
for /f "tokens=3" %%i in ('wsl bash -c "ip route show | grep default | head -1" ^| find "via"') do set WINDOWS_IP=%%i

echo Windows IP: %WINDOWS_IP%
echo RPC Proxy: http://%WINDOWS_IP%:8899
echo.

REM 在新窗口启动 Jupiter API
start "Jupiter Local API" cmd /k "wsl bash -c 'cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && echo \"🚀 启动 Jupiter API...\" && echo \"RPC: http://%WINDOWS_IP%:8899\" && echo \"\" && ./jupiter-swap-api --rpc-url http://%WINDOWS_IP%:8899 --port 8080 --host 0.0.0.0 --allow-circular-arbitrage --total-thread-count 8'"

echo ✅ Jupiter API 正在新窗口中启动...
echo.
echo ⏳ 等待 50 秒让市场数据加载...

REM 等待加载
for /L %%i in (1,1,50) do (
    <nul set /p="."
    timeout /t 1 /nobreak > nul
)
echo.

REM ===== 步骤 4: 测试 API =====
echo.
echo [4/4] 测试 Jupiter API...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call pnpm tsx test-local-jupiter-api.ts

echo.
echo ========================================
echo  完成！
echo ========================================
echo.
echo 如果测试失败，请:
echo 1. 检查 Jupiter API 窗口的错误信息
echo 2. 查看日志: wsl cat /mnt/e/.../dex-sol/jupiter-*.log
echo 3. 重新运行此脚本
echo.
pause


