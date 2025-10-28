@echo off
echo =====================================
echo 测试池子订阅功能
echo =====================================
echo.

echo 正在启动 Rust 池子缓存...
echo 请观察输出以确认订阅状态
echo.
echo 预期输出:
echo   1. WebSocket 连接成功
echo   2. 32个池子订阅请求
echo   3. 订阅确认消息
echo   4. 账户更新通知
echo.
echo =====================================
echo.

cargo run --release

pause










