@echo off
echo ====================================
echo 编译并运行优先费实际测试
echo ====================================

cd packages\core

echo.
echo [1/2] 编译 TypeScript 文件...
call npx tsc test-priority-fee-live.ts --outDir . --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --moduleResolution node --resolveJsonModule

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 编译失败！
    cd ..\..
    pause
    exit /b 1
)

echo.
echo [2/2] 运行测试...
echo.
node test-priority-fee-live.js

cd ..\..

echo.
echo ====================================
echo 测试完成！
echo ====================================
pause


