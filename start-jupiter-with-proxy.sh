#!/bin/bash

# 通过 Windows RPC 代理启动 Jupiter API
# Windows RPC 代理监听在 8899 端口

echo "🚀 Starting Jupiter Local API (via Windows RPC Proxy)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 获取 Windows IP
WINDOWS_IP=$(ip route show | grep -i default | awk '{ print $3}')
RPC_PROXY="http://${WINDOWS_IP}:8899"

echo "📡 Windows IP: $WINDOWS_IP"
echo "🔗 RPC Proxy: $RPC_PROXY"
echo "🌐 Jupiter API: http://0.0.0.0:8080"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 RPC 代理连接
echo "🧪 Testing RPC proxy connection..."
if curl -s -m 5 -X POST "$RPC_PROXY" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null 2>&1; then
    echo "✅ RPC proxy is reachable!"
    echo ""
else
    echo "❌ Cannot reach RPC proxy at $RPC_PROXY"
    echo "   Please ensure Windows RPC proxy is running:"
    echo "   > node solana-rpc-proxy.js"
    exit 1
fi

# 启动 Jupiter API
echo "🚀 Starting Jupiter API..."
./jupiter-swap-api \
  --rpc-url "$RPC_PROXY" \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 8

echo ""
echo "❌ Jupiter API Server stopped"


