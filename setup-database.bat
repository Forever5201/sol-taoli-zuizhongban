@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   数据库配置和测试工具
echo ========================================
echo.

REM 检查.env文件
if exist ".env" (
    echo [√] .env 文件已存在
) else (
    echo [!] 创建 .env 文件...
    echo DATABASE_URL="postgresql://arbitrage_user:arbitrage_password@localhost:5432/arbitrage_db" > .env
    echo [√] .env 文件已创建
)

if exist "packages\core\.env" (
    echo [√] packages\core\.env 文件已存在
) else (
    echo [!] 创建 packages\core\.env 文件...
    echo DATABASE_URL="postgresql://arbitrage_user:arbitrage_password@localhost:5432/arbitrage_db" > packages\core\.env
    echo [√] packages\core\.env 文件已创建
)

echo.
echo [!] 检查 PostgreSQL 服务...
sc query postgresql-x64-15 >nul 2>&1
if %errorlevel% equ 0 (
    echo [√] PostgreSQL 服务已安装
    sc query postgresql-x64-15 | find "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo [√] PostgreSQL 服务正在运行
    ) else (
        echo [!] PostgreSQL 服务未运行，尝试启动...
        net start postgresql-x64-15
    )
) else (
    echo.
    echo ========================================
    echo   PostgreSQL 未安装
    echo ========================================
    echo.
    echo 请安装 PostgreSQL:
    echo 1. 访问: https://www.postgresql.org/download/windows/
    echo 2. 下载并安装 PostgreSQL 15 或更高版本
    echo 3. 记住安装时设置的密码（用于 postgres 用户）
    echo.
    echo 或使用 Chocolatey 安装:
    echo   choco install postgresql
    echo.
    echo 安装完成后，请再次运行此脚本
    pause
    exit /b 1
)

echo.
echo [!] 生成 Prisma 客户端...
cd packages\core
call pnpm db:generate
if %errorlevel% neq 0 (
    echo [X] Prisma 客户端生成失败
    cd ..\..
    pause
    exit /b 1
)
echo [√] Prisma 客户端生成成功

echo.
echo [!] 运行数据库迁移...
call pnpm db:migrate
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   数据库迁移失败
    echo ========================================
    echo.
    echo 可能的原因:
    echo 1. PostgreSQL 服务未运行
    echo 2. 数据库未创建
    echo 3. 用户权限不足
    echo.
    echo 请手动创建数据库:
    echo   psql -U postgres
    echo   CREATE USER arbitrage_user WITH PASSWORD 'arbitrage_password';
    echo   CREATE DATABASE arbitrage_db;
    echo   GRANT ALL PRIVILEGES ON DATABASE arbitrage_db TO arbitrage_user;
    echo   \q
    echo.
    cd ..\..
    pause
    exit /b 1
)
echo [√] 数据库迁移成功

cd ..\..

echo.
echo ========================================
echo   🎉 数据库配置完成！
echo ========================================
echo.
echo 配置摘要:
echo - 数据库: arbitrage_db
echo - 用户: arbitrage_user
echo - 密码: arbitrage_password
echo - 端口: 5432
echo.
echo 现在可以启动机器人，所有套利机会将自动记录到数据库！
echo.
echo 启动命令:
echo   pnpm start --config ./configs/flashloan-serverchan.toml
echo.
echo 查看数据库:
echo   cd packages\core
echo   pnpm db:studio
echo.
pause


