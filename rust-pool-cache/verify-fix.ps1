# 反序列化修复验证脚本

Write-Host "
╔═══════════════════════════════════════════════════════╗
║  反序列化修复验证                                      ║
╚═══════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# 清理旧日志
Remove-Item output.log, error.log -ErrorAction SilentlyContinue

Write-Host "▶ 启动池子缓存程序..." -ForegroundColor Yellow
Start-Process -FilePath ".\target\release\solana-pool-cache.exe" `
    -NoNewWindow `
    -RedirectStandardOutput "output.log" `
    -RedirectStandardError "error.log"

Write-Host "⏳ 运行 30 秒收集数据..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n" + "="*60
Write-Host "📊 测试结果" -ForegroundColor Cyan
Write-Host "="*60

# 检查反序列化错误
$errors = Get-Content error.log | Select-String "Failed to deserialize"
$errorCount = $errors.Count

Write-Host "`n🔍 反序列化错误检查:" -ForegroundColor White
if ($errorCount -eq 0) {
    Write-Host "  ✅ 完美！没有发现任何反序列化错误" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  发现 $errorCount 个错误:" -ForegroundColor Yellow
    $errors | ForEach-Object { 
        if ($_ -match "RAY/SOL.*388 bytes") {
            Write-Host "  ❌ RAY/SOL (388 bytes) - 需要修复" -ForegroundColor Red
        } elseif ($_ -match "Meteora DLMM.*904 bytes") {
            Write-Host "  ❌ Meteora DLMM (904 bytes) - 需要修复" -ForegroundColor Red
        } elseif ($_ -match "CLMM") {
            Write-Host "  ℹ️  CLMM - 新发现的问题（非本次修复范围）" -ForegroundColor Yellow
        } else {
            Write-Host "  ⚠️  " + ($_ -replace '.*pool: ', '')
        }
    }
}

# 统计成功更新的池子
Write-Host "`n📈 成功更新的池子:" -ForegroundColor White
$updates = Get-Content output.log | Select-String "Pool Updated" | 
    ForEach-Object { $_ -replace '.*\] ', '' -replace ' Pool Updated', '' } | 
    Sort-Object | Get-Unique

if ($updates.Count -eq 0) {
    Write-Host "  ⚠️  警告：未检测到任何池子更新" -ForegroundColor Yellow
} else {
    $updates | ForEach-Object {
        if ($_ -match "RAY/SOL") {
            Write-Host "  ✅ $_" -ForegroundColor Green -NoNewline
            Write-Host " ← 修复成功！" -ForegroundColor Cyan
        } elseif ($_ -match "JUP/USDC.*Meteora") {
            Write-Host "  ✅ $_" -ForegroundColor Green -NoNewline
            Write-Host " ← 修复成功！" -ForegroundColor Cyan
        } else {
            Write-Host "  ✅ $_" -ForegroundColor Green
        }
    }
    Write-Host "`n  总计: $($updates.Count) 个池子正常工作" -ForegroundColor White
}

# 显示性能统计
Write-Host "`n⚡ 性能指标:" -ForegroundColor White
$stats = Get-Content output.log | Select-String -Pattern "Average:\s+(\d+)\s+μs" | Select-Object -Last 1
if ($stats) {
    $latency = [regex]::Match($stats, "Average:\s+(\d+)\s+μs").Groups[1].Value
    Write-Host "  平均延迟: $latency μs" -ForegroundColor Cyan
}

# 停止程序
Write-Host "`n🛑 停止程序..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*solana*"} | Stop-Process -Force

Write-Host "`n" + "="*60
Write-Host "✅ 验证完成" -ForegroundColor Green
Write-Host "="*60

Write-Host "`n📝 详细报告: DESERIALIZATION_FIX_REPORT.md" -ForegroundColor Cyan




