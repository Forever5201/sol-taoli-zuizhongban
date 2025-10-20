@echo off
echo ===============================================
echo    Jito Leader Scheduler Test
echo ===============================================
echo.

REM 加载环境变量
if exist .env (
    echo Loading environment variables...
    for /F "tokens=*" %%A in (.env) do (
        set "%%A"
    )
)

echo Running Jito Leader test...
echo.

npx tsx scripts/test-jito-leader.ts

echo.
echo Test complete.
pause

