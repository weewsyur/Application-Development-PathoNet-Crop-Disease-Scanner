@echo off
REM PathoNet API Startup Script for Windows
REM This script starts the PathoNet Flask API server

echo Starting PathoNet API Server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "run_api_server.py" (
    echo ERROR: run_api_server.py not found
    echo Please run this script from the AppDev-PathoNet directory
    pause
    exit /b 1
)

REM Start the API server
echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python run_api_server.py

pause
