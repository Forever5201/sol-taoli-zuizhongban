@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   清空数据库旧数据
echo ========================================
echo.
echo ⚠️  警告：此操作将删除以下表的所有数据：
echo    - opportunities（机会记录）
echo    - opportunity_validations（验证记录）
echo    - trade_routes（交易路由）
echo    - flash_loan_transactions（交易记录）
echo.
echo 📝 注意：
echo    1. 表结构不会被删除
echo    2. ID序列将重置为1
echo    3. 此操作不可逆！
echo.
set /p confirm="确认要清空数据吗？(输入 YES 继续): "
if /i not "%confirm%"=="YES" (
    echo.
    echo ❌ 操作已取消
    echo.
    pause
    exit /b
)

echo.
echo 🔄 正在清空数据...
echo.

psql -h localhost -U solana_arb_user -d solana_arb_bot -f clear-old-data.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   ✅ 清空完成
    echo ========================================
    echo.
    echo 下一步：
    echo   1. 执行数据库迁移（添加新字段）
    echo   2. 重启Bot开始记录新数据
    echo.
) else (
    echo.
    echo ========================================
    echo   ❌ 清空失败
    echo ========================================
    echo.
    echo 可能原因：
    echo   - 数据库未运行
    echo   - 连接参数错误
    echo   - 权限不足
    echo.
)

pause

