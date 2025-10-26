@echo off
chcp 65001 >nul
echo Starting bot to test Ultra API transaction fix...
echo.

npx tsx packages/jupiter-bot/src/flashloan-bot.ts configs/flashloan-dryrun.toml

