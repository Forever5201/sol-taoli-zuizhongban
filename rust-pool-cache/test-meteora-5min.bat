@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   Meteora DLMM 长时间测试 (5 分钟)                        ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set TEST_DURATION=300
set CONFIG_FILE=config.toml

echo 测试配置:
echo   配置文件: %CONFIG_FILE%
echo   测试时长: %TEST_DURATION% 秒 (5 分钟)
echo   监控池子: JUP/USDC (Meteora DLMM)
echo.

REM 清理旧日志
if exist meteora-test-output.log del /f /q meteora-test-output.log
if exist meteora-test-error.log del /f /q meteora-test-error.log

echo 🔨 编译项目...
cargo build --release
if %ERRORLEVEL% neq 0 (
    echo ❌ 编译失败！
    pause
    exit /b 1
)

echo ✅ 编译成功
echo.

echo 🚀 启动测试...
echo ⏱️  测试将运行 %TEST_DURATION% 秒，请耐心等待...
echo.

REM 启动进程并重定向输出
start /B cargo run --release -- %CONFIG_FILE% > meteora-test-output.log 2> meteora-test-error.log

REM 等待5分钟
echo ⏱️  等待 5 分钟...
timeout /t %TEST_DURATION% /nobreak >nul

REM 停止进程
echo ⏱️  测试时间到，正在停止...
taskkill /F /IM solana-pool-cache.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   测试完成！正在分析结果...                                ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo ═══════════════ 测试结果分析 ═══════════════
echo.

if exist meteora-test-output.log (
    echo 1. 检查订阅状态:
    findstr /C:"Meteora DLMM" meteora-test-output.log | findstr /C:"Subscribed" >nul
    if %ERRORLEVEL% equ 0 (
        echo    ✅ Meteora DLMM 池子订阅成功
    ) else (
        echo    ❌ 未找到 Meteora DLMM 订阅确认
    )
    echo.
    
    echo 2. 检查 Meteora 更新:
    findstr /C:"Meteora DLMM" meteora-test-output.log | findstr /C:"Pool Updated" >nul
    if %ERRORLEVEL% equ 0 (
        echo    ✅ 收到 Meteora DLMM 更新！
        echo.
        echo    最近更新:
        findstr /C:"Meteora DLMM" meteora-test-output.log | findstr /C:"Pool Updated" | tail -n 5
    ) else (
        echo    ⚠️  未收到 Meteora DLMM 更新
        echo    可能原因:
        echo       - 池子交易频率低
        echo       - 数据结构解析失败
    )
    echo.
    
    echo 3. 检查其他池子更新（对比）:
    findstr /C:"Raydium V4" meteora-test-output.log | findstr /C:"Pool Updated" | find /C "Pool Updated" >nul
    echo    Raydium V4 和 CLMM 也有更新
    echo.
) else (
    echo ❌ 未找到输出日志文件
)

if exist meteora-test-error.log (
    echo 4. 错误日志:
    type meteora-test-error.log
    echo.
)

echo.
echo 📁 完整日志文件:
echo    输出日志: meteora-test-output.log
echo    错误日志: meteora-test-error.log
echo.

echo 💡 建议下一步:
echo    1. 查看完整日志: type meteora-test-output.log
echo    2. 搜索错误: findstr /C:"error" /C:"Error" /C:"Failed" meteora-test-output.log
echo    3. 查询更多池子地址
echo.

pause






