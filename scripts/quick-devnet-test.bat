@echo off
REM ========================================
REM 快速 Devnet 测试
REM ========================================

echo.
echo ========================================
echo 快速 Devnet 功能测试
echo ========================================
echo.

REM 复制 devnet 配置
if exist ".env.devnet" (
    copy /Y .env.devnet .env
    echo [✓] 已加载 Devnet 配置
) else (
    echo [!] 警告: 未找到 .env.devnet，使用默认配置
)

echo.
echo [测试 1/3] 运行经济模型演示...
echo ========================================
call pnpm demo
if errorlevel 1 (
    echo [✗] 经济模型测试失败
) else (
    echo [✓] 经济模型测试通过
)

echo.
echo.
echo [测试 2/3] Jupiter Swap 测试...
echo ========================================
call pnpm test-jupiter
if errorlevel 1 (
    echo [✗] Jupiter Swap 测试失败
) else (
    echo [✓] Jupiter Swap 测试通过
)

echo.
echo.
echo [测试 3/3] 成本模拟器...
echo ========================================
call pnpm cost-sim
if errorlevel 1 (
    echo [✗] 成本模拟失败
) else (
    echo [✓] 成本模拟通过
)

echo.
echo.
echo ========================================
echo 测试完成！
echo ========================================
echo.
echo 如果所有测试通过，您可以运行:
echo   scripts\deploy-devnet.bat
echo.
echo 启动完整的 Devnet 套利机器人
echo.

pause
