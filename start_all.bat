@echo off
TITLE Buddy AI Assistant Launcher

echo.
echo  =======================================================
echo            Starting Buddy AI Assistant System
echo  =======================================================
echo.

echo  [1/2] Launching Backend Server (Flask)...
start "Buddy Backend" cmd /k "python -m backend.app"

echo  [2/2] Launching Frontend Development Server (Vite)...
start "Buddy Frontend" cmd /k "npm run dev"

echo.
echo  System is starting!
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo.
pause
