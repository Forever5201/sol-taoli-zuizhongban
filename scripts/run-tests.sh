#!/bin/bash
# Solana套利机器人 - 测试运行脚本 (Linux/Mac)
# 使用方法: ./run-tests.sh [选项]
# 选项:
#   all        - 运行所有测试（默认）
#   unit       - 仅运行单元测试
#   integration- 仅运行集成测试
#   coverage   - 运行测试并生成覆盖率报告
#   watch      - 监视模式

set -e

echo "========================================"
echo "  Solana套利机器人 - 测试套件"
echo "========================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到Node.js，请先安装Node.js 20+"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "[提示] 首次运行，正在安装依赖..."
    npm install
fi

# 根据参数运行测试
TEST_TYPE=${1:-all}

echo "[信息] 运行测试类型: $TEST_TYPE"
echo ""

case $TEST_TYPE in
    all)
        echo "运行所有测试..."
        npm test
        ;;
    unit)
        echo "运行单元测试..."
        npm run test:unit
        ;;
    integration)
        echo "运行集成测试..."
        npm run test:integration
        ;;
    coverage)
        echo "运行测试并生成覆盖率报告..."
        npm run test:coverage
        echo ""
        echo "[提示] 覆盖率报告已生成: coverage/lcov-report/index.html"
        ;;
    watch)
        echo "启动监视模式..."
        npm run test:watch
        ;;
    *)
        echo "[错误] 未知的测试类型: $TEST_TYPE"
        echo ""
        echo "可用选项:"
        echo "  all         - 运行所有测试"
        echo "  unit        - 仅运行单元测试"
        echo "  integration - 仅运行集成测试"
        echo "  coverage    - 生成覆盖率报告"
        echo "  watch       - 监视模式"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "  测试完成"
echo "========================================"
