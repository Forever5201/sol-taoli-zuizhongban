#!/bin/bash

# Jupiter 本地 API 启动脚本
# 使用 Helius RPC 和代理

echo "🚀 Starting Jupiter Local API Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ⚠️  IMPORTANT: Jupiter Solana RPC client doesn't support HTTP proxy
# If you're in China, enable Clash TUN mode for transparent proxying
# Otherwise, use a local Solana validator or public RPC

# Clear proxy variables (Jupiter will use direct connection)
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy

echo "📡 Network: Direct Connection (no proxy)"
echo "🔗 RPC: Helius Mainnet"
echo "🌐 Host: 0.0.0.0:8080"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动 Jupiter API
./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 8

# 如果服务退出，显示错误
echo ""
echo "❌ Jupiter API Server stopped unexpectedly"

