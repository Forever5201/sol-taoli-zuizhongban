# Solana CLI 安装脚本
# 解决 TLS 连接问题

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "安装 Solana CLI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启用 TLS 1.2（修复下载问题）
Write-Host "[1/5] 配置网络连接..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "✅ TLS 1.2 已启用" -ForegroundColor Green
Write-Host ""

# 下载安装器
Write-Host "[2/5] 下载 Solana CLI 安装器..." -ForegroundColor Yellow
$url = "https://release.solana.com/v1.18.0/solana-install-init-x86_64-pc-windows-msvc.exe"
$output = "$env:TEMP\solana-install.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "✅ 下载完成: $output" -ForegroundColor Green
} catch {
    Write-Host "❌ 下载失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "备用方案：" -ForegroundColor Yellow
    Write-Host "1. 使用浏览器手动下载：" -ForegroundColor Yellow
    Write-Host "   $url" -ForegroundColor Cyan
    Write-Host "2. 下载后双击运行安装器" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车退出"
    exit 1
}
Write-Host ""

# 运行安装器
Write-Host "[3/5] 运行安装器..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟..." -ForegroundColor Gray
Write-Host ""

try {
    Start-Process -FilePath $output -ArgumentList "v1.18.0" -Wait -NoNewWindow
    Write-Host "✅ 安装完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 安装失败: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 配置环境变量（当前会话）
Write-Host "[4/5] 配置环境变量..." -ForegroundColor Yellow
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
$env:Path += ";$solanaPath"
Write-Host "✅ 已添加到 PATH: $solanaPath" -ForegroundColor Green
Write-Host ""

# 验证安装
Write-Host "[5/5] 验证安装..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>&1
    Write-Host "✅ $version" -ForegroundColor Green
} catch {
    Write-Host "⚠️  当前会话无法识别 solana 命令" -ForegroundColor Yellow
    Write-Host "请关闭此 PowerShell 窗口并重新打开" -ForegroundColor Yellow
}
Write-Host ""

# 完成
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "安装成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Solana CLI 安装位置：" -ForegroundColor Yellow
Write-Host "$solanaPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "[重要] 下一步：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 关闭此 PowerShell 窗口" -ForegroundColor White
Write-Host "2. 重新打开 PowerShell" -ForegroundColor White
Write-Host "3. 验证安装: solana --version" -ForegroundColor Cyan
Write-Host "4. 导入助记词: solana-keygen recover -o keypairs/flashloan-wallet.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "或者使用我们的导入工具（不需要关闭窗口）：" -ForegroundColor Yellow
Write-Host "pnpm tsx scripts/import-mnemonic.ts word1 word2 ... word12" -ForegroundColor Cyan
Write-Host ""

Read-Host "按回车关闭"
