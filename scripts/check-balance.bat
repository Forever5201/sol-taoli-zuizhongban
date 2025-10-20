@echo off
echo.
echo ========================================
echo Checking Wallet Balance
echo ========================================
echo.

REM Add Solana to PATH
set PATH=%USERPROFILE%\.local\share\solana\install\active_release\bin;%PATH%

REM Check if solana is available
where solana >nul 2>&1
if errorlevel 1 (
    echo ERROR: Solana CLI not found
    echo Please make sure Solana CLI is installed
    echo.
    pause
    exit /b 1
)

echo Wallet Address:
solana-keygen pubkey keypairs\flashloan-wallet.json
echo.

echo Checking Mainnet Balance...
solana balance keypairs\flashloan-wallet.json --url mainnet-beta
echo.

echo ========================================
echo.
pause
