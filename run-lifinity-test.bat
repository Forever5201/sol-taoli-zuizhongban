@echo off
echo ========================================
echo Lifinity V2 Test
echo ========================================
echo.
echo Starting Lifinity V2 test for 60 seconds...
echo Press Ctrl+C to stop
echo.

cd rust-pool-cache
target\release\solana-pool-cache.exe config.toml

cd ..
pause





