@echo off
echo ====================================
echo Router Validation - Long Running Test
echo ====================================
echo.
echo This will run the router with:
echo   - Mode: Complete (2-6 hops)
echo   - Min ROI: 0.01%% (very low to catch all opportunities)
echo   - Duration: 2-3 hours recommended
echo.
echo Press Ctrl+C to stop the test
echo.
pause

cd /d "%~dp0"

echo Starting router with low threshold configuration...
cargo run --release --bin solana-pool-cache > validation-test-output.log 2> validation-test-error.log

echo.
echo Test completed or stopped.
echo.
echo Check logs:
echo   - validation-test-output.log
echo   - validation-test-error.log
echo.
pause


echo ====================================
echo Router Validation - Long Running Test
echo ====================================
echo.
echo This will run the router with:
echo   - Mode: Complete (2-6 hops)
echo   - Min ROI: 0.01%% (very low to catch all opportunities)
echo   - Duration: 2-3 hours recommended
echo.
echo Press Ctrl+C to stop the test
echo.
pause

cd /d "%~dp0"

echo Starting router with low threshold configuration...
cargo run --release --bin solana-pool-cache > validation-test-output.log 2> validation-test-error.log

echo.
echo Test completed or stopped.
echo.
echo Check logs:
echo   - validation-test-output.log
echo   - validation-test-error.log
echo.
pause















