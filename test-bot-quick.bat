@echo off
REM Quick bot test - runs for 30 seconds then stops

echo ========================================
echo Quick Bot Test (30 seconds)
echo ========================================
echo.

REM Switch to Node 20
call nvm use 20 2>NUL

REM Build
echo [1/2] Building...
call npm run build >NUL 2>&1

REM Run bot for 30 seconds with timeout
echo [2/2] Running bot...
echo.

timeout /t 30 /nobreak > NUL & taskkill /f /im node.exe >NUL 2>&1 &
node packages/onchain-bot/dist/index.js packages/onchain-bot/config.example.toml

echo.
echo ========================================
echo Test Complete
echo ========================================


