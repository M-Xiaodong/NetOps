@echo off
setlocal
echo Stopping NetOps Backend processes and closing windows...

:: 1. 优先通过窗口标题精准关闭 CMD 窗口 (这是最干净的方式)
taskkill /F /FI "WINDOWTITLE eq NetOps Backend Service*" /T 2>nul

:: 2. 通过端口号 (8000) 查找并杀掉残留的 Uvicorn/Python 进程
:: 这样只杀掉占用 8000 端口的进程，不会影响您其他的 Python 脚本
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    if NOT "%%a"=="0" (
        echo Found process ID %%a on port 8000, terminating...
        taskkill /F /PID %%a /T 2>nul
    )
)

echo.
echo NetOps Backend service has been safely stopped.
timeout /t 2 >nul
exit
