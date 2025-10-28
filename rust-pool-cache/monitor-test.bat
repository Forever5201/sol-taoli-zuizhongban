@echo off
REM Monitor Rust Pool Cache Test

echo ========================================
echo 🔍 Rust Pool Cache Test Monitor
echo ========================================
echo.

echo 📊 Checking if process is running...
tasklist /FI "IMAGENAME eq solana-pool-cache.exe" 2>NUL | find /I /N "solana-pool-cache.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ Process is running!
    echo.
    tasklist /FI "IMAGENAME eq solana-pool-cache.exe"
) else (
    echo ❌ Process not found
    echo    It may have crashed or not started yet
)

echo.
echo ========================================
echo 📝 Recent output (if redirected to file):
echo ========================================
echo.

if exist rust-pool-cache-output.txt (
    powershell -Command "Get-Content rust-pool-cache-output.txt -Tail 30"
) else (
    echo No output file found.
    echo Run with: .\target\release\solana-pool-cache.exe ^> rust-pool-cache-output.txt
)

echo.
echo ========================================
echo 💡 Commands:
echo ========================================
echo   monitor-test.bat         - Run this script again
echo   taskkill /F /IM solana-pool-cache.exe  - Stop the process
echo.
pause


