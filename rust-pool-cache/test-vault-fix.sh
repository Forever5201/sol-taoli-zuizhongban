#!/bin/bash
# 测试Vault池子修复效果

echo "🧪 测试Vault池子is_active()修复"
echo "================================"
echo ""

cd rust-pool-cache

echo "📦 编译程序..."
cargo build --release 2>&1 | grep -E "(Compiling|Finished)"

echo ""
echo "🚀 启动程序（运行60秒）..."
timeout 60 cargo run --release 2>&1 | tee test-vault-fix.log &
PID=$!

echo "   进程ID: $PID"
echo "   等待60秒收集数据..."
sleep 60

echo ""
echo "📊 分析日志..."
echo "================================"

# 统计不同池子的价格更新
echo ""
echo "1. 统计收到价格更新的池子："
grep "Pool price updated" test-vault-fix.log | grep -oP 'pool="[^"]*"' | sort -u | wc -l
echo "   个不同的池子"

echo ""
echo "2. SolFi V2池子（应该能看到了！）："
grep -i "solfi" test-vault-fix.log | grep "Pool price updated" | head -n 3

echo ""
echo "3. GoonFi池子（应该能看到了！）："
grep -i "goonfi" test-vault-fix.log | grep "Pool price updated" | head -n 3

echo ""
echo "4. Vault订阅消息："
grep "Vault" test-vault-fix.log | head -n 10

echo ""
echo "5. 所有池子列表："
grep "Pool price updated" test-vault-fix.log | grep -oP 'pool="[^"]*"' | sort -u

echo ""
echo "================================"
echo "✅ 测试完成"



