# Analyze CLMM Test Results
Write-Host "=== Raydium CLMM Test Results Analysis ===" -ForegroundColor Cyan
Write-Host ""

# Check if logs exist
if (-not (Test-Path "test-clmm-output.log")) {
    Write-Host "ERROR: test-clmm-output.log not found" -ForegroundColor Red
    exit 1
}

# Read logs
$output = Get-Content "test-clmm-output.log"
$errors = Get-Content "test-clmm-error.log" -ErrorAction SilentlyContinue

# Count subscriptions
$subscriptions = $output | Select-String "Subscription confirmed"
$subscriptionCount = ($subscriptions | Measure-Object).Count

Write-Host "📊 Subscription Status:" -ForegroundColor Yellow
Write-Host "   Total subscriptions confirmed: $subscriptionCount / 5 pools" -ForegroundColor Green
Write-Host ""

# Count updates by pool type
$ammV4Updates = $output | Select-String "Type:.*Raydium AMM V4"
$clmmUpdates = $output | Select-String "Type:.*Raydium CLMM"

$ammV4Count = ($ammV4Updates | Measure-Object).Count
$clmmCount = ($clmmUpdates | Measure-Object).Count

Write-Host "📈 Price Updates by Type:" -ForegroundColor Yellow
Write-Host "   Raydium AMM V4: $ammV4Count updates" -ForegroundColor Green
Write-Host "   Raydium CLMM:   $clmmCount updates" -ForegroundColor $(if ($clmmCount -gt 0) { "Green" } else { "Yellow" })
Write-Host ""

# Extract unique pool names
$allUpdates = $output | Select-String "Pool Updated"
$poolNames = $allUpdates | ForEach-Object {
    if ($_ -match '\] (.*?) Pool Updated') {
        $matches[1]
    }
} | Select-Object -Unique

Write-Host "✅ Pools Successfully Updating:" -ForegroundColor Cyan
foreach ($pool in $poolNames) {
    $poolUpdateCount = ($allUpdates | Select-String $pool | Measure-Object).Count
    $poolType = if ($pool -match "CLMM") { "CLMM" } else { "AMM V4" }
    Write-Host "   ✅ $pool ($poolType) - $poolUpdateCount updates" -ForegroundColor White
}
Write-Host ""

# Check for CLMM-specific errors
if ($errors) {
    $totalErrors = ($errors | Select-String "Failed to deserialize" | Measure-Object).Count
    
    if ($totalErrors -gt 0) {
        Write-Host "⚠️  Deserialization Errors:" -ForegroundColor Yellow
        Write-Host "   Total errors: $totalErrors" -ForegroundColor Red
        
        # Group by data length
        $errorsByLength = @{}
        $errors | Select-String "Data length: (\d+) bytes" | ForEach-Object {
            if ($_ -match 'Data length: (\d+) bytes') {
                $length = $matches[1]
                if (-not $errorsByLength.ContainsKey($length)) {
                    $errorsByLength[$length] = 0
                }
                $errorsByLength[$length]++
            }
        }
        
        Write-Host ""
        Write-Host "   Errors by data length:" -ForegroundColor Cyan
        $errorsByLength.GetEnumerator() | Sort-Object Key | ForEach-Object {
            $analysis = switch ($_.Key) {
                { $_ -eq "1728" } { " (Expected CLMM size)" }
                default { "" }
            }
            Write-Host "     $($_.Key) bytes: $($_.Value) errors$analysis" -ForegroundColor White
        }
        Write-Host ""
    }
}

# Final summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($subscriptionCount -eq 5) {
    Write-Host "✅ All 5 pools subscribed successfully (100%)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Only $subscriptionCount / 5 pools subscribed" -ForegroundColor Yellow
}

if ($ammV4Count -gt 0) {
    Write-Host "✅ Raydium AMM V4 working correctly" -ForegroundColor Green
} else {
    Write-Host "❌ No Raydium AMM V4 updates" -ForegroundColor Red
}

if ($clmmCount -gt 0) {
    Write-Host "✅ Raydium CLMM working correctly! 🎉" -ForegroundColor Green
    Write-Host "   CLMM support successfully implemented!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Raydium CLMM pools not updating yet" -ForegroundColor Yellow
    Write-Host "   Possible reasons:" -ForegroundColor Cyan
    Write-Host "   - CLMM pools might be less active" -ForegroundColor White
    Write-Host "   - Data structure might need adjustment" -ForegroundColor White
    Write-Host "   - Pool might not be open yet" -ForegroundColor White
}

Write-Host ""

