@echo off
title X Transfer Launcher
echo ===================================================
echo             Starting X Transfer App
echo ===================================================
echo.

:: Get the directory of this batch script
set "ROOT_DIR=%~dp0"

echo [1/3] Starting Backend server (Port 3001)...
start "X Transfer - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && npm run dev"

echo [2/3] Starting Frontend server (Port 5173)...
start "X Transfer - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ===================================================
echo  X Transfer is now running!
echo  Keep the opened command windows running while using.
echo ===================================================
echo.
pause
