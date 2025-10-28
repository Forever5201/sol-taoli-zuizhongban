@echo off
echo ========================================
echo Rust Pool Cache - Production Environment
echo ========================================
echo.
echo Configuration: config-raydium-v4-only.toml
echo Pools: 13 Raydium AMM V4 (Verified)
echo Expected Latency: 4-27 microseconds
echo.
echo Starting at: %date% %time%
echo.

cargo run --release -- config-raydium-v4-only.toml 2>production-error.log 1>production-output.log

echo.
echo ========================================
echo Production stopped at: %date% %time%
echo ========================================
pause

