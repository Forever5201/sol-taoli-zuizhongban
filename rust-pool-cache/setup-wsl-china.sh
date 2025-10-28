#!/bin/bash

echo "============================================"
echo "  Rust Pool Cache - WSL 中国环境设置"
echo "============================================"
echo ""

# 步骤 1: 使用国内镜像安装 Rust
echo "[1] 安装 Rust（使用中科大镜像）..."
if command -v cargo &> /dev/null; then
    echo "    ✓ Rust 已安装: $(rustc --version)"
else
    echo "    正在从中科大镜像下载..."
    export RUSTUP_DIST_SERVER=https://mirrors.ustc.edu.cn/rust-static
    export RUSTUP_UPDATE_ROOT=https://mirrors.ustc.edu.cn/rust-static/rustup
    
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    if [ $? -eq 0 ]; then
        source $HOME/.cargo/env
        echo "    ✓ Rust 安装成功: $(rustc --version)"
    else
        echo "    ✗ Rust 安装失败"
        exit 1
    fi
fi
echo ""

# 步骤 2: 配置 cargo 使用国内镜像
echo "[2] 配置 cargo 使用国内镜像（加速依赖下载）..."
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << 'EOF'
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"

[net]
git-fetch-with-cli = true
EOF
echo "    ✓ cargo 镜像配置完成"
echo ""

# 步骤 3: 获取 Windows IP（用于 Solana 连接）
echo "[3] 配置 Solana WebSocket 代理..."
WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
export HTTP_PROXY=http://${WINDOWS_IP}:7890
export HTTPS_PROXY=http://${WINDOWS_IP}:7890
echo "    Windows IP: $WINDOWS_IP"
echo "    代理: $HTTP_PROXY"
echo ""

# 步骤 4: 测试代理（可选，不影响编译）
echo "[4] 测试 Clash 代理..."
if curl -s --max-time 5 -I https://api.mainnet-beta.solana.com | grep -q "HTTP"; then
    echo "    ✓ 代理连接成功，可以访问 Solana"
else
    echo "    ⚠ 代理连接失败"
    echo "    提示："
    echo "    1. 确保 Clash 'Allow LAN' 已开启"
    echo "    2. 检查 Windows 防火墙是否阻止端口 7890"
    echo ""
    echo "    程序仍会继续编译（编译不需要代理）"
    echo "    但运行时可能无法连接 Solana WebSocket"
fi
echo ""

# 步骤 5: 编译项目
echo "[5] 编译项目（首次需要 5-10 分钟）..."
if [ ! -f "Cargo.toml" ]; then
    echo "    ✗ 错误: 未找到 Cargo.toml"
    echo "    当前目录: $(pwd)"
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

# 步骤 6: 运行程序
echo "[6] 启动 Rust Pool Cache..."
echo "    使用代理连接 Solana: $HTTP_PROXY"
echo "    按 Ctrl+C 停止程序"
echo ""
echo "================================================"
echo ""

# 确保代理环境变量传递给 cargo run
HTTP_PROXY=$HTTP_PROXY HTTPS_PROXY=$HTTPS_PROXY cargo run --release




