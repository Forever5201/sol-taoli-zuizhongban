#!/bin/bash
# ===================================================================
# 闪电贷套利机器人启动脚本 (Linux/Mac)
# ===================================================================

echo ""
echo "===================================="
echo "🚀 Solana 闪电贷套利机器人"
echo "===================================="
echo ""

# 检查 Node.js
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi
node --version
echo "✅ Node.js 已安装"
echo ""

# 检查钱包文件
echo "[2/6] 检查钱包配置..."
if [ ! -f "keypairs/flashloan-wallet.json" ]; then
    echo "❌ 错误: 未找到钱包文件"
    echo "请确保 keypairs/flashloan-wallet.json 存在"
    exit 1
fi
echo "✅ 钱包文件存在"
echo ""

# 检查配置文件
echo "[3/6] 检查配置文件..."
if [ ! -f "configs/flashloan-serverchan.toml" ]; then
    echo "❌ 错误: 未找到配置文件"
    echo "请确保 configs/flashloan-serverchan.toml 存在"
    exit 1
fi
echo "✅ 配置文件存在"
echo ""

# 安装依赖
echo "[4/6] 安装/检查依赖..."
pnpm install
if [ $? -ne 0 ]; then
    echo "❌ 错误: 依赖安装失败"
    exit 1
fi
echo "✅ 依赖已就绪"
echo ""

# 构建项目
echo "[5/6] 构建项目..."
pnpm build
if [ $? -ne 0 ]; then
    echo "❌ 错误: 项目构建失败"
    exit 1
fi
echo "✅ 项目构建成功"
echo ""

# 启动机器人
echo "[6/6] 启动闪电贷套利机器人..."
echo ""
echo "===================================="
echo "📱 监控提示："
echo "请关注您的微信\"服务通知\""
echo "机器人运行状态会实时推送"
echo "===================================="
echo ""
echo "💡 提示："
echo "- 按 Ctrl+C 可以随时停止机器人"
echo "- 日志文件: logs/flashloan.log"
echo "- 配置文件: configs/flashloan-serverchan.toml"
echo ""
echo "🚀 正在启动..."
echo ""

# 启动机器人（使用闪电贷配置）
pnpm start:flashloan --config=configs/flashloan-serverchan.toml

# 如果机器人退出
echo ""
echo "===================================="
echo "机器人已停止"
echo "===================================="

