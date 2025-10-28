@echo off
REM Quick Start with Remote Ultra API (Zero Cost)
REM This allows you to test the complete system immediately

echo ========================================
echo 🚀 Starting Flashloan Bot with Remote API
echo ========================================
echo.
echo Configuration:
echo   - Worker: Remote Ultra API (api.jup.ag/ultra)
echo   - Main Thread: Remote Quote API (quote-api.jup.ag)
echo   - Latency: ~900ms total (150ms worker + 750ms build)
echo   - Cost: $0
echo   - Flash Loan Support: YES
echo.
echo Expected Performance:
echo   - Opportunities per hour: 30-50
echo   - Capture rate: 30-40%% (due to latency)
echo   - This is TESTING mode to validate the system
echo.
echo After 1-3 days of testing, you can decide:
echo   - If daily profit ^> $10 → Upgrade to paid RPC ($79/month)
echo   - If daily profit ^< $5 → Continue with remote API
echo.
echo ========================================
echo.

REM Set environment variable to use remote API
set USE_LOCAL_JUPITER_API=false

REM Start the bot
echo Starting bot...
echo.
pnpm start:flashloan

echo.
echo ========================================
echo Bot stopped.
echo ========================================
pause

