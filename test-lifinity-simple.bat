@echo off
chcp 65001 >nul
echo.
echo ========================================
echo Lifinity V2 Integration Test
echo ========================================
echo.
echo Configuration: rust-pool-cache/config.toml
echo   - 3 Raydium V4 pools
echo   - 2 Raydium CLMM pools  
echo   - 2 Lifinity V2 pools (NEW!)
echo.
echo Test will run for 90 seconds...
echo.

cd rust-pool-cache
start /B "Lifinity Test" target\release\solana-pool-cache.exe config.toml ^>lifinity-test-output.log 2^>lifinity-test-error.log

timeout /t 90 /nobreak >nul

echo.
echo Stopping test...
taskkill /F /IM solana-pool-cache.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Test Results
echo ========================================
echo.

echo === Subscriptions ===
findstr /C:"Subscription confirmed" lifinity-test-output.log 2>nul

echo.
echo === Lifinity V2 Updates ===
findstr /C:"Lifinity V2" lifinity-test-output.log 2>nul | findstr /C:"Pool Updated" | find /C "Updated"

echo.
echo === Total Updates ===
findstr /C:"Pool Updated" lifinity-test-output.log 2>nul | find /C "Updated"

echo.
echo === Errors ===
findstr /C:"Failed to deserialize" lifinity-test-error.log 2>nul | find /C "Failed"

echo.
echo === Recent Updates (Last 5) ===
powershell -Command "Get-Content lifinity-test-output.log | Select-String 'Pool Updated' | Select-Object -Last 5 | ForEach-Object { $_.Line }"

echo.
echo ========================================
echo Complete
echo ========================================
echo.
echo Full logs:
echo   Output: rust-pool-cache\lifinity-test-output.log
echo   Errors: rust-pool-cache\lifinity-test-error.log
echo.

cd ..
pause





