@echo off
REM 使用 Clash 代理启动 Rust Pool Cache

echo ============================================
echo   Rust Pool Cache with Clash Proxy
echo ============================================
echo.

REM 设置 Clash 代理
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890

echo [1] 代理设置: %HTTP_PROXY%
echo.

REM 测试代理连接
echo [2] 测试代理连接...
curl -x http://127.0.0.1:7890 -I https://www.google.com -m 5 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo     ✓ 代理连接正常
) else (
    echo     ✗ 代理连接失败！
    echo     请确保 Clash 正在运行
    pause
    exit /b 1
)
echo.

REM 启动程序
echo [3] 启动 Rust Pool Cache...
echo     按 Ctrl+C 停止程序
echo.

target\release\solana-pool-cache.exe

pause




