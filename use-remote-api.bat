@echo off
REM 方案 4：继续使用远程 API（牺牲性能）
REM 
REM 适用场景：
REM - 无法启用 TUN 模式
REM - 无法安装 proxychains
REM - 不想运行 RPC 代理

echo ========================================
echo  使用远程 Jupiter API
echo ========================================
echo.
echo ⚠️  性能警告：
echo    - 延迟: ~150ms (vs 本地 <5ms)
echo    - 机会捕获率降低 60-70%%
echo.
echo 建议尽快切换到本地 API 方案
echo.

REM 设置环境变量禁用本地 API
set USE_LOCAL_JUPITER_API=false

REM 启动 Bot
echo 启动 Bot (使用远程 API)...
pnpm start:flashloan

pause


