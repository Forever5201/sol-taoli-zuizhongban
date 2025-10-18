#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo " Solana Arbitrage Bot - Environment Setup"
echo "========================================"
echo

# 检查Node.js是否安装
echo "[1/6] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed!"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    echo "Or use nvm: nvm install 20"
    exit 1
fi

# 检查Node.js版本
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

echo "Node.js version: v$NODE_VERSION"

if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${RED}[ERROR]${NC} Node.js version must be 20 or higher!"
    echo "Current version: $NODE_VERSION"
    echo "Please upgrade Node.js from https://nodejs.org/"
    echo "Or use nvm: nvm install 20 && nvm use 20"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js $NODE_VERSION detected"
echo

# 检查npm
echo "[2/6] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} npm is not installed!"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}[OK]${NC} npm $NPM_VERSION detected"
echo

# 清理旧的node_modules
echo "[3/6] Cleaning old dependencies..."
if [ -d "node_modules" ]; then
    echo "Removing root node_modules..."
    rm -rf node_modules
fi
if [ -d "packages/core/node_modules" ]; then
    echo "Removing core node_modules..."
    rm -rf packages/core/node_modules
fi
if [ -d "packages/onchain-bot/node_modules" ]; then
    echo "Removing onchain-bot node_modules..."
    rm -rf packages/onchain-bot/node_modules
fi
echo -e "${GREEN}[OK]${NC} Cleanup complete"
echo

# 安装根依赖
echo "[4/6] Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install root dependencies!"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Root dependencies installed"
echo

# 安装核心包依赖
echo "[5/6] Installing core package dependencies..."
cd packages/core
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install core dependencies!"
    cd ../..
    exit 1
fi
cd ../..
echo -e "${GREEN}[OK]${NC} Core dependencies installed"
echo

# 安装onchain-bot依赖
echo "[6/6] Installing onchain-bot dependencies..."
cd packages/onchain-bot
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install onchain-bot dependencies!"
    cd ../..
    exit 1
fi
cd ../..
echo -e "${GREEN}[OK]${NC} Onchain-bot dependencies installed"
echo

# 构建项目
echo "[7/6] Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[WARNING]${NC} Build failed, but dependencies are installed"
    echo "You can manually run: npm run build"
else
    echo -e "${GREEN}[OK]${NC} Build successful"
fi
echo

echo "========================================"
echo " Environment Setup Complete!"
echo "========================================"
echo
echo "Next steps:"
echo "1. Review configuration files in packages/onchain-bot/"
echo "2. Copy config.example.toml or config.jito.toml"
echo "3. Edit your config file with your settings"
echo "4. Run: npm run start:onchain-bot -- --config your-config.toml"
echo
echo "Quick test commands:"
echo "- npm run demo                  (Test economics model)"
echo "- npm run cost-sim             (Cost simulator)"
echo "- npm run jito-monitor         (Jito tip monitor)"
echo
