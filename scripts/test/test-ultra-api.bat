@echo off
echo.
echo ========================================
echo   Jupiter Ultra API 测试
echo ========================================
echo.
echo 此脚本将测试 Ultra API 升级是否成功
echo.
echo 测试项目：
echo   1. 基础连接测试
echo   2. 环形套利查询
echo   3. 速率限制测试
echo   4. Lite vs Ultra 对比
echo.
echo 开始测试...
echo.

node test-ultra-api.js

echo.
pause




