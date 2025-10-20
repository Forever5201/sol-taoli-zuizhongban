@echo off
echo.
echo ========================================
echo 安装 Solana CLI
echo ========================================
echo.

echo [1/3] 下载 Solana CLI 安装器...
powershell -Command "Invoke-WebRequest -Uri 'https://release.solana.com/v1.18.0/solana-install-init-x86_64-pc-windows-msvc.exe' -OutFile 'C:\solana-install-tmp.exe'"

if errorlevel 1 (
    echo.
    echo [错误] 下载失败
    echo 请检查网络连接或手动下载：
    echo https://release.solana.com/v1.18.0/solana-install-init-x86_64-pc-windows-msvc.exe
    echo.
    pause
    exit /b 1
)

echo [✓] 下载完成
echo.

echo [2/3] 运行安装器...
echo 安装位置: C:\Users\%USERNAME%\.local\share\solana\install\active_release
echo.
C:\solana-install-tmp.exe v1.18.0

if errorlevel 1 (
    echo.
    echo [错误] 安装失败
    echo.
    pause
    exit /b 1
)

echo.
echo [✓] 安装完成
echo.

echo [3/3] 配置环境变量...
echo.
echo Solana CLI 已安装到:
echo %USERPROFILE%\.local\share\solana\install\active_release\bin
echo.

echo ========================================
echo 安装成功！
echo ========================================
echo.
echo [重要] 下一步：
echo.
echo 1. 关闭此 PowerShell 窗口
echo 2. 重新打开 PowerShell
echo 3. 运行命令验证: solana --version
echo 4. 然后可以导入助记词了
echo.

pause
