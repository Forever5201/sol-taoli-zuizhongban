#!/bin/bash

# 修复 WSL DNS 配置
# 让 WSL 能够通过 Clash TUN 正确解析域名

echo "🔧 修复 WSL DNS 配置..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 禁用 WSL 自动生成 DNS 配置
echo ""
echo "[1/4] 禁用自动 DNS 生成..."
sudo bash -c 'cat > /etc/wsl.conf << EOF
[network]
generateResolvConf = false

[boot]
systemd = false
EOF'

if [ $? -eq 0 ]; then
    echo "     ✅ /etc/wsl.conf 已配置"
else
    echo "     ❌ 配置失败（可能需要 sudo 密码）"
    exit 1
fi

# 2. 删除旧的 resolv.conf
echo ""
echo "[2/4] 删除旧的 DNS 配置..."
sudo rm -f /etc/resolv.conf
echo "     ✅ 已删除旧配置"

# 3. 创建新的 DNS 配置（使用可靠的公共 DNS）
echo ""
echo "[3/4] 配置新的 DNS 服务器..."
sudo bash -c 'cat > /etc/resolv.conf << EOF
# DNS 配置 - 通过 Clash TUN 出去
nameserver 8.8.8.8          # Google DNS (主)
nameserver 8.8.4.4          # Google DNS (备)
nameserver 1.1.1.1          # Cloudflare DNS
nameserver 223.5.5.5        # 阿里 DNS (中国优化)
options timeout:2 attempts:3
EOF'

if [ $? -eq 0 ]; then
    echo "     ✅ 新 DNS 配置已生效"
else
    echo "     ❌ 配置失败"
    exit 1
fi

# 4. 锁定配置文件（防止被覆盖）
sudo chattr +i /etc/resolv.conf 2>/dev/null || echo "     ⚠️  无法锁定文件（不影响使用）"

echo ""
echo "[4/4] 测试 DNS 解析..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 测试解析
echo ""
echo "🧪 测试 1: Helius RPC"
if nslookup mainnet.helius-rpc.com > /dev/null 2>&1; then
    echo "   ✅ mainnet.helius-rpc.com - 解析成功"
else
    echo "   ❌ mainnet.helius-rpc.com - 解析失败"
fi

echo ""
echo "🧪 测试 2: Europa 服务器"
if nslookup europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ europa2.jup.ag - 解析成功"
else
    echo "   ❌ europa2.jup.ag - 解析失败"
fi

echo ""
echo "🧪 测试 3: Ping 测试"
if ping -c 2 mainnet.helius-rpc.com > /dev/null 2>&1; then
    echo "   ✅ Ping mainnet.helius-rpc.com - 成功"
else
    echo "   ⚠️  Ping 失败（可能是防火墙阻止 ICMP）"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DNS 配置修复完成！"
echo ""
echo "⚠️  重要：请重启 WSL 让配置生效"
echo "   命令: wsl --shutdown"
echo ""


