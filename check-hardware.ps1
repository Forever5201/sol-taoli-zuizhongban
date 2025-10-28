# Hardware Check Script
Write-Host "=== Hardware Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Check RAM
Write-Host "Memory (RAM):" -ForegroundColor Yellow
$ram = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
$ramGB = [math]::Round($ram.Sum / 1GB, 2)
Write-Host "  Total: $ramGB GB" -ForegroundColor Green
Write-Host ""

# Check CPU
Write-Host "CPU:" -ForegroundColor Yellow
$cpu = Get-CimInstance Win32_Processor
Write-Host "  Model: $($cpu.Name)" -ForegroundColor Green
Write-Host "  Cores: $($cpu.NumberOfCores)" -ForegroundColor Green
Write-Host "  Logical Processors: $($cpu.NumberOfLogicalProcessors)" -ForegroundColor Green
Write-Host ""

# Check Disk Space
Write-Host "Disk Space:" -ForegroundColor Yellow
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object {
    $freeGB = [math]::Round($_.Free / 1GB, 2)
    $totalGB = [math]::Round(($_.Used + $_.Free) / 1GB, 2)
    Write-Host "  $($_.Name): $freeGB GB free / $totalGB GB total" -ForegroundColor Green
}
Write-Host ""

# Summary for Solana Node
Write-Host "=== Solana Node Requirements ===" -ForegroundColor Cyan
Write-Host "  Minimum RAM: 128 GB" -ForegroundColor Yellow
Write-Host "  Minimum CPU: 12 cores / 24 threads" -ForegroundColor Yellow
Write-Host "  Minimum Disk: 500 GB NVMe SSD" -ForegroundColor Yellow
Write-Host ""

if ($ramGB -ge 128) {
    Write-Host "  RAM: PASS" -ForegroundColor Green
} else {
    Write-Host "  RAM: FAIL (need $([math]::Round(128 - $ramGB, 2)) GB more)" -ForegroundColor Red
}

if ($cpu.NumberOfCores -ge 12) {
    Write-Host "  CPU Cores: PASS" -ForegroundColor Green
} else {
    Write-Host "  CPU Cores: FAIL (need $([math]::Round(12 - $cpu.NumberOfCores)) more cores)" -ForegroundColor Red
}

