@echo off
echo.
echo ========================================
echo 从助记词创建钱包
echo ========================================
echo.
echo 请准备好您的 12 个单词的助记词
echo.
pause
echo.

REM 创建钱包
solana-keygen recover -o keypairs/flashloan-wallet.json

echo.
echo ========================================
echo 钱包创建完成！
echo ========================================
echo.
echo 钱包文件位置: keypairs\flashloan-wallet.json
echo.
echo 查看钱包地址:
solana-keygen pubkey keypairs\flashloan-wallet.json
echo.

pause
