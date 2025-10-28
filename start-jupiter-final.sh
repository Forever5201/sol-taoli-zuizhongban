#!/bin/bash

#  Jupiter 本地 API 终极启动脚本
# 自动修复 DNS → 启动 Jupiter API

echo "🚀 Jupiter Local API - 终极启动脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: 临时修复 DNS（每次运行时）
echo ""
echo "[1/3] 🔧 修复 WSL DNS..."

# 备份原配置
sudo cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null

# 写入可用的 DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf > /dev/null

echo "     ✅ DNS 已临时配置为 8.8.8.8"

# Step 2: 测试 DNS
echo ""
echo "[2/3] 🧪 测试 DNS 解析..."

if ping -c 1 -W 2 mainnet.helius-rpc.com > /dev/null 2>&1; then
    echo "     ✅ DNS 解析正常"
else
    echo "     ❌ DNS 解析失败"
    echo "     ⚠️  请确保 Clash TUN 模式已启用"
    echo "     继续尝试启动..."
fi

# Step 3: 启动 Jupiter API
echo ""
echo "[3/3] 🚀 启动 Jupiter API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "     RPC: Helius Mainnet"
echo "     端口: 8080"
echo "     模式: 环形套利"
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


