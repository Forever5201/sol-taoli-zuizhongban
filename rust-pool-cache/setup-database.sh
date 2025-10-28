#!/bin/bash

# 数据库设置脚本
# 用于初始化PostgreSQL数据库并创建必要的表

echo "======================================"
echo "  套利机会数据库设置"
echo "======================================"
echo ""

# 数据库配置
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-Yuan971035088}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "数据库配置:"
echo "  主机: ${DB_HOST}:${DB_PORT}"
echo "  用户: ${DB_USER}"
echo "  数据库: ${DB_NAME}"
echo ""

# 测试连接
echo "测试数据库连接..."
if psql "${DATABASE_URL}" -c '\q' 2>/dev/null; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败"
    echo ""
    echo "请确保:"
    echo "  1. PostgreSQL已安装并运行"
    echo "  2. 数据库凭据正确"
    echo "  3. 数据库已创建"
    echo ""
    echo "创建数据库命令:"
    echo "  psql -U postgres -c \"CREATE DATABASE ${DB_NAME};\""
    exit 1
fi

echo ""
echo "执行迁移脚本..."
psql "${DATABASE_URL}" -f migrations/001_create_arbitrage_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ 迁移完成"
else
    echo "❌ 迁移失败"
    exit 1
fi

echo ""
echo "======================================"
echo "  数据库设置完成！"
echo "======================================"
echo ""
echo "现在可以启动路由器了:"
echo "  cargo run --release"
echo ""
echo "查询记录的机会:"
echo "  cargo run --example query_opportunities -- --recent 10"
echo "  cargo run --example query_opportunities -- --stats"
echo ""



# 数据库设置脚本
# 用于初始化PostgreSQL数据库并创建必要的表

echo "======================================"
echo "  套利机会数据库设置"
echo "======================================"
echo ""

# 数据库配置
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-Yuan971035088}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "数据库配置:"
echo "  主机: ${DB_HOST}:${DB_PORT}"
echo "  用户: ${DB_USER}"
echo "  数据库: ${DB_NAME}"
echo ""

# 测试连接
echo "测试数据库连接..."
if psql "${DATABASE_URL}" -c '\q' 2>/dev/null; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败"
    echo ""
    echo "请确保:"
    echo "  1. PostgreSQL已安装并运行"
    echo "  2. 数据库凭据正确"
    echo "  3. 数据库已创建"
    echo ""
    echo "创建数据库命令:"
    echo "  psql -U postgres -c \"CREATE DATABASE ${DB_NAME};\""
    exit 1
fi

echo ""
echo "执行迁移脚本..."
psql "${DATABASE_URL}" -f migrations/001_create_arbitrage_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ 迁移完成"
else
    echo "❌ 迁移失败"
    exit 1
fi

echo ""
echo "======================================"
echo "  数据库设置完成！"
echo "======================================"
echo ""
echo "现在可以启动路由器了:"
echo "  cargo run --release"
echo ""
echo "查询记录的机会:"
echo "  cargo run --example query_opportunities -- --recent 10"
echo "  cargo run --example query_opportunities -- --stats"
echo ""















