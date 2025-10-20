@echo off
echo.
echo ========================================
echo Cleaning All Build Artifacts
echo ========================================
echo.

echo [1/3] Removing dist folders...
for /d /r . %%d in (dist) do @if exist "%%d" (
    echo Removing: %%d
    rd /s /q "%%d"
)

echo.
echo [2/3] Removing TypeScript cache...
del /s /q tsconfig.tsbuildinfo 2>nul

echo.
echo [3/3] Removing node_modules/.cache...
for /d /r . %%d in (node_modules\.cache) do @if exist "%%d" (
    rd /s /q "%%d"
)

echo.
echo ========================================
echo Clean Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run: pnpm install
echo 2. Run: scripts\rebuild-all.bat
echo.
pause
