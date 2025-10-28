#!/bin/bash

echo "============================================"
echo "  Rust Pool Cache - WSL 环境设置和运行"
echo "============================================"
echo ""

# 步骤 1: 检查 Rust 是否安装
echo "[1] 检查 Rust 安装..."
if command -v cargo &> /dev/null; then
    echo "    ✓ Rust 已安装: $(rustc --version)"
else
    echo "    ✗ Rust 未安装，正在安装..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo "    ✓ Rust 安装完成"
fi
echo ""

# 步骤 2: 获取 Windows IP（用于代理）
echo "[2] 配置代理..."
WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "    Windows IP: $WINDOWS_IP"

# 设置代理环境变量
export HTTP_PROXY=http://${WINDOWS_IP}:7890
export HTTPS_PROXY=http://${WINDOWS_IP}:7890
echo "    代理设置: $HTTP_PROXY"

# 测试代理连接
echo "    测试代理连接..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://www.google.com | grep -q "200\|301\|302"; then
    echo "    ✓ 代理连接正常"
else
    echo "    ⚠ 代理连接失败，将尝试直连"
    echo "    提示: 请确保 Clash 中启用了 'Allow LAN'（允许局域网）"
    unset HTTP_PROXY
    unset HTTPS_PROXY
fi
echo ""

# 步骤 3: 编译项目
echo "[3] 编译项目（首次编译需要 5-10 分钟）..."
if [ ! -f "Cargo.toml" ]; then
    echo "    ✗ 错误: 未找到 Cargo.toml"
    echo "    请确保在项目目录中运行此脚本"
    exit 1
fi

cargo build --release
if [ $? -eq 0 ]; then
    echo "    ✓ 编译成功"
else
    echo "    ✗ 编译失败"
    exit 1
fi
echo ""

# 步骤 4: 运行程序
echo "[4] 启动 Rust Pool Cache..."
echo "    按 Ctrl+C 停止程序"
echo ""
echo "================================================"
echo ""

cargo run --release




