# Quick bot test script
Write-Host "`n========================================"
Write-Host "Bot Test - Checking for Fixes"
Write-Host "========================================`n"

# Run bot and capture first 60 lines of output
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & ".\start-bot.bat" 2>&1
}

# Wait up to 20 seconds and capture output
Wait-Job $job -Timeout 20 | Out-Null
$output = Receive-Job $job
Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -Force -ErrorAction SilentlyContinue

# Display output (first 80 lines)
$output | Select-Object -First 80

Write-Host "`n========================================"
Write-Host "Checking for Errors..."
Write-Host "========================================`n"

# Check for the old error
$oldError = $output | Select-String -Pattern "Cannot read properties of undefined.*_bn"
$scanCompleted = $output | Select-String -Pattern "Scan completed.*pools"
$priceDataAvailable = $output | Select-String -Pattern "price.*liquidity|✅.*SOL"

if ($oldError) {
    Write-Host "❌ OLD ERROR STILL PRESENT: _bn error detected" -ForegroundColor Red
} else {
    Write-Host "✅ No _bn errors detected" -ForegroundColor Green
}

if ($scanCompleted) {
    Write-Host "✅ Market scanner completed scan" -ForegroundColor Green
    Write-Host "   $scanCompleted"
} else {
    Write-Host "⚠️  Market scanner did not complete" -ForegroundColor Yellow
}

if ($priceDataAvailable) {
    Write-Host "✅ Price data available" -ForegroundColor Green
} else {
    Write-Host "⚠️  No price data detected in output" -ForegroundColor Yellow
}

Write-Host "`n"


