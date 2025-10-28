@echo off
echo ========================================
echo 测试储备量字段修复
echo ========================================
echo.

echo 编译 Rust 代码...
cargo build --release 2>nul
if %errorlevel% neq 0 (
    echo 编译失败，请检查错误
    pause
    exit /b 1
)
echo.

echo ========================================
echo 运行池子缓存（5 分钟测试）
echo ========================================
echo.
echo 观察点：
echo   1. AlphaQ 池子价格应该接近 1.00 (USDT/USDC)
echo   2. SolFi V2 池子价格应该合理
echo   3. GoonFi 池子价格应该合理
echo   4. 没有储备量为 0 或 3000 的异常值
echo.

timeout /t 5

cargo run --release

pause




