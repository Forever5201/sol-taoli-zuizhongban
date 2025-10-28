# 测试配置文件解析
$content = Get-Content "config.toml" -Raw

# 计数 [[pools]] 标记
$poolCount = ([regex]::Matches($content, '\[\[pools\]\]')).Count
Write-Host "Found $poolCount pool definitions in config.toml"

# 显示前5个池子的地址
$addresses = [regex]::Matches($content, 'address = "([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
Write-Host "`nFirst 5 addresses:"
$addresses | Select-Object -First 5 | ForEach-Object { Write-Host "  - $_" }

Write-Host "`nTotal addresses found: $($addresses.Count)"




