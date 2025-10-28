@echo off
chcp 65001 >nul
echo Solana WebSocket Proxy Test
echo ==========================
echo.

echo Testing direct connection to Solana WebSocket API:
echo.

REM Test direct connection without proxy
echo Command: websocat wss://api.mainnet-beta.solana.com
echo.
websocat wss://api.mainnet-beta.solana.com --exec "echo {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"slotSubscribe\"}" --timeout 10
echo.

echo Testing connection through Clash VPN proxy (port 7890):
echo.

REM Set proxy environment variables
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890

echo Proxy environment variables set:
echo HTTP_PROXY=%HTTP_PROXY%
echo HTTPS_PROXY=%HTTPS_PROXY%
echo.

REM Try to test with proxy (websocat may not respect proxy env vars)
echo Command: websocat wss://api.mainnet-beta.solana.com (with proxy env vars)
echo.
websocat wss://api.mainnet-beta.solana.com --exec "echo {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"slotSubscribe\"}" --timeout 10
echo.

echo Testing HTTP connection through proxy:
echo.
echo Command: curl -x http://127.0.0.1:7890 https://api.mainnet-beta.solana.com
powershell -Command "Invoke-WebRequest -Uri 'https://api.mainnet-beta.solana.com' -Proxy 'http://127.0.0.1:7890'"
echo.

echo ==========================================
echo Test Results Summary:
echo.
echo If direct connection failed but proxy HTTP connection succeeded,
echo your Clash VPN is working but WebSocket may need special configuration.
echo.
echo If both connections failed, check:
echo 1. Is Clash VPN running on port 7890?
echo 2. Is your internet connection working?
echo 3. Is Windows Firewall blocking the connection?
echo.
echo For more information, see:
echo - docs/代理配置快速指南.md
echo - docs/config/PROXY_SETUP.md
echo ==========================================

pause