@echo off
chcp 65001 >nul
echo.
echo ========================================
echo CLMM Integration Test
echo ========================================
echo.
echo Configuration: rust-pool-cache/config.toml
echo   - 3 Raydium AMM V4 pools
echo   - 2 Raydium CLMM pools (NEW)
echo.
echo Test will run for 90 seconds...
echo Press Ctrl+C to stop earlier
echo.

cd rust-pool-cache
start /B "Pool Cache Test" target\release\solana-pool-cache.exe config.toml ^>test-integration-output.log 2^>test-integration-error.log

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
findstr /C:"Subscription confirmed" test-integration-output.log 2>nul

echo.
echo === Total Updates ===
findstr /C:"Updated price" test-integration-output.log 2>nul | find /C "Updated"

echo.
echo === AMM V4 Updates ===
findstr /C:"Raydium V4" test-integration-output.log 2>nul | findstr /C:"Updated" | find /C "Updated"

echo.
echo === CLMM Updates ===
findstr /C:"CLMM" test-integration-output.log 2>nul | findstr /C:"Updated"

echo.
echo === Errors (if any) ===
findstr /C:"Failed to deserialize" test-integration-error.log 2>nul | find /C "Failed"

echo.
echo ========================================
echo Test Complete
echo ========================================
echo.
echo Full logs:
echo   Output: rust-pool-cache\test-integration-output.log
echo   Errors: rust-pool-cache\test-integration-error.log
echo.

cd ..
pause








