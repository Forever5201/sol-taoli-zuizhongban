# Meteora DLMM IDL 下载脚本
# 尝试多个可能的位置

$ErrorActionPreference = "Continue"
$proxy = "http://127.0.0.1:7890"

Write-Host "🔍 正在查找Meteora DLMM IDL文件...`n" -ForegroundColor Cyan

# 可能的IDL位置
$urls = @(
    "https://raw.githubusercontent.com/meteoraag/dlmm-sdk/master/programs/lb_clmm/idl/lb_clmm.json",
    "https://raw.githubusercontent.com/meteoraag/dlmm-sdk/main/programs/lb_clmm/idl/lb_clmm.json",
    "https://raw.githubusercontent.com/meteoraag/dlmm-sdk/master/target/idl/lb_clmm.json",
    "https://raw.githubusercontent.com/meteoraag/dlmm-sdk/main/target/idl/lb_clmm.json"
)

$success = $false

foreach ($url in $urls) {
    Write-Host "尝试: $url" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -Proxy $proxy -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            # 保存文件
            $response.Content | Out-File -FilePath "idl/meteora-dlmm.json" -Encoding UTF8
            
            Write-Host "✅ 成功下载IDL文件！" -ForegroundColor Green
            Write-Host "   文件大小: $($response.Content.Length) 字节" -ForegroundColor Green
            
            # 验证JSON格式
            try {
                $json = $response.Content | ConvertFrom-Json
                Write-Host "   ✅ JSON格式验证通过" -ForegroundColor Green
                Write-Host "   程序名: $($json.name)" -ForegroundColor Green
                Write-Host "   版本: $($json.version)" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  JSON格式验证失败" -ForegroundColor Yellow
            }
            
            $success = $true
            break
        }
    }
    catch {
        Write-Host "   ❌ 失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $success) {
    Write-Host "`n❌ 所有尝试都失败了" -ForegroundColor Red
    Write-Host "`n💡 备选方案:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://github.com/meteoraag/dlmm-sdk" -ForegroundColor Yellow
    Write-Host "2. 手动查找 IDL 文件" -ForegroundColor Yellow
    Write-Host "3. 下载后放到: idl/meteora-dlmm.json" -ForegroundColor Yellow
} else {
    Write-Host "`n✨ IDL文件已保存到: idl/meteora-dlmm.json" -ForegroundColor Green
    Write-Host "`n下一步: 运行解析器生成Rust代码" -ForegroundColor Cyan
    Write-Host "  npx tsx tools/anchor-idl-parser.ts idl/meteora-dlmm.json LbPair" -ForegroundColor White
}



