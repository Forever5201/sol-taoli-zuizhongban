# Meteora DLMM 长时间测试脚本 - 5分钟
# 用于验证 Meteora DLMM 池子更新是否正常

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "║   Meteora DLMM 长时间测试 (5 分钟)                        ║" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$testDuration = 300  # 5分钟 = 300秒
$configFile = "config.toml"

Write-Host "测试配置:" -ForegroundColor Yellow
Write-Host "  配置文件: $configFile" -ForegroundColor White
Write-Host "  测试时长: $testDuration 秒 (5 分钟)" -ForegroundColor White
Write-Host "  监控池子: JUP/USDC (Meteora DLMM)" -ForegroundColor White
Write-Host ""

# 清理旧日志
if (Test-Path "meteora-test-output.log") {
    Remove-Item "meteora-test-output.log" -Force
}
if (Test-Path "meteora-test-error.log") {
    Remove-Item "meteora-test-error.log" -Force
}

Write-Host "🔨 编译项目..." -ForegroundColor Yellow
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 编译失败！" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ 编译成功" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 启动测试..." -ForegroundColor Yellow
Write-Host "⏱️  测试将运行 $testDuration 秒，请耐心等待..." -ForegroundColor White
Write-Host ""

# 启动进程并重定向输出
$process = Start-Process -FilePath "cargo" `
    -ArgumentList "run", "--release", "--", $configFile `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput "meteora-test-output.log" `
    -RedirectStandardError "meteora-test-error.log"

# 显示进度条
$progressInterval = 30  # 每30秒更新一次
$elapsed = 0

while ($elapsed -lt $testDuration) {
    Start-Sleep -Seconds $progressInterval
    $elapsed += $progressInterval
    $remaining = $testDuration - $elapsed
    $percent = [math]::Round(($elapsed / $testDuration) * 100)
    
    Write-Host "⏱️  已运行: $elapsed 秒 / $testDuration 秒 ($percent%)" -ForegroundColor Cyan
    
    # 实时显示一些输出
    if (Test-Path "meteora-test-output.log") {
        $lastLines = Get-Content "meteora-test-output.log" -Tail 3 -ErrorAction SilentlyContinue
        if ($lastLines) {
            Write-Host "   最新输出:" -ForegroundColor Gray
            $lastLines | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        }
    }
    Write-Host ""
}

Write-Host "⏱️  测试时间到，正在停止..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                           ║" -ForegroundColor Green
Write-Host "║   测试完成！正在分析结果...                                ║" -ForegroundColor Green
Write-Host "║                                                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# 分析输出
Write-Host "═══════════════ 测试结果分析 ═══════════════" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "meteora-test-output.log") {
    $output = Get-Content "meteora-test-output.log" -Raw
    
    # 检查订阅是否成功
    Write-Host "1. 订阅状态:" -ForegroundColor Yellow
    if ($output -match "Subscribed to .* \(Meteora DLMM\)") {
        Write-Host "   ✅ Meteora DLMM 池子订阅成功" -ForegroundColor Green
        $output -match "subscription_id=(\d+)" | Out-Null
        if ($Matches) {
            Write-Host "   📡 Subscription ID: $($Matches[1])" -ForegroundColor White
        }
    } else {
        Write-Host "   ❌ 未找到 Meteora DLMM 订阅确认" -ForegroundColor Red
    }
    Write-Host ""
    
    # 检查是否收到 Meteora 更新
    Write-Host "2. Meteora DLMM 更新:" -ForegroundColor Yellow
    $meteoraUpdates = ($output | Select-String -Pattern "Meteora DLMM.*Pool Updated" -AllMatches).Matches.Count
    if ($meteoraUpdates -gt 0) {
        Write-Host "   ✅ 收到 $meteoraUpdates 次 Meteora DLMM 更新！" -ForegroundColor Green
        
        # 提取最后一次更新的详细信息
        $lastUpdate = $output -split "`n" | Where-Object { $_ -match "Meteora DLMM.*Pool Updated" } | Select-Object -Last 1
        if ($lastUpdate) {
            Write-Host "   📊 最后更新详情:" -ForegroundColor White
            # 显示最后更新附近的内容
            $lines = $output -split "`n"
            $index = [array]::IndexOf($lines, $lastUpdate)
            if ($index -ge 0 -and $index -lt $lines.Count - 5) {
                $lines[$index..($index + 5)] | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
            }
        }
    } else {
        Write-Host "   ⚠️  未收到 Meteora DLMM 更新" -ForegroundColor Yellow
        Write-Host "   可能原因：" -ForegroundColor Yellow
        Write-Host "      - 池子交易频率低（JUP/USDC 可能不如 SOL/USDC 活跃）" -ForegroundColor Gray
        Write-Host "      - 数据结构解析失败（需要检查错误日志）" -ForegroundColor Gray
    }
    Write-Host ""
    
    # 检查其他池子更新（对比）
    Write-Host "3. 其他池子更新（对比）:" -ForegroundColor Yellow
    $raydiumV4Updates = ($output | Select-String -Pattern "Raydium V4.*Pool Updated" -AllMatches).Matches.Count
    $raydiumCLMMUpdates = ($output | Select-String -Pattern "Raydium CLMM.*Pool Updated" -AllMatches).Matches.Count
    
    Write-Host "   📊 Raydium V4 更新: $raydiumV4Updates 次" -ForegroundColor White
    Write-Host "   📊 Raydium CLMM 更新: $raydiumCLMMUpdates 次" -ForegroundColor White
    Write-Host ""
    
    # 统计信息
    Write-Host "4. 性能统计:" -ForegroundColor Yellow
    $statsLines = $output -split "`n" | Where-Object { $_ -match "Total Updates:|Update Rate:" }
    if ($statsLines) {
        $statsLines | Select-Object -Last 2 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor White
        }
    }
    Write-Host ""
}

# 检查错误日志
if (Test-Path "meteora-test-error.log") {
    $errors = Get-Content "meteora-test-error.log" -Raw
    if ($errors.Length -gt 0) {
        Write-Host "5. 错误日志:" -ForegroundColor Red
        Write-Host $errors -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 完整日志文件:" -ForegroundColor Yellow
Write-Host "   输出日志: meteora-test-output.log" -ForegroundColor White
Write-Host "   错误日志: meteora-test-error.log" -ForegroundColor White
Write-Host ""

Write-Host "💡 建议下一步:" -ForegroundColor Yellow
if ($meteoraUpdates -eq 0) {
    Write-Host "   1. 检查错误日志中是否有反序列化错误" -ForegroundColor White
    Write-Host "   2. 查询更活跃的 Meteora DLMM 池子（如 SOL/USDC）" -ForegroundColor White
    Write-Host "   3. 验证池子地址是否正确" -ForegroundColor White
    Write-Host "   4. 检查 Meteora DLMM 数据结构是否匹配" -ForegroundColor White
} else {
    Write-Host "   ✅ Meteora DLMM 集成正常工作！" -ForegroundColor Green
    Write-Host "   可以添加更多 Meteora DLMM 池子进行测试" -ForegroundColor White
}
Write-Host ""

pause






