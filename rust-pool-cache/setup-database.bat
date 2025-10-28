@echo off
echo ======================================
echo   套利机会数据库设置
echo ======================================
echo.

REM 数据库配置
set DB_USER=postgres
set DB_PASSWORD=Yuan971035088
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=postgres

set DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%

echo 数据库配置:
echo   主机: %DB_HOST%:%DB_PORT%
echo   用户: %DB_USER%
echo   数据库: %DB_NAME%
echo.

echo 测试数据库连接...
psql "%DATABASE_URL%" -c "\q" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ 数据库连接成功
) else (
    echo × 数据库连接失败
    echo.
    echo 请确保:
    echo   1. PostgreSQL已安装并运行
    echo   2. 数据库凭据正确
    echo   3. PostgreSQL bin目录在PATH中
    echo.
    echo 如需创建数据库:
    echo   psql -U postgres -c "CREATE DATABASE %DB_NAME%;"
    echo.
    pause
    exit /b 1
)

echo.
echo 执行迁移脚本...
psql "%DATABASE_URL%" -f migrations\001_create_arbitrage_tables.sql

if %errorlevel% == 0 (
    echo ✓ 迁移完成
) else (
    echo × 迁移失败
    pause
    exit /b 1
)

echo.
echo ======================================
echo   数据库设置完成！
echo ======================================
echo.
echo 现在可以启动路由器了:
echo   cargo run --release
echo.
echo 查询记录的机会:
echo   cargo run --example query_opportunities -- --recent 10
echo   cargo run --example query_opportunities -- --stats
echo.
pause


echo ======================================
echo   套利机会数据库设置
echo ======================================
echo.

REM 数据库配置
set DB_USER=postgres
set DB_PASSWORD=Yuan971035088
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=postgres

set DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%

echo 数据库配置:
echo   主机: %DB_HOST%:%DB_PORT%
echo   用户: %DB_USER%
echo   数据库: %DB_NAME%
echo.

echo 测试数据库连接...
psql "%DATABASE_URL%" -c "\q" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ 数据库连接成功
) else (
    echo × 数据库连接失败
    echo.
    echo 请确保:
    echo   1. PostgreSQL已安装并运行
    echo   2. 数据库凭据正确
    echo   3. PostgreSQL bin目录在PATH中
    echo.
    echo 如需创建数据库:
    echo   psql -U postgres -c "CREATE DATABASE %DB_NAME%;"
    echo.
    pause
    exit /b 1
)

echo.
echo 执行迁移脚本...
psql "%DATABASE_URL%" -f migrations\001_create_arbitrage_tables.sql

if %errorlevel% == 0 (
    echo ✓ 迁移完成
) else (
    echo × 迁移失败
    pause
    exit /b 1
)

echo.
echo ======================================
echo   数据库设置完成！
echo ======================================
echo.
echo 现在可以启动路由器了:
echo   cargo run --release
echo.
echo 查询记录的机会:
echo   cargo run --example query_opportunities -- --recent 10
echo   cargo run --example query_opportunities -- --stats
echo.
pause















