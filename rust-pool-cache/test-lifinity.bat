@echo off
cd %~dp0

echo ========================================
echo.
echo Starting Lifinity V2 Test at: %date% %time%
echo.

cargo run --release -- config-test-lifinity.toml 2>lifinity-test-error.log 1>lifinity-test-output.log

echo.
echo ========================================
echo Lifinity V2 Test completed at: %date% %time%
echo.
echo Output saved to: lifinity-test-output.log
echo Errors saved to: lifinity-test-error.log
echo.
pause

