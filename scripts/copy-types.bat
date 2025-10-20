@echo off
echo Copying type declaration files...

REM 创建目标目录
mkdir packages\core\dist\economics 2>nul
mkdir packages\core\dist\solana 2>nul
mkdir packages\core\dist\logger 2>nul
mkdir packages\core\dist\config 2>nul

REM 复制类型声明文件
xcopy /Y packages\core\src\economics\*.d.ts packages\core\dist\economics\
xcopy /Y packages\core\src\solana\*.d.ts packages\core\dist\solana\
xcopy /Y packages\core\src\logger\*.d.ts packages\core\dist\logger\
xcopy /Y packages\core\src\config\*.d.ts packages\core\dist\config\

echo Done!
pause
