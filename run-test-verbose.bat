@echo off
pnpm test --no-coverage > test-output.txt 2>&1
type test-output.txt | findstr /C:"FAIL" /C:"PASS" /C:"Test Suites"
echo.
echo 完整输出已保存到 test-output.txt
