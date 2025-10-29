@echo off
cls
echo ========================================
echo   日志系统测试脚本
echo ========================================
echo.
echo 此脚本将:
echo   1. 编译项目
echo   2. 运行30秒（足够观察日志）
echo   3. 显示日志文件
echo   4. 显示错误统计
echo.
echo ========================================
echo.
pause

echo.
echo [1/4] 编译项目...
echo.
cargo build --release
if %ERRORLEVEL% NEQ 0 (
    echo 编译失败！
    pause
    exit /b 1
)

echo.
echo [2/4] 运行系统 30 秒...
echo.
echo 注意观察:
echo   - 日志输出是否简洁
echo   - 是否有彩色
echo   - 错误是否被追踪
echo.

timeout /t 30 /nobreak cargo run --release

echo.
echo [3/4] 检查日志文件...
echo.
dir logs\
echo.
echo 最新日志文件内容（前10行）:
for /f %%f in ('dir /b /od logs\rust-pool-cache.log.* 2^>nul') do set LATEST=%%f
if defined LATEST (
    type logs\%LATEST% | findstr /n "^" | findstr /b "1: 2: 3: 4: 5: 6: 7: 8: 9: 10:"
) else (
    echo 未找到日志文件！
)

echo.
echo [4/4] 查询错误统计 API...
echo.
curl -s http://localhost:3001/errors
echo.

echo.
echo ========================================
echo 测试完成！
echo.
echo 下一步:
echo   - 查看 logs/ 目录中的日志文件
echo   - 访问 http://localhost:3001/errors 查看错误统计
echo   - 阅读 LOGGING_GUIDE.md 了解更多用法
echo ========================================
pause






