@echo off
echo ========================================
echo CLMM Integration Test
echo ========================================
echo.
echo Testing updated production config with CLMM support
echo Configuration: rust-pool-cache/config.toml
echo - 3 Raydium AMM V4 pools
echo - 2 Raydium CLMM pools (NEW)
echo.
echo Test duration: 60 seconds
echo.

cd rust-pool-cache

echo Starting test...
echo.

rem Run for 60 seconds
start /B "" timeout /t 60 /nobreak
target\release\solana-pool-cache.exe config.toml 2> test-integration-error.log 1> test-integration-output.log

echo.
echo ========================================
echo Analyzing Results
echo ========================================
echo.

echo === Subscription Status ===
findstr /C:"Subscription confirmed" test-integration-output.log

echo.
echo === Pool Updates (Last 30) ===
findstr /C:"Updated price" /C:"Raydium" test-integration-output.log | powershell -Command "$input | Select-Object -Last 30"

echo.
echo === CLMM Updates ===
findstr /C:"CLMM" /C:"clmm" test-integration-output.log | findstr /C:"Updated" /C:"price"

echo.
echo === Error Summary ===
findstr /C:"error" /C:"Error" /C:"failed" /C:"deserialize" test-integration-error.log | findstr /V "WARNING" | findstr /V "API server"

echo.
echo ========================================
echo Test Results Summary
echo ========================================
echo.

powershell -Command "Write-Host '池子订阅数: ' -NoNewline; (Select-String -Path test-integration-output.log -Pattern 'Subscription confirmed').Count"
powershell -Command "Write-Host 'AMM V4 更新数: ' -NoNewline; (Select-String -Path test-integration-output.log -Pattern 'Raydium V4.*Updated').Count"
powershell -Command "Write-Host 'CLMM 更新数: ' -NoNewline; (Select-String -Path test-integration-output.log -Pattern 'CLMM.*Updated').Count"
powershell -Command "Write-Host '反序列化错误: ' -NoNewline; (Select-String -Path test-integration-error.log -Pattern 'Failed to deserialize').Count"

echo.
echo Full logs saved to:
echo   Output: rust-pool-cache\test-integration-output.log
echo   Errors: rust-pool-cache\test-integration-error.log
echo.

pause








