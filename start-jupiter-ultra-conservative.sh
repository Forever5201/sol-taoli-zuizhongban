#!/bin/bash

echo "🚀 Jupiter Local API - Ultra Conservative Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Ultra Conservative Strategy:"
echo "   - Single thread (minimal RPC load)"
echo "   - Helius Free RPC (100K/month)"
echo "   - Expected startup time: 20-40 minutes"
echo "   - ONE-TIME attempt only (do not retry!)"
echo ""
echo "📊 Success depends on:"
echo "   1. Your Helius API quota is fresh (wait 24h if failed recently)"
echo "   2. Stable proxy connection"
echo "   3. Patience (do not interrupt!)"
echo ""

# Check if proxychains is configured
if [ ! -f "/tmp/proxychains-jupiter.conf" ]; then
    echo "❌ Proxychains not configured. Run ./setup-proxychains.sh first"
    exit 1
fi

# Test proxy
echo "🧪 Testing proxy..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ❌ Proxy test failed"
    exit 1
fi
echo "   ✅ Proxy working"
echo ""

# Confirm with user
echo "⚠️  IMPORTANT: Have you waited at least 24 hours since last attempt?"
echo "   (This ensures Helius quota is refreshed)"
echo ""
read -p "Press Enter to continue, or Ctrl+C to cancel..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Jupiter API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   RPC: Helius Mainnet (Free)"
echo "   Port: 8080"
echo "   Threads: 1 (ultra conservative)"
echo "   Proxy: Clash via Proxychains"
echo ""
echo "📝 Expected log sequence:"
echo "   [INFO] Fetching markets from europa server...  (10-15s)"
echo "   [INFO] Loaded XXXXX markets                     (immediate)"
echo "   [INFO] Initializing router...                   (20-30 mins) ← BE PATIENT!"
echo "   [INFO] Server listening on http://0.0.0.0:8080  (success!)"
echo ""
echo "⏳ Starting now. This will take 20-40 minutes. DO NOT INTERRUPT."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start with extreme conservative settings
proxychains4 -f /tmp/proxychains-jupiter.conf ./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $? -eq 0 ]; then
    echo "✅ Jupiter API stopped gracefully"
else
    echo "❌ Jupiter API stopped with error"
    echo ""
    echo "Possible reasons:"
    echo "  1. Helius quota exhausted (wait 24h and retry)"
    echo "  2. Network interruption"
    echo "  3. Proxy disconnected"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

