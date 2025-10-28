#!/bin/bash

# Jupiter 本地 API - 使用 Proxychains 强制代理
# Proxychains 可以让任何程序（包括 Rust 二进制）通过代理

echo "🚀 Jupiter Local API - Proxychains 模式"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 proxychains
if ! command -v proxychains4 &> /dev/null; then
    echo "❌ Proxychains 未安装"
    echo "请先运行: ./setup-proxychains.sh"
    exit 1
fi

echo "✅ Proxychains 已安装"
echo "📡 Proxy: http://127.0.0.1:7890 (Clash)"
echo ""

# 测试代理
echo "🧪 测试代理连接..."
if proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ✅ 代理连接正常"
else
    echo "   ❌ 代理连接失败"
    echo "   请确保 Clash 正在运行"
    exit 1
fi

echo ""
echo "🧪 测试访问 Europa..."
if proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 -I https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ 可以访问 europa2.jup.ag"
else
    echo "   ❌ 无法访问 europa2.jup.ag"
    exit 1
fi

# 启动 Jupiter API（通过 Proxychains）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 启动 Jupiter API（通过 Proxychains）..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   RPC: Helius Mainnet"
echo "   端口: 8080"
echo "   代理: Clash (127.0.0.1:7890)"
echo "   模式: 环形套利 + 8 线程"
echo "   强制代理: Proxychains ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 预期输出："
echo "   [INFO] Fetching markets from europa server...  ✅"
echo "   [INFO] Loaded XXXXX markets                     ✅"
echo "   [INFO] Server listening on http://0.0.0.0:8080  ✅"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 使用 Proxychains 启动 Jupiter API
# 所有 TCP 连接都会被强制通过 Clash 代理
proxychains4 -f /tmp/proxychains-jupiter.conf ./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 8

echo ""
echo "❌ Jupiter API 已停止"
