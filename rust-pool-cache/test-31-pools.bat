@echo off
echo ========================================
echo Testing Rust Pool Cache with 31 Pools
echo ========================================
echo.
echo Starting at: %date% %time%
echo.

cargo run --release -- config-expanded.toml 2>test-error.log 1>test-output.log

echo.
echo ========================================
echo Test completed at: %date% %time%
echo.
echo Check test-output.log for normal output
echo Check test-error.log for errors
echo ========================================
pause

