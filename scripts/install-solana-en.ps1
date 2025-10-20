# Solana CLI Installation Script
# Fix TLS connection issue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Solana CLI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Enable TLS 1.2
Write-Host "[1/5] Configuring network..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "OK TLS 1.2 enabled" -ForegroundColor Green
Write-Host ""

# Download installer
Write-Host "[2/5] Downloading Solana CLI installer..." -ForegroundColor Yellow
$url = "https://release.solana.com/v1.18.0/solana-install-init-x86_64-pc-windows-msvc.exe"
$output = "$env:TEMP\solana-install.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "OK Downloaded: $output" -ForegroundColor Green
} catch {
    Write-Host "ERROR Download failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solution:" -ForegroundColor Yellow
    Write-Host "1. Download manually with browser:" -ForegroundColor Yellow
    Write-Host "   $url" -ForegroundColor Cyan
    Write-Host "2. Run the downloaded installer" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Run installer
Write-Host "[3/5] Running installer..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

try {
    Start-Process -FilePath $output -ArgumentList "v1.18.0" -Wait -NoNewWindow
    Write-Host "OK Installation complete" -ForegroundColor Green
} catch {
    Write-Host "ERROR Installation failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Configure PATH
Write-Host "[4/5] Configuring PATH..." -ForegroundColor Yellow
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
$env:Path += ";$solanaPath"
Write-Host "OK Added to PATH: $solanaPath" -ForegroundColor Green
Write-Host ""

# Verify installation
Write-Host "[5/5] Verifying installation..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>&1
    Write-Host "OK $version" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Cannot find solana command in current session" -ForegroundColor Yellow
    Write-Host "Please close and reopen PowerShell" -ForegroundColor Yellow
}
Write-Host ""

# Complete
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Solana CLI installed to:" -ForegroundColor Yellow
Write-Host "$solanaPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "[IMPORTANT] Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Close this PowerShell window" -ForegroundColor White
Write-Host "2. Open a new PowerShell window" -ForegroundColor White
Write-Host "3. Verify: solana --version" -ForegroundColor Cyan
Write-Host "4. Import mnemonic: solana-keygen recover -o keypairs/flashloan-wallet.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or use our import tool (no need to close window):" -ForegroundColor Yellow
Write-Host "pnpm tsx scripts/import-mnemonic.ts word1 word2 ... word12" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to close"
