# Solana CLI 安装脚本 (Windows)
Write-Host "🚀 安装 Solana CLI 工具" -ForegroundColor Green
Write-Host ""

# 检查是否已安装
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin\solana.exe"
if (Test-Path $solanaPath) {
    Write-Host "✅ Solana CLI 已安装" -ForegroundColor Green
    & $solanaPath --version
    Write-Host ""
    Write-Host "如需重新安装，请先运行:" -ForegroundColor Yellow
    Write-Host "Remove-Item -Recurse -Force $env:USERPROFILE\.local\share\solana" -ForegroundColor Yellow
    exit
}

Write-Host "📥 下载并安装 Solana CLI..." -ForegroundColor Cyan
Write-Host ""

try {
    # 下载安装器
    $installerUrl = "https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe"
    $installerPath = "$env:TEMP\solana-install-init.exe"
    
    Write-Host "下载地址: $installerUrl" -ForegroundColor Gray
    
    # 使用系统代理下载（如果Clash开启System Proxy）
    $webClient = New-Object System.Net.WebClient
    $webClient.Proxy = [System.Net.WebRequest]::GetSystemWebProxy()
    $webClient.Proxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials
    
    Write-Host "正在下载... (约100MB，需要几分钟)" -ForegroundColor Yellow
    $webClient.DownloadFile($installerUrl, $installerPath)
    
    Write-Host "✅ 下载完成" -ForegroundColor Green
    Write-Host ""
    
    # 运行安装器
    Write-Host "📦 正在安装..." -ForegroundColor Cyan
    Start-Process -FilePath $installerPath -ArgumentList "v1.18.22" -Wait
    
    # 添加到PATH
    $solanaDir = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$solanaDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$solanaDir", "User")
        Write-Host "✅ 已添加到PATH" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "🎉 Solana CLI 安装成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  重要: 请重新打开PowerShell窗口使PATH生效" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "验证安装:" -ForegroundColor Cyan
    Write-Host "  solana --version" -ForegroundColor White
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Cyan
    Write-Host "  1. 重新打开PowerShell" -ForegroundColor White
    Write-Host "  2. 运行: solana-test-validator" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ 下载失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 解决方案:" -ForegroundColor Yellow
    Write-Host "1. 确保Clash的System Proxy已开启" -ForegroundColor White
    Write-Host "2. 或手动下载:" -ForegroundColor White
    Write-Host "   https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe" -ForegroundColor Gray
    Write-Host "3. 下载后双击运行安装" -ForegroundColor White
    Write-Host ""
}
