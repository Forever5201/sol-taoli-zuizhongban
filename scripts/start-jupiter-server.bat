@echo off
echo.
echo ========================================
echo   Jupiter Server Standalone
echo ========================================
echo.
echo This will start Jupiter Server only.
echo Use this for testing or standalone deployment.
echo.
echo Features:
echo   - Auto-download jupiter-cli
echo   - Circular Arbitrage: ENABLED
echo   - Port: 8080
echo   - Health Check: http://127.0.0.1:8080/health
echo.
echo Starting...
echo.

pnpm tsx scripts/test-jupiter-server.ts

pause

