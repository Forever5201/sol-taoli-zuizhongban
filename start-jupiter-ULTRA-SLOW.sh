#!/bin/bash

echo "🐌 Jupiter Local API - ULTRA SLOW MODE (Maximum Conservative)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WARNING: This is EXTREMELY SLOW but has highest success rate"
echo ""
echo "📊 Configuration:"
echo "   RPC: Public Solana Mainnet (api.mainnet-beta.solana.com)"
echo "   Total Threads: 1 (minimum)"
echo "   Update Threads: 1 (minimum)"
echo "   Webserver Threads: 1 (minimum)"
echo "   Poll Interval: 5000ms (25x slower than default)"
echo "   Port: 8080"
echo "   Proxy: Clash via Proxychains"
echo ""
echo "⏱️  Expected startup time: 30-60 minutes (possibly longer)"
echo "   This is NORMAL. The slower it runs, the less likely to hit 429."
echo ""
echo "💡 RPC Request Calculation:"
echo "   - Default: ~10-20 requests/second → 600-1200/min → 429 ERROR"
echo "   - This mode: ~1-2 requests/second → 60-120/min → SHOULD WORK"
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
    exit 1
fi
echo "   ✅ Proxy working"
echo ""

# Test Europa access
echo "🧪 Testing access to Europa..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 -I https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ❌ Cannot access europa2.jup.ag"
    exit 1
fi
echo "   ✅ Can access Europa"
echo ""

# Test RPC access
echo "🧪 Testing access to Public Solana RPC..."
if ! proxychains4 -f /tmp/proxychains-jupiter.conf -q curl -s -m 5 -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
    https://api.mainnet-beta.solana.com > /dev/null 2>&1; then
    echo "   ❌ Cannot access public Solana RPC"
    exit 1
fi
echo "   ✅ Can access public RPC"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐌 Starting Jupiter API in ULTRA SLOW mode..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Expected log sequence:"
echo "   [INFO] Fetching markets from europa server...  ← 10-30s"
echo "   [INFO] Loaded XXXXX markets                     ← immediate"
echo "   [INFO] Initializing router...                   ← 30-60 mins"
echo "   [INFO] Loading AMM accounts...                  ← BE PATIENT"
echo "   [INFO] Server listening on http://0.0.0.0:8080  ← SUCCESS!"
echo ""
echo "⏳ Starting now. This will take 30-60 minutes (or longer)."
echo "   🔥 KEY: The slower it runs, the higher success rate!"
echo "   ⚠️  If you see 429 error → STOP immediately and wait 24h"
echo ""
echo "💡 You can monitor in another terminal:"
echo "   wsl curl http://localhost:8080/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start Jupiter API with MAXIMUM conservative settings
proxychains4 -f /tmp/proxychains-jupiter.conf ./jupiter-swap-api \
  --rpc-url 'https://api.mainnet-beta.solana.com' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage \
  --total-thread-count 1 \
  --update-thread-count 1 \
  --webserver-thread-count 1 \
  --snapshot-poll-interval-ms 5000

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Jupiter API stopped gracefully"
else
    echo "❌ Jupiter API stopped with error (exit code: $EXIT_CODE)"
    echo ""
    echo "Common reasons:"
    echo "  1. 429 Too Many Requests → Wait 24 hours before retry"
    echo "  2. Network interruption → Check proxy/internet"
    echo "  3. RPC overload → Try again in a few hours"
    echo ""
    echo "💡 Next steps:"
    echo "   - If 429 error: Wait 24h, then retry"
    echo "   - If other error: Check logs above"
    echo "   - Alternative: Use remote API (zero cost, immediate)"
    echo "     Windows: start-with-remote-api.bat"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


