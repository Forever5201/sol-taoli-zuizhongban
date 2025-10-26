# Ultra API Fix Test Script
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Ultra API Transaction Fix Test" -ForegroundColor Green  
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting bot with compiled JavaScript..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Run the bot
node packages\jupiter-bot\dist\flashloan-bot.js configs\flashloan-dryrun.toml

Write-Host ""
Write-Host "Bot stopped." -ForegroundColor Yellow

