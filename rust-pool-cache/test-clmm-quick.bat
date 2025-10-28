@echo off
echo ========================================
echo Quick CLMM Structure Test (30 seconds)
echo ========================================
echo.

cd rust-pool-cache

echo Starting test at: %date% %time%
echo Configuration: config-with-clmm.toml
echo Testing CLMM structure fixes...
echo.

timeout /t 30 /nobreak | target\release\solana-pool-cache.exe config-with-clmm.toml 2> test-clmm-error-quick.log 1> test-clmm-output-quick.log

echo.
echo Test completed at: %date% %time%
echo.
echo ========================================
echo Analyzing Results...
echo ========================================
echo.

echo === Last 20 lines of output ===
powershell -Command "Get-Content test-clmm-output-quick.log | Select-Object -Last 20"

echo.
echo === Checking for CLMM updates ===
findstr /C:"CLMM" /C:"clmm" test-clmm-output-quick.log | findstr /C:"Updated" /C:"price"

echo.
echo === Checking for errors ===
findstr /C:"error" /C:"Error" /C:"ERROR" /C:"failed" test-clmm-error-quick.log | findstr /V "WARNING"

echo.
echo ========================================
echo Test Complete
echo ========================================
echo.
echo Full logs:
echo   Output: rust-pool-cache\test-clmm-output-quick.log
echo   Errors: rust-pool-cache\test-clmm-error-quick.log
echo.

pause








