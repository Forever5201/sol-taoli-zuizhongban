# Meteora DLMM IDL 下载脚本 (简化版)

$proxy = "http://127.0.0.1:7890"

Write-Host "Downloading Meteora DLMM IDL..."

# 尝试第一个URL
$url1 = "https://raw.githubusercontent.com/meteoraag/dlmm-sdk/master/programs/lb_clmm/idl/lb_clmm.json"
Write-Host "Try: $url1"

try {
    Invoke-WebRequest -Uri $url1 -Proxy $proxy -OutFile "idl/meteora-dlmm.json" -UseBasicParsing
    Write-Host "Success from master branch!"
    exit 0
} catch {
    Write-Host "Failed: $_"
}

# 尝试第二个URL  
$url2 = "https://raw.githubusercontent.com/meteoraag/dlmm-sdk/main/programs/lb_clmm/idl/lb_clmm.json"
Write-Host "Try: $url2"

try {
    Invoke-WebRequest -Uri $url2 -Proxy $proxy -OutFile "idl/meteora-dlmm.json" -UseBasicParsing
    Write-Host "Success from main branch!"
    exit 0
} catch {
    Write-Host "Failed: $_"
}

Write-Host "All attempts failed. Please download manually."



