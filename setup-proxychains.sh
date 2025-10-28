#!/bin/bash

# 安装并配置 Proxychains - 强制 Jupiter API 使用 Clash 代理

echo "🔧 安装 Proxychains..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否已安装
if command -v proxychains4 &> /dev/null; then
    echo "✅ Proxychains 已安装"
else
    echo "正在安装 proxychains-ng..."
    
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y proxychains-ng
    else
        echo "❌ 无法自动安装，请手动安装："
        echo "   sudo apt-get install proxychains-ng"
        exit 1
    fi
    
    if command -v proxychains4 &> /dev/null; then
        echo "✅ Proxychains 安装成功"
    else
        echo "❌ 安装失败"
        exit 1
    fi
fi

echo ""
echo "🔧 配置 Proxychains..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 创建配置文件
cat > /tmp/proxychains-jupiter.conf << 'EOF'
# Proxychains 配置 - Jupiter API
strict_chain
proxy_dns
remote_dns_subnet 224
tcp_read_time_out 15000
tcp_connect_time_out 8000
quiet_mode

[ProxyList]
# Clash HTTP 代理
http 127.0.0.1 7890
EOF

echo "✅ 配置文件已创建: /tmp/proxychains-jupiter.conf"
echo ""

# 测试 Proxychains
echo "🧪 测试 Proxychains..."
if proxychains4 -f /tmp/proxychains-jupiter.conf curl -s -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ✅ Proxychains 工作正常"
else
    echo "   ⚠️  Proxychains 测试失败"
    echo "   请确保 Clash 正在运行且端口是 7890"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Proxychains 配置完成！"
echo ""
echo "现在可以运行："
echo "  ./start-jupiter-with-proxychains.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


