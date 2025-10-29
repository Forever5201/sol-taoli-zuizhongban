@echo off
REM ============================================================================
REM Meteora DLMM 结构修复 - 完整自动化流程
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     Meteora DLMM 结构修复工具 v1.0                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo [第1步] 检查依赖...
where tsx >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未找到 tsx，正在安装...
    call pnpm install
)

echo.
echo [第2步] 分析链上账户数据...
echo ────────────────────────────────────────────────────
call tsx tools/analyze-meteora-account.ts
if %errorlevel% neq 0 (
    echo ❌ 账户分析失败！
    goto :error
)

echo.
echo [第3步] 获取Meteora DLMM IDL...
echo ────────────────────────────────────────────────────
call tsx tools/fetch-meteora-idl.ts
if %errorlevel% neq 0 (
    echo ⚠️  IDL获取失败，将使用手动分析结果
)

echo.
echo [第4步] 运行结构体大小验证测试...
echo ────────────────────────────────────────────────────
cargo test --test struct_size_validation -- --nocapture
if %errorlevel% neq 0 (
    echo ⚠️  测试发现大小不匹配，请查看输出
)

echo.
echo [第5步] 检查分析结果...
echo ────────────────────────────────────────────────────
if exist "analysis-results\JUP-USDC-analysis.json" (
    echo ✅ 分析结果已生成:
    echo    - analysis-results/JUP-USDC-account-data.bin
    echo    - analysis-results/JUP-USDC-analysis.json
) else (
    echo ⚠️  未找到分析结果文件
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     修复流程完成！                                             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📋 下一步:
echo   1. 查看 analysis-results/ 目录中的分析结果
echo   2. 对比 meteora_dlmm.rs 中的结构定义
echo   3. 如果生成了 meteora_dlmm_generated.rs，请检查并替换
echo   4. 运行: cargo build --release
echo   5. 测试: target/release/solana-pool-cache config.toml
echo.
pause
goto :end

:error
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     修复失败！请查看上方错误信息                               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
pause
exit /b 1

:end




