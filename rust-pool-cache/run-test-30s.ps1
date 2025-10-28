# Run test for 30 seconds and save output

Write-Host "Starting Lifinity V2 test (30 seconds)..." -ForegroundColor Cyan
Write-Host ""

# Start process
$process = Start-Process -FilePath "cargo" -ArgumentList "run", "--release", "--", "config-test-lifinity.toml" -NoNewWindow -PassThru -RedirectStandardOutput "test-output-temp.log" -RedirectStandardError "test-error-temp.log"

Write-Host "Running test..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Stop process
Write-Host "Stopping test..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green
Write-Host ""

# Display output
if (Test-Path "test-output-temp.log") {
    $output = Get-Content "test-output-temp.log" -Raw
    Write-Host "Test Output:" -ForegroundColor Cyan
    Write-Host $output
}

if (Test-Path "test-error-temp.log") {
    $errors = Get-Content "test-error-temp.log" -Raw
    if ($errors.Length -gt 0) {
        Write-Host ""
        Write-Host "Error Output:" -ForegroundColor Yellow
        Write-Host $errors
    }
}
