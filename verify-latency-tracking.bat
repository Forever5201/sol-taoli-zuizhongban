@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   验证延迟跟踪功能
echo ========================================
echo.

echo 🔧 编译验证脚本...
pnpm tsx verify-latency-tracking.ts

echo.
echo ========================================
echo   验证完成
echo ========================================
echo.
pause

