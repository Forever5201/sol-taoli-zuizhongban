@echo off
echo ========================================
echo FINAL WEBSOCKET SUBSCRIPTION TEST
echo ========================================
echo.
echo This will run for 15 seconds to verify:
echo   1. WebSocket connection
echo   2. Pool subscriptions  
echo   3. Real-time updates
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

start /b cargo run --release > final-output.txt 2>&1

echo.
echo Program started. Waiting 15 seconds...
timeout /t 15 /nobreak

echo.
echo Stopping program...
taskkill /F /IM solana-pool-cache.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo TEST RESULTS
echo ========================================
echo.

type final-output.txt | findstr /C:"WebSocket" /C:"Subscribed" /C:"Update" /C:"connected" /C:"ERROR" /C:"SUCCESS"

echo.
echo.
echo Full output saved to: final-output.txt
echo.
echo ========================================
echo.








