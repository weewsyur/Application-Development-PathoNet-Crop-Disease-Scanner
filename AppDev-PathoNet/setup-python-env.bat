@echo off
REM PathoNet Python Environment Setup Script
REM Creates virtual environment and installs dependencies

echo ========================================
echo   PathoNet Python Environment Setup
echo ========================================
echo.

REM Check Python version
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo.
echo [1/3] Creating virtual environment...
if exist .venv (
    echo Virtual environment already exists. Removing...
    rmdir /s /q .venv
)
python -m venv .venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo [2/3] Activating virtual environment and installing dependencies...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Upgrade pip
python -m pip install --upgrade pip

REM Install requirements
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying installation...
python -c "import numpy; import torch; import flask; print('All dependencies installed successfully!')"
if %errorlevel% neq 0 (
    echo ERROR: Dependency verification failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To activate the virtual environment:
echo   .venv\Scripts\activate.bat
echo.
echo To start the API server:
echo   python run_api_server.py
echo.
echo To start with npm:
echo   npm start
echo.
pause
