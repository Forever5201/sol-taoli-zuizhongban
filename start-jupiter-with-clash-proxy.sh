#!/bin/bash

# Jupiter 本地 API - 通过 Clash HTTP 代理启动
# 无需 TUN 模式，直接使用 Clash 的 HTTP 代理

echo "🚀 Jupiter Local API - Clash HTTP 代理模式"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 获取 Windows IP（WSL 中）
WINDOWS_IP=$(ip route show | grep default | awk '{print $3}')
if [ -z "$WINDOWS_IP" ]; then
    WINDOWS_IP="172.23.176.1"  # 备用 IP
fi

echo "📡 Windows IP: $WINDOWS_IP"
echo "🌐 Clash HTTP Proxy: http://$WINDOWS_IP:7890"
echo ""

# 2. 配置代理环境变量
export HTTP_PROXY="http://$WINDOWS_IP:7890"
export HTTPS_PROXY="http://$WINDOWS_IP:7890"
export http_proxy="http://$WINDOWS_IP:7890"
export https_proxy="http://$WINDOWS_IP:7890"

echo "✅ 代理环境变量已设置"
echo ""

# 3. 测试代理连接
echo "🧪 测试代理连接..."
if curl -s --proxy "$HTTP_PROXY" -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ✅ 代理连接正常"
else
    echo "   ⚠️  代理连接失败，但继续尝试..."
    echo "   请确保："
    echo "   1. Clash 正在运行"
    echo "   2. HTTP 代理端口是 7890"
    echo "   3. 允许局域网连接已启用"
fi

# 4. 测试 DNS 解析（通过代理）
echo ""
echo "🧪 测试 DNS 解析（通过代理）..."
if curl -s --proxy "$HTTP_PROXY" -m 5 -I https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ 可以访问 europa2.jup.ag"
else
    echo "   ⚠️  无法访问 europa2.jup.ag，但继续尝试..."
fi

# 5. 启动 Jupiter API
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 启动 Jupiter API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   RPC: Helius Mainnet (通过 Clash)"
echo "   端口: 8080"
echo "   模式: 环形套利 + 8 线程"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动 Jupiter API（所有网络请求都会通过 Clash 代理）
./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 8

echo ""
echo "❌ Jupiter API 已停止"


