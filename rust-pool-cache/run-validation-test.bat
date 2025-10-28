@echo off
echo ========================================
echo Router Validation Test - 30 seconds
echo ========================================
echo.

start /b cargo run --release > validation_output.txt 2>&1

echo Waiting 30 seconds for data collection...
timeout /t 30 /nobreak

echo.
echo Stopping program...
taskkill /F /IM solana-pool-cache.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Test Results
echo ========================================
echo.

type validation_output.txt | findstr /C:"Found" /C:"BEST" /C:"MultiHop" /C:"Triangle" /C:"Direct" /C:"ROI"

echo.
echo Full output in: validation_output.txt
echo.






