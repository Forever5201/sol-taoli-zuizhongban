# Rust Pool Cache - Production Monitor
param(
    [switch]$Continuous,
    [int]$RefreshSeconds = 10
)

function Show-ProductionStatus {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "   Rust Pool Cache - Production Monitor" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    # Check process status
    $process = Get-Process | Where-Object {$_.ProcessName -like "*solana-pool*"}
    
    Write-Host "Process Status:" -ForegroundColor Yellow
    if ($process) {
        Write-Host "   Status: RUNNING" -ForegroundColor Green
        Write-Host "   PID: $($process.Id)" -ForegroundColor White
        Write-Host "   Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor White
        Write-Host "   CPU: $([math]::Round($process.CPU, 2))s" -ForegroundColor White
        $runtime = (Get-Date) - $process.StartTime
        Write-Host "   Runtime: $([int]$runtime.TotalHours)h $($runtime.Minutes)m" -ForegroundColor White
    } else {
        Write-Host "   Status: NOT RUNNING" -ForegroundColor Red
        Write-Host "   Tip: Run start-production.bat" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Check logs
    if (Test-Path "production-output.log") {
        $logSize = (Get-Item "production-output.log").Length
        Write-Host "Log File:" -ForegroundColor Yellow
        Write-Host "   Size: $([math]::Round($logSize / 1KB, 2)) KB" -ForegroundColor White
        
        # Count updates
        $updates = Get-Content "production-output.log" | Select-String "Pool Updated"
        $updateCount = ($updates | Measure-Object).Count
        Write-Host "   Total Updates: $updateCount" -ForegroundColor White
        
        # Count unique pools
        $uniquePools = $updates | ForEach-Object {
            if ($_ -match '\] (.*?) Pool Updated') {
                $matches[1]
            }
        } | Select-Object -Unique
        Write-Host "   Active Pools: $($uniquePools.Count)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "Active Pools:" -ForegroundColor Yellow
        foreach ($pool in $uniquePools | Select-Object -First 10) {
            Write-Host "   - $pool" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "Latest Updates:" -ForegroundColor Yellow
        $latestUpdates = $updates | Select-Object -Last 5
        foreach ($update in $latestUpdates) {
            if ($update -match '\[(.*?)\] (.*?) Pool Updated') {
                $time = $matches[1]
                $pool = $matches[2]
                Write-Host "   $time - $pool" -ForegroundColor White
            }
        }
        
        # Check for errors
        if (Test-Path "production-error.log") {
            $errors = Get-Content "production-error.log" | Select-String "error" -CaseSensitive:$false
            $errorCount = ($errors | Measure-Object).Count
            
            Write-Host ""
            if ($errorCount -gt 0) {
                Write-Host "Errors: $errorCount found" -ForegroundColor Red
            } else {
                Write-Host "Errors: 0" -ForegroundColor Green
            }
        }
        
    } else {
        Write-Host "Waiting for logs..." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
    
    if ($Continuous) {
        Write-Host ""
        Write-Host "Auto-refresh in $RefreshSeconds seconds... (Ctrl+C to stop)" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Tip: Use -Continuous for auto-refresh" -ForegroundColor Gray
        Write-Host "Example: .\monitor-production.ps1 -Continuous -RefreshSeconds 10" -ForegroundColor Gray
    }
}

# Main loop
if ($Continuous) {
    while ($true) {
        Show-ProductionStatus
        Start-Sleep -Seconds $RefreshSeconds
    }
} else {
    Show-ProductionStatus
}
