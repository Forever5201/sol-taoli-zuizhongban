@echo off
echo.
echo ========================================
echo Starting Dual Bot System
echo ========================================
echo.
echo Strategy: Maximum Arbitrage Coverage
echo - Jupiter Bot: Circular/Triangle arbitrage
echo - Onchain Bot: Direct pool arbitrage
echo.

echo [1/2] Checking wallet balance...
call scripts\check-balance.bat

echo.
echo [2/2] Starting both bots...
echo.
echo Opening 2 terminal windows:
echo - Window 1: Jupiter Bot
echo - Window 2: Onchain Bot
echo.

timeout /t 2

start "Jupiter Bot - Circular Arbitrage" cmd /k "cd /d E:\6666666666666666666666666666\dex-cex\dex-sol && pnpm --filter @solana-arb-bot/jupiter-bot start"

timeout /t 2

start "Onchain Bot - Direct Arbitrage" cmd /k "cd /d E:\6666666666666666666666666666\dex-cex\dex-sol && pnpm start:onchain-bot"

echo.
echo ========================================
echo Both bots started successfully!
echo ========================================
echo.
echo Monitor the two terminal windows for activity.
echo Press Ctrl+C in each window to stop the bots.
echo.
pause
