#!/bin/bash
#
# Devnet 测试脚本
# 用于快速测试 On-Chain Bot 的基本功能
#

set -e

echo "🧪 ========== Devnet 测试脚本 =========="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Node.js
echo -e "${YELLOW}[1/5] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
echo ""

# 检查依赖
echo -e "${YELLOW}[2/5] 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    npm install
fi
echo -e "${GREEN}✅ 依赖已就绪${NC}"
echo ""

# 检查配置
echo -e "${YELLOW}[3/5] 检查配置...${NC}"
if [ ! -f "configs/global.toml" ]; then
    echo -e "${RED}❌ 全局配置不存在${NC}"
    echo "请先创建 configs/global.toml（可以从 configs/global.example.toml 复制）"
    exit 1
fi
echo -e "${GREEN}✅ 配置文件存在${NC}"
echo ""

# 检查密钥
echo -e "${YELLOW}[4/5] 检查密钥文件...${NC}"
if [ ! -f "./test-keypair.json" ]; then
    echo -e "${YELLOW}⚠️  测试密钥不存在，尝试获取 Devnet SOL...${NC}"
    echo "请先创建测试密钥或使用 solana-keygen new"
    exit 1
fi
echo -e "${GREEN}✅ 密钥文件存在${NC}"
echo ""

# 运行 Bot（60秒测试）
echo -e "${YELLOW}[5/5] 启动 Bot（60秒测试）...${NC}"
echo ""
timeout 60 npm run start:onchain-bot -- --config packages/onchain-bot/config.example.toml || true
echo ""

# 检查日志
echo -e "${YELLOW}检查日志...${NC}"
if [ -f "logs/onchain-bot.log" ]; then
    echo -e "${GREEN}✅ 日志文件已生成${NC}"
    echo ""
    echo "最后10行日志:"
    tail -n 10 logs/onchain-bot.log
else
    echo -e "${YELLOW}⚠️  未找到日志文件${NC}"
fi

echo ""
echo -e "${GREEN}========== 测试完成 ==========${NC}"
echo ""


