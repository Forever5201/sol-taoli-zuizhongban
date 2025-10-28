@echo off
REM Monitor Jupiter API Startup Progress

echo ========================================
echo 📊 Jupiter API Startup Monitor
echo ========================================
echo.

echo Checking if Jupiter API is running...
wsl bash -c "ps aux | grep jupiter-swap-api | grep -v grep"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Jupiter API process is running!
    echo.
) else (
    echo.
    echo ⚠️  Jupiter API process not found
    echo    Either it hasn't started yet, or it crashed
    echo.
)

echo ========================================
echo 📝 Last 30 lines of startup log:
echo ========================================
echo.
wsl bash -c "cd /mnt/e/6666666666666666666666666666/dex-cex/dex-sol && tail -30 jupiter-ultra-slow.log 2>/dev/null || echo 'Log file not found yet'"

echo.
echo ========================================
echo 🔍 Testing Jupiter API health endpoint:
echo ========================================
echo.
wsl bash -c "curl -s http://localhost:8080/health 2>&1 || echo 'API not responding yet'"

echo.
echo ========================================
echo 💡 Commands you can use:
echo ========================================
echo   monitor-jupiter-startup.bat     - Run this script again
echo   wsl tail -f jupiter-ultra-slow.log  - Watch live logs
echo   wsl curl http://localhost:8080/health - Test if API is ready
echo.
pause


