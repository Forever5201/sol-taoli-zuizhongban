# Lifinity V2 测试结果分析脚本

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Lifinity V2 测试结果分析" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 检查文件是否存在
if (!(Test-Path "lifinity-test-output.log")) {
    Write-Host "❌ 找不到测试输出日志文件" -ForegroundColor Red
    exit 1
}

$output = Get-Content "lifinity-test-output.log" -Raw

# 统计订阅信息
$subscriptions = ($output | Select-String "Subscription confirmed" -AllMatches).Matches.Count
Write-Host "📊 统计信息:" -ForegroundColor Yellow
Write-Host "   • 成功订阅: $subscriptions 个池子" -ForegroundColor Green
Write-Host ""

# 统计每种池子类型的更新次数
$lifinityUpdates = ($output | Select-String "Type:\s+Lifinity V2" -AllMatches).Matches.Count
$raydiumV4Updates = ($output | Select-String "Type:\s+Raydium AMM V4" -AllMatches).Matches.Count
$raydiumClmmUpdates = ($output | Select-String "Type:\s+Raydium CLMM" -AllMatches).Matches.Count

Write-Host "🔄 池子更新统计:" -ForegroundColor Yellow
Write-Host "   • Lifinity V2:   $lifinityUpdates 次更新" -ForegroundColor $(if ($lifinityUpdates -gt 0) {"Green"} else {"Red"})
Write-Host "   • Raydium V4:    $raydiumV4Updates 次更新" -ForegroundColor $(if ($raydiumV4Updates -gt 0) {"Green"} else {"Gray"})
Write-Host "   • Raydium CLMM:  $raydiumClmmUpdates 次更新" -ForegroundColor $(if ($raydiumClmmUpdates -gt 0) {"Green"} else {"Gray"})
Write-Host ""

# 检查 Lifinity V2 的数据大小
if ($lifinityUpdates -gt 0) {
    $dataSizes = $output | Select-String "Data Size:\s+(\d+) bytes" -AllMatches | 
                 ForEach-Object { $_.Matches } | 
                 ForEach-Object { $_.Groups[1].Value } |
                 Group-Object | Select-Object Name, Count
    
    if ($dataSizes) {
        Write-Host "📦 Lifinity V2 数据大小分布:" -ForegroundColor Yellow
        foreach ($size in $dataSizes) {
            Write-Host ("   • {0} bytes: {1} 次" -f $size.Name, $size.Count) -ForegroundColor Cyan
        }
        Write-Host ""
    }
}

# 检查错误日志
if (Test-Path "lifinity-test-error.log") {
    $errors = Get-Content "lifinity-test-error.log" -Raw
    $deserializationErrors = ($errors | Select-String "Failed to deserialize pool" -AllMatches).Matches.Count
    
    if ($deserializationErrors -gt 0) {
        Write-Host "⚠️  反序列化错误: $deserializationErrors 次" -ForegroundColor Yellow
        
        # 统计错误的数据长度
        $errorLengths = $errors | Select-String "Data length: (\d+) bytes" -AllMatches | 
                        ForEach-Object { $_.Matches } | 
                        ForEach-Object { $_.Groups[1].Value } |
                        Group-Object | Select-Object Name, Count
        
        if ($errorLengths) {
            Write-Host "   错误数据长度分布:" -ForegroundColor Gray
            foreach ($len in $errorLengths) {
                Write-Host ("      • {0} bytes: {1} 次" -f $len.Name, $len.Count) -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
}

# 显示最近的几条更新
Write-Host "📋 最近的池子更新 (最后 5 条):" -ForegroundColor Yellow
$updates = $output | Select-String "Pool Updated" | Select-Object -Last 5
foreach ($update in $updates) {
    $line = $update.Line
    Write-Host "   $line" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 总结
if ($lifinityUpdates -gt 0) {
    Write-Host "✅ Lifinity V2 集成成功！" -ForegroundColor Green
    Write-Host "   • 已收到 $lifinityUpdates 次池子更新" -ForegroundColor Green
    Write-Host "   • 数据结构解析正常" -ForegroundColor Green
} else {
    Write-Host "⚠️  Lifinity V2 未收到更新" -ForegroundColor Yellow
    Write-Host "   可能原因:" -ForegroundColor Gray
    Write-Host "   1. 池子地址不正确" -ForegroundColor Gray
    Write-Host "   2. 池子暂时没有交易活动" -ForegroundColor Gray
    Write-Host "   3. 需要更长的监控时间" -ForegroundColor Gray
    Write-Host "   4. 数据结构解析失败（检查错误日志）" -ForegroundColor Gray
}

Write-Host ""

