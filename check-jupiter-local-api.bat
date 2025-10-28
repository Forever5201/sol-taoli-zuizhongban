@echo off
REM 检查 Jupiter 本地 API 状态

echo ========================================
echo  Jupiter Local API 状态检查
echo ========================================
echo.

echo [1/3] 检查进程状态...
wsl bash -c "ps aux | grep jupiter-swap-api | grep -v grep"
if %errorlevel% equ 0 (
    echo [OK] 进程正在运行
) else (
    echo [ERROR] 进程未运行
    goto :end
)

echo.
echo [2/3] 检查端口监听...
wsl bash -c "netstat -tuln | grep 8080"
if %errorlevel% equ 0 (
    echo [OK] 端口 8080 正在监听
) else (
    echo [ERROR] 端口 8080 未监听
    goto :end
)

echo.
echo [3/3] 测试 API 健康状态...
curl -s http://localhost:8080/health
if %errorlevel% equ 0 (
    echo.
    echo [OK] API 健康检查通过
) else (
    echo [ERROR] API 健康检查失败
)

:end
echo.
echo ========================================
echo  检查完成
echo ========================================
echo.
echo 查看日志:
echo wsl cat /mnt/e/6666666666666666666666666666/dex-cex/dex-sol/jupiter-api.log
echo.
pause


