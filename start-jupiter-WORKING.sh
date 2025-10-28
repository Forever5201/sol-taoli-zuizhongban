#!/bin/bash

# Jupiter 本地 API - 正确的代理配置
# 关键：在 WSL 中使用 127.0.0.1（而不是 Windows IP）

echo "🚀 Jupiter Local API - Clash HTTP 代理（正确配置）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ✅ 关键修复：使用 127.0.0.1 而不是 Windows IP
# Clash 在 WSL 中可以通过 localhost 访问！
export HTTP_PROXY="http://127.0.0.1:7890"
export HTTPS_PROXY="http://127.0.0.1:7890"
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"

echo "📡 Proxy: http://127.0.0.1:7890"
echo "✅ 代理环境变量已设置"
echo ""

# 测试代理
echo "🧪 测试代理连接..."
if curl -s --proxy "$HTTP_PROXY" -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ✅ 代理连接正常"
else
    echo "   ⚠️  代理连接失败"
    echo "   请确保 Clash 正在运行且 Allow LAN 已启用"
    exit 1
fi

echo ""
echo "🧪 测试访问 Europa..."
if curl -s --proxy "$HTTP_PROXY" -m 5 -I https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ 可以访问 europa2.jup.ag"
else
    echo "   ❌ 无法访问 europa2.jup.ag"
    exit 1
fi

# 启动 Jupiter API
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 启动 Jupiter API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   RPC: Helius Mainnet (通过 Clash)"
echo "   端口: 8080"
echo "   代理: http://127.0.0.1:7890"
echo "   模式: 环形套利 + 8 线程"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 8

echo ""
echo "❌ Jupiter API 已停止"


