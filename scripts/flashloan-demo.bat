@echo off
REM ========================================
REM 闪电贷功能演示
REM ========================================

echo.
echo ========================================
echo    闪电贷套利功能演示
echo ========================================
echo.
echo 展示无本金套利的强大威力！
echo.

echo [1/3] 运行闪电贷示例...
echo.
call pnpm tsx packages/core/src/flashloan/example.ts
echo.

echo.
echo [2/3] 成本模拟器（含闪电贷）...
echo.
call pnpm cost-sim
echo.

echo.
echo [3/3] 经济模型演示...
echo.
call pnpm demo
echo.

echo.
echo ========================================
echo 演示完成！
echo ========================================
echo.
echo 关键要点：
echo   1. 只需 0.1-0.5 SOL 作为 Gas 储备
echo   2. 可以借 50-200 SOL 进行套利
echo   3. 费用仅 0.09%%，极其划算
echo   4. ROI 可达 10,000%%+
echo.
echo 下一步：
echo   1. 准备 0.1-0.5 SOL
echo   2. 配置 RPC 和钱包
echo   3. 启动机器人开始赚钱
echo.

pause
