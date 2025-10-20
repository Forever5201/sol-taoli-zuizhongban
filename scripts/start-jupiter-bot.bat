@echo off
echo.
echo ========================================
echo Starting Jupiter Bot
echo ========================================
echo.

echo [1/3] Checking wallet balance...
call scripts\check-balance.bat

echo.
echo [2/3] Checking configuration...
if not exist "packages\jupiter-bot\my-config.toml" (
    echo ERROR: Configuration file not found!
    echo Please run: copy packages\jupiter-bot\example-jito.toml packages\jupiter-bot\my-config.toml
    pause
    exit /b 1
)
echo OK: Configuration file exists

if not exist "packages\jupiter-bot\mints.txt" (
    echo ERROR: Token list not found!
    pause
    exit /b 1
)
echo OK: Token list exists

echo.
echo [3/3] Starting Jupiter Bot...
echo.
echo Configuration: packages\jupiter-bot\my-config.toml
echo Using: Public Jupiter API (https://quote-api.jup.ag/v6)
echo Mode: Jito + FlashLoan
echo.

pnpm --filter @solana-arb-bot/jupiter-bot start

pause
