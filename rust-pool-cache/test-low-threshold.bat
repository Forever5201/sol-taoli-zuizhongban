@echo off
echo ========================================
echo Low Threshold Test - Finding Opportunities
echo ========================================
echo.
echo Configuration:
echo   Min ROI: 0.01%% (very low for testing)
echo   Pools: 6 core pools only
echo   Duration: 60 seconds
echo.

start /b cargo run --release config-low-threshold.toml > low_threshold_test.txt 2>&1

echo Waiting 60 seconds...
timeout /t 60 /nobreak

taskkill /F /IM solana-pool-cache.exe >nul 2>&1

echo.
echo ========================================
echo Results
echo ========================================
echo.

type low_threshold_test.txt | findstr /C:"Found" /C:"opportunity" /C:"BEST" /C:"MultiHop" /C:"Triangle" /C:"Direct"

echo.
echo Full output: low_threshold_test.txt
echo.






