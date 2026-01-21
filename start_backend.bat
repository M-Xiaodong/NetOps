@echo off
title NetOps Backend Service
echo Starting NetOps Backend (Auto-Reload Enabled)...
echo [INFO] Service is running. Press Ctrl+C in this window to stop.
echo [INFO] If window hangs on close, use stop_backend.bat
echo.

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --no-use-colors

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend service exited with error (or Ctrl+C).
    pause
) else (
    timeout /t 3 >nul
)
