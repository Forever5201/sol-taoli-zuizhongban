@echo off
REM Windows batch script to run the Rust pool cache prototype

echo.
echo ====================================================
echo   Solana Pool Cache - Prototype Runner
echo ====================================================
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Rust/Cargo is not installed or not in PATH
    echo.
    echo Please install Rust from: https://rustup.rs/
    echo.
    pause
    exit /b 1
)

echo [1/2] Building project...
echo.
cargo build --release
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed. Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting pool cache...
echo.
echo Press Ctrl+C to stop the program.
echo.

cargo run --release

pause



