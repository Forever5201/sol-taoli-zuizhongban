#!/bin/bash

# Jupiter 本地 API - 使用公共 Solana RPC（无速率限制）

echo "🚀 Jupiter Local API - Proxychains + 公共 RPC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 使用公共 Solana RPC（无速率限制）"
echo "📡 Proxy: http://127.0.0.1:7890 (Clash via Proxychains)"
echo ""

# 测试 Proxychains
echo "🧪 测试 Proxychains..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ❌ Proxychains 测试失败"
    exit 1
fi
echo "   ✅ Proxychains 工作正常"
echo ""

# 启动 Jupiter API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 启动 Jupiter API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   RPC: 公共 Solana Mainnet (无速率限制)"
echo "   端口: 8080"
echo "   代理: Clash (127.0.0.1:7890)"
echo "   线程: 4（降低 RPC 负载）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

proxychains4 -f /tmp/proxychains-jupiter.conf ./jupiter-swap-api \
  --rpc-url 'https://api.mainnet-beta.solana.com' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 4

echo ""
echo "❌ Jupiter API 已停止"


