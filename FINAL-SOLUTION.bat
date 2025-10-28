@echo off
SETLOCAL

echo ========================================
echo  Jupiter 本地 API - 终极解决方案
echo ========================================
echo.
echo 此脚本将：
echo 1. 安装 Proxychains（如需要）
echo 2. 配置 Proxychains 使用 Clash 代理
echo 3. 启动 Jupiter API（强制通过代理）
echo.
echo 💡 原理：Proxychains 强制所有 TCP 连接通过 Clash
echo    （即使程序不支持 HTTP_PROXY 环境变量）
echo.
pause

REM 检查 Clash
echo.
echo [检查] Clash 状态...
netstat -ano | findstr ":7890" > nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Clash 代理运行中（端口 7890）
) else (
    echo ❌ Clash 未运行或端口不是 7890
    echo 请确保 Clash 正在运行！
    pause
    exit /b 1
)

REM 步骤 1: 安装配置 Proxychains
echo.
echo [1/2] 安装配置 Proxychains...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && chmod +x setup-proxychains.sh && ./setup-proxychains.sh"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Proxychains 配置失败
    pause
    exit /b 1
)

REM 步骤 2: 启动 Jupiter API
echo.
echo [2/2] 启动 Jupiter API...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ✅ 正在新窗口中启动 Jupiter API...
echo.
echo 请在新窗口中观察启动过程：
echo   1. 测试代理连接 ✅
echo   2. 测试访问 Europa ✅
echo   3. 启动 Jupiter API
echo   4. Fetching markets from europa server... ← 应该成功！
echo   5. Loaded XXXXX markets ← 应该成功！
echo   6. Server listening on http://0.0.0.0:8080 ← 成功！
echo.

start "Jupiter API (Proxychains)" wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && chmod +x start-jupiter-with-proxychains.sh && ./start-jupiter-with-proxychains.sh"

echo ⏳ 等待 60 秒让市场数据加载...
timeout /t 60 /nobreak

REM 测试 API
echo.
echo [测试] 测试 Jupiter API...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call pnpm tsx test-local-jupiter-api.ts

echo.
echo ========================================
echo  完成！
echo ========================================
echo.
echo 如果测试成功，您可以启动 Bot：
echo   $env:USE_LOCAL_JUPITER_API="true"
echo   pnpm start:flashloan
echo.
echo 如果测试失败，请检查新窗口中的错误信息
echo.
pause


