@echo off
echo.
echo ========================================
echo Proxy Configuration Test
echo ========================================
echo.

echo [Step 1] Setting proxy environment variables...
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
echo HTTP_PROXY=%HTTP_PROXY%
echo HTTPS_PROXY=%HTTPS_PROXY%

echo.
echo [Step 2] Running proxy tests...
cd /d E:\6666666666666666666666666666\dex-cex\dex-sol
node scripts\test-proxy.js

if errorlevel 1 (
    echo.
    echo ========================================
    echo Test Failed!
    echo ========================================
    echo.
    echo Please check:
    echo 1. Is Clash running?
    echo 2. Is the proxy port 7890?
    echo 3. Is System Proxy enabled in Clash?
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo All Tests Passed!
echo ========================================
echo.
echo Your proxy is configured correctly.
echo You can now start the bot.
echo.
pause
