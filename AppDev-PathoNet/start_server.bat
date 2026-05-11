@echo off
echo ==============================================
echo   🌱 PathoNet AI Server
echo ==============================================
echo.
echo Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)
echo Starting Flask server...
echo Press Ctrl+C to stop
echo.
python run_api_server.py
pause
