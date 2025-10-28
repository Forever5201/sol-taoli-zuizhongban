@echo off
echo ========================================
echo Testing Rust Pool Cache with CLMM Support
echo ========================================
echo.
echo Configuration: config-with-clmm.toml
echo - 3 Raydium AMM V4 pools
echo - 2 Raydium CLMM pools
echo.
echo Starting at: %date% %time%
echo.

cargo run --release -- config-with-clmm.toml 2>test-clmm-error.log 1>test-clmm-output.log

echo.
echo ========================================
echo Test completed at: %date% %time%
echo.
echo Check test-clmm-output.log for normal output
echo Check test-clmm-error.log for errors
echo ========================================
pause

