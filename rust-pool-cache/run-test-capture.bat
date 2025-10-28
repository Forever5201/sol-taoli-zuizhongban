@echo off
setlocal enabledelayedexpansion

echo =====================================
echo Pool Subscription Test
echo =====================================
echo.
echo Starting program...
echo Output will be captured to: test-output.log
echo.

start /b .\target\release\solana-pool-cache.exe > test-output.log 2>&1

echo Waiting 20 seconds to collect subscription data...
timeout /t 20 /nobreak >nul

echo.
echo Stopping program...
taskkill /F /IM solana-pool-cache.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo =====================================
echo Test Results
echo =====================================
echo.

if exist test-output.log (
    type test-output.log
) else (
    echo ERROR: Output file not found
)

echo.
echo =====================================
echo Test Complete
echo =====================================










