@echo off
chcp 65001 >nul
title NetOps Frontend
cd /d "%~dp0frontend"

echo ===== 启动前端服务 =====
echo 正在执行 npm run dev...
echo.

npm run dev -- --host

echo.
echo 前端服务已停止.
pause
