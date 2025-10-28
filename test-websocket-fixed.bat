@echo off
chcp 65001 >nul
echo Testing Solana WebSocket Proxy Connection...
echo.

REM Set proxy environment variables
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
set WS_PROXY=http://127.0.0.1:7890

echo Proxy configuration set:
echo HTTP_PROXY=%HTTP_PROXY%
echo HTTPS_PROXY=%HTTPS_PROXY%
echo WS_PROXY=%WS_PROXY%
echo.

echo Testing direct connection (without proxy):
websocat --text wss://api.mainnet-beta.solana.com --exec "echo {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"slotSubscribe\"}"
echo.

echo Testing proxy connection:
echo Note: websocat may not directly support HTTP proxy, here are alternatives:
echo.
echo 1. Use the project's built-in proxy test script:
echo    node test-websocket-proxy.js
echo.
echo 2. Test proxy connection with curl:
echo    curl -x %HTTP_PROXY% https://api.mainnet-beta.solana.com
echo.
echo 3. Run the bot with project's proxy configuration:
echo    npm run start:onchain-bot
echo.

pause