@echo off
chcp 65001 >nul
cls
echo ========================================
echo   Rust Pool Cache - Professional Logging
echo ========================================
echo.
echo Features:
echo   - Smart log filtering (only ^>1%% price change)
echo   - Auto error tracking and deduplication
echo   - Dual output: Terminal + JSON file
echo   - HTTP API for error statistics
echo.
echo Log Output:
echo   - Terminal: Colored and concise
echo   - File: logs/rust-pool-cache.log.YYYY-MM-DD
echo.
echo API Endpoints:
echo   - GET /health
echo   - GET /prices
echo   - GET /errors (NEW)
echo.
echo ========================================
echo.
echo Press any key to start...
pause >nul

echo.
echo Starting with INFO level logging...
echo.

REM Set log level to INFO
set RUST_LOG=info
cargo run --release

echo.
echo System stopped.
echo.
echo View logs: dir logs\
echo Error stats: curl http://localhost:3001/errors
echo.
pause

