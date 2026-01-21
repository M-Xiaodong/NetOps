@echo off
chcp 65001 >nul
title NetOps 启动器
cd /d "%~dp0"

:MENU
cls
echo ==========================================
echo           NetOps 一键启动管理
echo ==========================================
echo.
echo    [1] 启动所有服务 (后端 + 前端)
echo    [2] 单独启动后端 (Backend Only)
echo    [3] 单独启动前端 (Frontend Only)
echo    [4] 退出
echo.
set /p choice=请输入选项 (1-4): 

if "%choice%"=="1" goto START_ALL
if "%choice%"=="2" goto START_BACKEND
if "%choice%"=="3" goto START_FRONTEND
if "%choice%"=="4" exit
goto MENU

:START_BACKEND
start "NetOps Backend" start_backend.bat
goto MENU

:START_FRONTEND
start "NetOps Frontend" start_frontend.bat
goto MENU

:START_ALL
echo.
echo [1/2] 正在启动后端...
start "NetOps Backend" start_backend.bat
timeout /t 2 /nobreak >nul

echo [2/2] 正在启动前端...
start "NetOps Frontend" start_frontend.bat

echo.
echo 服务启动指令已发送。
echo 请在弹出的新窗口中查看运行状态。
echo.
pause
goto MENU
