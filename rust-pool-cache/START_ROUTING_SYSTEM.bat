@echo off
cls
echo ========================================
echo     智能路由系统 - 启动程序
echo ========================================
echo.
echo 系统功能:
echo   ✅ 实时监控 32 个池子
echo   ✅ 覆盖 91.47%% 套利机会
echo   ✅ 自动发现最优路径
echo   ✅ 支持直接套利 + 三角套利
echo.
echo 当前配置:
echo   • 最小 ROI: 0.3%%
echo   • 扫描频率: 每 5 秒
echo   • 测试金额: 1000 USDC
echo   • 最大深度: 4 跳
echo.
echo ========================================
echo.
echo 按任意键启动系统...
pause >nul

echo.
echo 正在启动...
echo.

cargo run --release

echo.
echo 系统已停止
pause








