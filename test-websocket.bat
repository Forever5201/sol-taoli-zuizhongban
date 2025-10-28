@echo off
echo 正在测试 Solana WebSocket 代理连接...
echo.

REM 设置代理环境变量
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
set WS_PROXY=http://127.0.0.1:7890

echo 代理配置已设置:
echo HTTP_PROXY=%HTTP_PROXY%
echo HTTPS_PROXY=%HTTPS_PROXY%
echo WS_PROXY=%WS_PROXY%
echo.

REM 使用 websocat 测试 WebSocket 连接
echo 测试直连 (不使用代理):
websocat --text wss://api.mainnet-beta.solana.com --exec "echo {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"slotSubscribe\"}"
echo.

echo 测试通过代理连接:
REM 尝试通过代理连接，但websocat可能不直接支持代理
echo 注意: websocat 可能不直接支持HTTP代理，以下是替代方案:
echo.
echo 1. 使用项目内置的代理测试脚本:
echo    node test-websocket-proxy.js
echo.
echo 2. 使用curl测试代理连接:
echo    curl -x %HTTP_PROXY% https://api.mainnet-beta.solana.com
echo.
echo 3. 使用项目中的代理配置运行机器人:
echo    npm run start:onchain-bot
echo.

pause