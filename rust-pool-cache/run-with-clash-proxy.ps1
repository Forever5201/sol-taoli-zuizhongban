# 使用 Clash 代理启动 Rust Pool Cache

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Rust Pool Cache with Clash Proxy" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 设置 Clash 代理
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"

Write-Host "[1] 代理设置: $env:HTTP_PROXY" -ForegroundColor Green
Write-Host ""

# 测试代理连接
Write-Host "[2] 测试代理连接..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://www.google.com" -Proxy "http://127.0.0.1:7890" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "    ✓ 代理连接正常" -ForegroundColor Green
} catch {
    Write-Host "    ✗ 代理连接失败！" -ForegroundColor Red
    Write-Host "    请确保 Clash 正在运行" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

# 启动程序
Write-Host "[3] 启动 Rust Pool Cache..." -ForegroundColor Yellow
Write-Host "    按 Ctrl+C 停止程序" -ForegroundColor Gray
Write-Host ""

# 直接运行（继承环境变量）
& ".\target\release\solana-pool-cache.exe"




