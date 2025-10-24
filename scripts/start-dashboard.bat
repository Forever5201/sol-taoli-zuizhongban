@echo off
echo ====================================
echo   启动数据库仪表板 API 服务器
echo ====================================
echo.
echo 正在启动服务器...
echo.

cd /d "%~dp0\.."
npx tsx "%~dp0..\tools\dashboard-api.ts"

pause

