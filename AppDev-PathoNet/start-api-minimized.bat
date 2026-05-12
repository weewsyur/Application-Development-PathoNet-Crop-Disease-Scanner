@echo off
REM PathoNet API Startup Script (Minimized) for Windows
REM This script starts the PathoNet Flask API server in a minimized window

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "run_api_server.py" (
    echo ERROR: run_api_server.py not found
    exit /b 1
)

REM Start the API server in minimized window
start /min cmd /c "python run_api_server.py && pause"
