@echo off
REM 停止 Jupiter 本地 API 服务器

echo ========================================
echo  停止 Jupiter Local API
echo ========================================
echo.

REM 在 WSL 中停止服务
wsl bash -c "pkill -f jupiter-swap-api"

if %errorlevel% equ 0 (
    echo [SUCCESS] Jupiter API 已停止
) else (
    echo [INFO] 没有运行中的 Jupiter API 进程
)

echo.
pause


