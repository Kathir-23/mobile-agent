@echo off
TITLE Buddy AI Assistant Backend

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║          Buddy AI Assistant Backend          ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found in PATH.
    echo  Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: Install dependencies if needed
echo  [1/2] Checking dependencies...
pip install -r requirements_backend.txt --quiet --no-warn-script-location

echo  [2/2] Starting backend server...
echo.
python -m backend.app

pause
