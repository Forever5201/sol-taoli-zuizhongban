@echo off
echo ========================================
echo 查询频率优化 - 测试结果检查
echo ========================================
echo.
echo 优化配置:
echo   Worker: 3 -^> 1
echo   间隔: 80ms -^> 200ms  
echo   桥接代币: 4 -^> 2 (USDC, USDT)
echo   QPS: 37.5 -^> 5.0
echo.
echo ========================================
echo 正在查找最新的统计输出...
echo ========================================
echo.

REM 查找Success Rate相关日志
powershell -Command "Get-Content -Path 'logs\flashloan-dryrun.log' -Tail 200 | Select-String -Pattern 'Success Rate|Opportunities found|Bridge Token Performance|Worker 0.*Starting scan round' | Select-Object -Last 20"

echo.
echo ========================================
echo 检查完成
echo ========================================
echo.
echo 提示: 如果看到 "Success Rate" 统计,说明已经运行到第10轮
echo 预期成功率: 50-80%%
echo.
pause

