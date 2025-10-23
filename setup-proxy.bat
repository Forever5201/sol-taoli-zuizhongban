@echo off
chcp 65001 >nul
echo ================================================================
echo 代理配置向导 - 解决 Jupiter API 连接问题
echo ================================================================
echo.
echo 当前问题：Jupiter API 连接超时 (100%% 失败率)
echo 根本原因：网络无法访问 Jupiter API (quote-api.jup.ag)
echo.
echo ================================================================
echo 请选择你的情况：
echo ================================================================
echo.
echo [1] 我在国内，需要使用代理 (Clash/V2Ray等)
echo [2] 我在海外，网络直连没问题
echo [3] 测试当前 Jupiter API 连接
echo [4] 退出
echo.
set /p choice="请输入选项 (1-4): "

if "%choice%"=="1" goto SETUP_PROXY
if "%choice%"=="2" goto NO_PROXY
if "%choice%"=="3" goto TEST_API
if "%choice%"=="4" goto END

:SETUP_PROXY
echo.
echo ================================================================
echo 配置代理
echo ================================================================
echo.
echo 常用代理端口：
echo   - Clash:       7890 (HTTP) / 7891 (SOCKS5)
echo   - V2Ray:       10808 (HTTP) / 10809 (SOCKS5)
echo   - Shadowsocks: 1080 (SOCKS5)
echo.
set /p proxy_port="请输入你的代理HTTP端口 (默认: 7890): "
if "%proxy_port%"=="" set proxy_port=7890

echo.
echo 正在创建 .env 文件...
(
echo # =================================================================
echo # 代理配置 - Jupiter API 连接
echo # =================================================================
echo HTTP_PROXY=http://127.0.0.1:%proxy_port%
echo HTTPS_PROXY=http://127.0.0.1:%proxy_port%
echo WS_PROXY=http://127.0.0.1:%proxy_port%
echo NO_PROXY=localhost,127.0.0.1
echo.
echo # =================================================================
echo # 其他配置 ^(可选^)
echo # =================================================================
echo # DATABASE_URL=postgresql://arbitrage_user:arbitrage_password@localhost:5432/arbitrage_db
) > .env

echo ✅ .env 文件已创建！
echo.
echo 配置内容：
echo   HTTP_PROXY=http://127.0.0.1:%proxy_port%
echo   HTTPS_PROXY=http://127.0.0.1:%proxy_port%
echo.
echo ================================================================
echo 下一步：
echo ================================================================
echo 1. 确保你的代理工具 (Clash/V2Ray) 正在运行
echo 2. 运行测试：node test-jupiter-connectivity.js
echo 3. 如果测试通过，重启闪电贷机器人
echo.
pause
goto END

:NO_PROXY
echo.
echo ================================================================
echo 不使用代理配置
echo ================================================================
echo.
echo 你在海外或网络环境良好，将创建空的 .env 文件
echo (系统会直接连接 Jupiter API)
echo.
(
echo # =================================================================
echo # 网络配置 - 直接连接 ^(无代理^)
echo # =================================================================
echo # HTTP_PROXY=
echo # HTTPS_PROXY=
echo.
echo # 如需启用代理，取消上面两行的注释并填写代理地址
echo # 例如：HTTP_PROXY=http://127.0.0.1:7890
) > .env

echo ✅ .env 文件已创建 (无代理配置)
echo.
echo ================================================================
echo 下一步：
echo ================================================================
echo 1. 运行测试：node test-jupiter-connectivity.js
echo 2. 如果测试失败，说明你可能需要配置代理
echo 3. 如果测试通过，重启闪电贷机器人
echo.
pause
goto END

:TEST_API
echo.
echo ================================================================
echo 测试 Jupiter API 连接
echo ================================================================
echo.
echo 正在测试连接 (连续10次)...
echo.
node test-jupiter-connectivity.js
echo.
echo ================================================================
echo 测试完成
echo ================================================================
echo.
echo 如果成功率 ^< 70%%，建议配置代理
echo 如果成功率 = 0%%，必须配置代理
echo.
pause
goto END

:END
echo.
echo ================================================================
echo 相关文档：
echo ================================================================
echo - 代理配置详细说明：PROXY_SETUP.md
echo - 快速配置指南：代理配置快速指南.md
echo - 闪电贷配置：configs/flashloan-serverchan.toml
echo.
echo ================================================================
echo 技术支持
echo ================================================================
echo 如果仍有问题：
echo 1. 检查代理工具是否运行：curl -x http://127.0.0.1:7890 https://www.google.com
echo 2. 查看机器人日志中的 [ProxyConfig] 输出
echo 3. 运行诊断脚本：node test-jupiter-connectivity.js
echo ================================================================










