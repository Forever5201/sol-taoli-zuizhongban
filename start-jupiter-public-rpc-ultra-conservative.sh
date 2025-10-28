#!/bin/bash

echo "🚀 Jupiter Local API - Public RPC Ultra Conservative"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Configuration:"
echo "   RPC: Public Solana Mainnet (api.mainnet-beta.solana.com)"
echo "   Threads: 1 (ultra conservative)"
echo "   Port: 8080"
echo "   Proxy: Clash via Proxychains"
echo ""
echo "💡 Why Public RPC might work better:"
echo "   - Your Helius quota may be exhausted"
echo "   - Public RPC has different rate limits"
echo "   - Some users report better success with public RPC"
echo ""
echo "⏱️  Expected startup time: 15-30 minutes"
echo "⚠️  BE PATIENT - Do not interrupt!"
echo ""

# Check proxychains
if [ ! -f "/tmp/proxychains-jupiter.conf" ]; then
    echo "❌ Proxychains not configured"
    echo "Run: ./setup-proxychains.sh"
    exit 1
fi

# Test proxy
echo "🧪 Testing proxy..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 https://www.google.com > /dev/null 2>&1; then
    echo "   ❌ Proxy test failed"
    echo "   Make sure Clash is running with Allow LAN enabled"
    exit 1
fi
echo "   ✅ Proxy working"
echo ""

# Test access to Europa
echo "🧪 Testing access to Europa (Jupiter market data)..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 -I https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ❌ Cannot access europa2.jup.ag"
    echo "   Check your proxy settings"
    exit 1
fi
echo "   ✅ Can access europa2.jup.ag"
echo ""

# Test access to Public RPC
echo "🧪 Testing access to Public Solana RPC..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
    https://api.mainnet-beta.solana.com > /dev/null 2>&1; then
    echo "   ❌ Cannot access api.mainnet-beta.solana.com"
    exit 1
fi
echo "   ✅ Can access public Solana RPC"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Jupiter API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Expected log sequence:"
echo "   [INFO] Fetching markets from europa server...  ← 10-20s"
echo "   [INFO] Loaded XXXXX markets                     ← immediate"
echo "   [INFO] Initializing router...                   ← 15-30 mins"
echo "   [INFO] Server listening on http://0.0.0.0:8080  ← SUCCESS!"
echo ""
echo "⏳ Starting now. This will take 15-30 minutes."
echo "   If you see 429 error → STOP and wait 24 hours"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start Jupiter API with ultra conservative settings
proxychains4 -f /tmp/proxychains-jupiter.conf ./jupiter-swap-api \
  --rpc-url 'https://api.mainnet-beta.solana.com' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 1

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Jupiter API stopped gracefully"
else
    echo "❌ Jupiter API stopped with error (exit code: $EXIT_CODE)"
    echo ""
    echo "Common reasons:"
    echo "  1. 429 Too Many Requests → Wait 24 hours"
    echo "  2. Network interruption → Check proxy"
    echo "  3. RPC overload → Try again later"
    echo ""
    echo "💡 Alternative: Use remote API while waiting"
    echo "   Run: start-with-remote-api.bat (in Windows)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

