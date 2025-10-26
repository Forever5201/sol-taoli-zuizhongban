@echo off
chcp 65001 >nul
echo Starting Ultra API fix test...
echo.

node packages\jupiter-bot\dist\flashloan-bot.js configs\flashloan-dryrun.toml

pause

