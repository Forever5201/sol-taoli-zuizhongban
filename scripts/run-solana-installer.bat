@echo off
echo.
echo Running Solana CLI Installer...
echo.

REM 查找下载文件夹中的安装器
set INSTALLER=%USERPROFILE%\Downloads\solana-install-init-x86_64-pc-windows-msvc.exe

if exist "%INSTALLER%" (
    echo Found installer: %INSTALLER%
    echo.
    echo Installing Solana CLI v1.18.0...
    "%INSTALLER%" v1.18.0
    echo.
    echo Installation complete!
    echo.
    echo [IMPORTANT] Next steps:
    echo 1. Close this window
    echo 2. Open a new PowerShell
    echo 3. Run: solana --version
    echo.
) else (
    echo ERROR: Installer not found in Downloads folder
    echo Please move the installer to: %USERPROFILE%\Downloads\
    echo Or run manually:
    echo   cd Downloads
    echo   .\solana-install-init-x86_64-pc-windows-msvc.exe v1.18.0
    echo.
)

pause
