@echo off
REM 一键修复 WSL DNS 配置

echo ========================================
echo  修复 WSL DNS 配置
echo ========================================
echo.
echo 此脚本将：
echo 1. 配置 WSL 使用公共 DNS (8.8.8.8, 1.1.1.1)
echo 2. 禁用 WSL 自动生成 DNS
echo 3. 重启 WSL
echo.
echo ⚠️  需要在 WSL 中输入 sudo 密码
echo.
pause

echo.
echo [1/3] 配置 WSL DNS...
wsl -u root bash -c "echo '[network]' > /etc/wsl.conf && echo 'generateResolvConf = false' >> /etc/wsl.conf && echo '✅ wsl.conf 已配置'"

echo.
echo [2/3] 设置 DNS 服务器...
wsl -u root bash -c "rm -f /etc/resolv.conf && echo 'nameserver 8.8.8.8' > /etc/resolv.conf && echo 'nameserver 8.8.4.4' >> /etc/resolv.conf && echo 'nameserver 1.1.1.1' >> /etc/resolv.conf && echo 'nameserver 223.5.5.5' >> /etc/resolv.conf && echo '✅ DNS 服务器已配置'"

echo.
echo [3/3] 重启 WSL...
wsl --shutdown
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo  ✅ DNS 配置完成！
echo ========================================
echo.
echo 现在测试 DNS 解析...
echo.

wsl bash -c "nslookup mainnet.helius-rpc.com | head -10"

echo.
echo ========================================
echo  如果上面显示了 IP 地址，说明 DNS 正常！
echo ========================================
pause


