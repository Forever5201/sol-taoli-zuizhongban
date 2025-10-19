@echo off
REM Solana套利机器人 - 测试运行脚本 (Windows)
REM 使用方法: run-tests.bat [选项]
REM 选项:
REM   all        - 运行所有测试（默认）
REM   unit       - 仅运行单元测试
REM   integration- 仅运行集成测试
REM   coverage   - 运行测试并生成覆盖率报告
REM   watch      - 监视模式

echo ========================================
echo   Solana套利机器人 - 测试套件
echo ========================================
echo.

REM 检查Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到Node.js，请先安装Node.js 20+
    pause
    exit /b 1
)

REM 检查依赖
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

REM 根据参数运行测试
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=all

echo [信息] 运行测试类型: %TEST_TYPE%
echo.

if "%TEST_TYPE%"=="all" (
    echo 运行所有测试...
    call npm test
) else if "%TEST_TYPE%"=="unit" (
    echo 运行单元测试...
    call npm run test:unit
) else if "%TEST_TYPE%"=="integration" (
    echo 运行集成测试...
    call npm run test:integration
) else if "%TEST_TYPE%"=="coverage" (
    echo 运行测试并生成覆盖率报告...
    call npm run test:coverage
    echo.
    echo [提示] 覆盖率报告已生成: coverage\lcov-report\index.html
) else if "%TEST_TYPE%"=="watch" (
    echo 启动监视模式...
    call npm run test:watch
) else (
    echo [错误] 未知的测试类型: %TEST_TYPE%
    echo.
    echo 可用选项:
    echo   all         - 运行所有测试
    echo   unit        - 仅运行单元测试
    echo   integration - 仅运行集成测试
    echo   coverage    - 生成覆盖率报告
    echo   watch       - 监视模式
    pause
    exit /b 1
)

echo.
echo ========================================
echo   测试完成
echo ========================================

pause
