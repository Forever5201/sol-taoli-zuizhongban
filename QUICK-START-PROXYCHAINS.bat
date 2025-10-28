@echo off
SETLOCAL

echo ========================================
echo  Jupiter API - Proxychains 快速启动
echo ========================================
echo.
echo 前提条件：
echo 1. 已在 WSL 中安装 proxychains-ng
echo    （如未安装，请在 WSL 终端运行：sudo apt-get install -y proxychains-ng）
echo 2. Clash 正在运行（端口 7890）
echo.
pause

REM 检查 Clash
netstat -ano | findstr ":7890" > nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Clash 未运行或端口不是 7890
    pause
    exit /b 1
)
echo ✅ Clash 运行中

REM 配置 Proxychains
echo.
echo 配置 Proxychains...
wsl bash -c "cat > /tmp/proxychains-jupiter.conf << 'EOF'
strict_chain
proxy_dns
remote_dns_subnet 224
tcp_read_time_out 15000
tcp_connect_time_out 8000
quiet_mode

[ProxyList]
http 127.0.0.1 7890
EOF"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 配置失败
    pause
    exit /b 1
)
echo ✅ 配置完成

REM 测试 Proxychains
echo.
echo 测试 Proxychains...
wsl bash -c "proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 https://www.google.com > /dev/null 2>&1"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Proxychains 未安装或测试失败
    echo.
    echo 请在 WSL 终端中运行：
    echo   sudo apt-get update
    echo   sudo apt-get install -y proxychains-ng
    echo.
    pause
    exit /b 1
)
echo ✅ Proxychains 工作正常

REM 启动 Jupiter API
echo.
echo ========================================
echo  启动 Jupiter API
echo ========================================
echo.
start "Jupiter API (Proxychains)" wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && chmod +x start-jupiter-with-proxychains.sh && ./start-jupiter-with-proxychains.sh"

echo ✅ Jupiter API 正在新窗口中启动...
echo.
echo 请在新窗口中观察：
echo   1. ✅ Proxychains 已安装
echo   2. ✅ 代理连接正常
echo   3. ✅ 可以访问 europa2.jup.ag
echo   4. 🚀 启动 Jupiter API（通过 Proxychains）
echo   5. [proxychains] Strict chain ... 127.0.0.1:7890 ... OK  ← 关键！
echo   6. [INFO] Fetching markets from europa server...        ← 应该出现！
echo   7. [INFO] Loaded XXXXX markets                          ← 成功！
echo   8. [INFO] Server listening on http://0.0.0.0:8080       ← 成功！
echo.
echo 等待 60 秒让市场数据加载...
timeout /t 60 /nobreak

REM 测试 API
echo.
echo ========================================
echo  测试 Jupiter API
echo ========================================
call pnpm tsx test-local-jupiter-api.ts

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo ✅ 成功！Jupiter API 正常运行
    echo.
    echo 现在可以启动 Bot：
    echo   $env:USE_LOCAL_JUPITER_API="true"
    echo   pnpm start:flashloan
) else (
    echo ⚠️  测试失败，请检查新窗口中的日志
)
echo ========================================
echo.
pause


