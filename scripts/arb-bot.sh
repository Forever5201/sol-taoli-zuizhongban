#!/bin/bash
# ========================================
# Solana Arbitrage Bot 启动脚本 (Linux/Mac)
# ========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "========================================"
echo "🚀 Solana Arbitrage Bot Launcher"
echo "========================================"
echo ""

# ========================================
# 检查Node.js
# ========================================
print_step "[1/4] 检查Node.js环境..."

if ! command -v node &> /dev/null; then
    print_error "Node.js未安装"
    echo ""
    echo "请访问 https://nodejs.org 下载安装"
    echo "推荐版本: 20.x LTS"
    echo ""
    echo "或使用nvm安装:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install 20"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "   Node.js版本: $NODE_VERSION"
print_success "Node.js已安装"
echo ""

# ========================================
# 检查依赖
# ========================================
print_step "[2/4] 检查项目依赖..."

if [ ! -d "node_modules" ]; then
    print_warning "依赖未安装"
    echo "   正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "依赖安装失败"
        exit 1
    fi
    print_success "依赖安装完成"
else
    print_success "依赖已安装"
fi
echo ""

# ========================================
# 编译代码
# ========================================
print_step "[3/4] 编译TypeScript代码..."

if [ ! -d "packages/launcher/dist" ]; then
    echo "   正在编译..."
    npm run build > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        print_error "编译失败"
        echo "   运行 'npm run build' 查看详细错误"
        exit 1
    fi
    print_success "编译完成"
else
    print_success "代码已编译"
fi
echo ""

# ========================================
# 启动Launcher
# ========================================
print_step "[4/4] 启动Launcher..."
echo ""

# 解析命令行参数
CONFIG_FILE="configs/launcher.toml"
while [[ $# -gt 0 ]]; do
    case $1 in
        --config|-c)
            CONFIG_FILE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo "配置文件: $CONFIG_FILE"
echo ""

# 启动
node packages/launcher/dist/index.js --config "$CONFIG_FILE"

# 退出处理
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -ne 0 ]; then
    print_error "Launcher异常退出 (exit code: $EXIT_CODE)"
    exit $EXIT_CODE
fi

print_success "Launcher正常退出"
