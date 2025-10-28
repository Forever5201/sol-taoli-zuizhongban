@echo off
SETLOCAL

echo ========================================
echo  Jupiter Local API - 简单测试
echo ========================================
echo.

echo [1/2] 在 Clash 中确认：
echo   - Clash 正在运行 ✅
echo   - Allow LAN 已启用 ✅
echo   - HTTP 代理端口：7890 ✅
echo.
pause

echo.
echo [2/2] 启动 Jupiter API（新窗口）...
start "Jupiter API" wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && export HTTP_PROXY=http://172.23.176.1:7890 && export HTTPS_PROXY=http://172.23.176.1:7890 && echo '🚀 Starting Jupiter API with Clash Proxy...' && echo 'Proxy: http://172.23.176.1:7890' && echo '' && ./jupiter-swap-api --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' --port 8080 --host 0.0.0.0 --allow-circular-arbitrage"

echo.
echo ✅ Jupiter API 正在新窗口中启动...
echo.
echo 请在新窗口中观察：
echo   - 是否看到 "[INFO] Loading Jupiter router..."
echo   - 是否看到 "[INFO] Fetching markets from europa server..."
echo   - 是否看到 "[INFO] Loaded XXXXX markets"
echo   - 是否看到 "[INFO] Server listening on http://0.0.0.0:8080"
echo.
echo 如果看到 "DNS error" 或 "failed to lookup":
echo   → 请在 Clash 中启用 "Allow LAN"
echo.
echo 等待 50 秒后将自动测试 API...
timeout /t 50 /nobreak

echo.
echo [测试] 调用 Jupiter API...
call pnpm tsx test-local-jupiter-api.ts

echo.
pause


