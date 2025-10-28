# Lifinity V2 集成测试
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Lifinity V2 集成测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "配置: rust-pool-cache/config.toml"
Write-Host "  - 3 Raydium V4 池子"
Write-Host "  - 2 Raydium CLMM 池子"
Write-Host "  - 2 Lifinity V2 池子 (NEW!)"
Write-Host ""
Write-Host "测试时长: 90 秒" -ForegroundColor Yellow
Write-Host ""

# 启动进程
$process = Start-Process -FilePath "rust-pool-cache\target\release\solana-pool-cache.exe" `
    -ArgumentList "rust-pool-cache\config.toml" `
    -RedirectStandardOutput "rust-pool-cache\lifinity-test-output.log" `
    -RedirectStandardError "rust-pool-cache\lifinity-test-error.log" `
    -PassThru `
    -NoNewWindow

Write-Host "进程已启动 (PID: $($process.Id))" -ForegroundColor Green
Write-Host "等待 90 秒收集数据..." -ForegroundColor Yellow

# 等待 90 秒
Start-Sleep -Seconds 90

# 停止进程
Write-Host ""
Write-Host "停止进程..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试结果分析" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查订阅状态
Write-Host "=== 订阅状态 ===" -ForegroundColor Green
Select-String -Path "rust-pool-cache\lifinity-test-output.log" -Pattern "Subscription confirmed" | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Cyan }

Write-Host ""
Write-Host "=== Lifinity V2 更新 ===" -ForegroundColor Green
$lifinityUpdates = Select-String -Path "rust-pool-cache\lifinity-test-output.log" -Pattern "Lifinity V2.*Pool Updated"
if ($lifinityUpdates.Count -gt 0) {
    $lifinityUpdates | Select-Object -First 3 | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Green }
    Write-Host "  ... (共 $($lifinityUpdates.Count) 次更新)" -ForegroundColor Green
} else {
    Write-Host "  暂无 Lifinity V2 更新（可能交易频率低）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 统计摘要 ===" -ForegroundColor Yellow
$subscriptions = (Select-String -Path "rust-pool-cache\lifinity-test-output.log" -Pattern "Subscription confirmed").Count
$allUpdates = (Select-String -Path "rust-pool-cache\lifinity-test-output.log" -Pattern "Pool Updated").Count
$lifinityCount = $lifinityUpdates.Count
$errors = (Select-String -Path "rust-pool-cache\lifinity-test-error.log" -Pattern "Failed to deserialize" -ErrorAction SilentlyContinue).Count

Write-Host "  池子订阅数: $subscriptions/7" -ForegroundColor $(if ($subscriptions -eq 7) {"Green"} else {"Yellow"})
Write-Host "  总更新数: $allUpdates" -ForegroundColor Green
Write-Host "  Lifinity V2 更新: $lifinityCount" -ForegroundColor $(if ($lifinityCount -gt 0) {"Green"} else {"Yellow"})
Write-Host "  反序列化错误: $errors" -ForegroundColor $(if ($errors -eq 0) {"Green"} else {"Red"})

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "完整日志:" -ForegroundColor Cyan
Write-Host "  输出: rust-pool-cache\lifinity-test-output.log"
Write-Host "  错误: rust-pool-cache\lifinity-test-error.log"
Write-Host "========================================" -ForegroundColor Cyan

