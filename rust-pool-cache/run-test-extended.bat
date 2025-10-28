@echo off
echo =====================================
echo Extended Pool Subscription Test (40s)
echo =====================================
echo.
echo Starting program with Helius RPC...
echo.

start /b .\target\release\solana-pool-cache.exe > test-extended.log 2>&1

echo Waiting 40 seconds for connection...
timeout /t 40 /nobreak >nul

echo.
echo Stopping program...
taskkill /F /IM solana-pool-cache.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo =====================================
echo Results
echo =====================================
echo.

type test-extended.log

echo.
echo.
echo Check for connection success messages above
echo.










