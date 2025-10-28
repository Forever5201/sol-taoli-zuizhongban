#!/bin/bash

# 测试所有可能的代理环境变量配置

echo "🧪 测试所有代理环境变量方法"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROXY_HTTP="http://127.0.0.1:7890"
PROXY_SOCKS5="socks5://127.0.0.1:7891"

# 测试 1: 小写 + 大写 HTTP 代理
echo "📝 测试 1: HTTP 代理（小写 + 大写）"
export http_proxy="$PROXY_HTTP"
export https_proxy="$PROXY_HTTP"
export HTTP_PROXY="$PROXY_HTTP"
export HTTPS_PROXY="$PROXY_HTTP"

echo "   http_proxy=$http_proxy"
echo "   https_proxy=$https_proxy"
echo "   HTTP_PROXY=$HTTP_PROXY"
echo "   HTTPS_PROXY=$HTTPS_PROXY"
echo ""

# 测试 curl（应该成功）
echo "   🧪 测试 curl..."
if curl -s -m 5 https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ curl 成功（验证代理工作）"
else
    echo "   ❌ curl 失败（代理不工作）"
    exit 1
fi

# 测试 Jupiter API（可能失败）
echo ""
echo "   🧪 测试 Jupiter API（15 秒超时）..."
echo "   如果看到 'Fetching markets' 则成功，否则失败"
echo ""
timeout 15 ./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage 2>&1 | grep -E "(Fetching|Loaded|listening|error|panic)" | head -10

TEST1_EXIT=$?
echo ""
if [ $TEST1_EXIT -eq 0 ] || [ $TEST1_EXIT -eq 124 ]; then
    echo "   ⚠️  测试 1 失败或超时"
else
    echo "   ✅ 测试 1 可能成功（请查看上面的输出）"
    exit 0
fi

# 清除之前的变量
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 2: ALL_PROXY (HTTP)
echo "📝 测试 2: ALL_PROXY（HTTP）"
export ALL_PROXY="$PROXY_HTTP"
export all_proxy="$PROXY_HTTP"

echo "   ALL_PROXY=$ALL_PROXY"
echo "   all_proxy=$all_proxy"
echo ""

# 测试 curl
echo "   🧪 测试 curl..."
if curl -s -m 5 https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ curl 成功"
else
    echo "   ❌ curl 失败"
fi

# 测试 Jupiter API
echo ""
echo "   🧪 测试 Jupiter API（15 秒超时）..."
echo ""
timeout 15 ./jupiter-swap-api \
  --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
  --port 8080 \
  --host 0.0.0.0 \
  --allow-circular-arbitrage 2>&1 | grep -E "(Fetching|Loaded|listening|error|panic)" | head -10

TEST2_EXIT=$?
echo ""
if [ $TEST2_EXIT -eq 0 ] || [ $TEST2_EXIT -eq 124 ]; then
    echo "   ⚠️  测试 2 失败或超时"
else
    echo "   ✅ 测试 2 可能成功"
    exit 0
fi

# 清除变量
unset ALL_PROXY all_proxy

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 3: ALL_PROXY (SOCKS5)
echo "📝 测试 3: ALL_PROXY（SOCKS5 - 如果 Clash 支持）"
export ALL_PROXY="$PROXY_SOCKS5"
export all_proxy="$PROXY_SOCKS5"

echo "   ALL_PROXY=$ALL_PROXY"
echo "   all_proxy=$all_proxy"
echo ""

# 测试 curl（可能不支持 SOCKS5）
echo "   🧪 测试 curl..."
if curl -s -m 5 --socks5 127.0.0.1:7891 https://europa2.jup.ag > /dev/null 2>&1; then
    echo "   ✅ SOCKS5 可用"
    
    # 测试 Jupiter API
    echo ""
    echo "   🧪 测试 Jupiter API（15 秒超时）..."
    echo ""
    timeout 15 ./jupiter-swap-api \
      --rpc-url 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683' \
      --port 8080 \
      --host 0.0.0.0 \
      --allow-circular-arbitrage 2>&1 | grep -E "(Fetching|Loaded|listening|error|panic)" | head -10
    
    TEST3_EXIT=$?
    echo ""
    if [ $TEST3_EXIT -eq 0 ] || [ $TEST3_EXIT -eq 124 ]; then
        echo "   ⚠️  测试 3 失败或超时"
    else
        echo "   ✅ 测试 3 可能成功"
        exit 0
    fi
else
    echo "   ❌ SOCKS5 不可用（跳过）"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ 所有环境变量方法都失败"
echo ""
echo "✅ 结论：jupiter-swap-api 不支持代理环境变量"
echo "✅ 必须使用 Proxychains 强制代理"
echo ""
echo "运行以下命令继续："
echo "  ./setup-proxychains.sh"
echo "  ./start-jupiter-with-proxychains.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


