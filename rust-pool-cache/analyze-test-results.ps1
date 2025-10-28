# Analyze Rust Pool Cache Test Results
Write-Host "=== Rust Pool Cache Test Results Analysis ===" -ForegroundColor Cyan
Write-Host ""

# Check if logs exist
if (-not (Test-Path "test-output.log")) {
    Write-Host "ERROR: test-output.log not found" -ForegroundColor Red
    exit 1
}

# Read logs
$output = Get-Content "test-output.log"
$errors = Get-Content "test-error.log" -ErrorAction SilentlyContinue

# Count subscriptions
$subscriptions = $output | Select-String "Subscription confirmed"
$subscriptionCount = ($subscriptions | Measure-Object).Count

Write-Host "📊 Subscription Status:" -ForegroundColor Yellow
Write-Host "   Total subscriptions confirmed: $subscriptionCount" -ForegroundColor Green
Write-Host ""

# Count successful updates
$updates = $output | Select-String "Pool Updated"
$updateCount = ($updates | Measure-Object).Count

Write-Host "📈 Price Updates:" -ForegroundColor Yellow
Write-Host "   Total pool updates: $updateCount" -ForegroundColor Green

# Extract unique pool names
$poolNames = $updates | ForEach-Object {
    if ($_ -match '\[.*?\] (.*?) Pool Updated') {
        $matches[1]
    }
} | Select-Object -Unique

Write-Host "   Unique pools updating: $($poolNames.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "   Pools successfully updating:" -ForegroundColor Cyan
foreach ($pool in $poolNames) {
    $poolUpdateCount = ($updates | Select-String $pool | Measure-Object).Count
    Write-Host "     ✅ $pool - $poolUpdateCount updates" -ForegroundColor White
}
Write-Host ""

# Count deserialization errors
if ($errors) {
    $deserializationErrors = $errors | Select-String "Failed to deserialize"
    $errorCount = ($deserializationErrors | Measure-Object).Count
    
    Write-Host "⚠️  Deserialization Errors:" -ForegroundColor Yellow
    Write-Host "   Total errors: $errorCount" -ForegroundColor Red
    
    # Group by data length
    $errorsByLength = @{}
    $deserializationErrors | ForEach-Object {
        if ($_ -match 'Data length: (\d+) bytes') {
            $length = $matches[1]
            if (-not $errorsByLength.ContainsKey($length)) {
                $errorsByLength[$length] = 0
            }
            $errorsByLength[$length]++
        }
    }
    
    Write-Host ""
    Write-Host "   Errors by data length (indicating different DEX types):" -ForegroundColor Cyan
    $errorsByLength.GetEnumerator() | Sort-Object Key | ForEach-Object {
        Write-Host "     $($_.Key) bytes: $($_.Value) errors" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Successfully subscribed:  $subscriptionCount / 31 pools (100%)" -ForegroundColor Green
Write-Host "✅ Pools updating correctly: $($poolNames.Count) pools" -ForegroundColor Green
Write-Host "⚠️  Pools with errors:       $(31 - $($poolNames.Count)) pools (different DEX types)" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Recommendation:" -ForegroundColor Cyan
Write-Host "   - Keep the $($poolNames.Count) working pools (Raydium V4)" -ForegroundColor White
Write-Host "   - Remove or comment out non-Raydium pools from config" -ForegroundColor White
Write-Host "   - OR: Extend Rust Pool Cache to support other DEX types" -ForegroundColor White
Write-Host ""

