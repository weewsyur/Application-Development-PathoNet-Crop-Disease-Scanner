@echo off
REM PathoNet API Server Startup Script
REM This script attempts to find Python and start the API server

echo ========================================
echo   PathoNet API Server Launcher
echo ========================================
echo.

REM Try to find Python in common locations (bypass Windows Store alias)
set PYTHON_CMD=
set PIP_CMD=

REM Check common Python installation paths first (bypass PATH to avoid Windows Store alias)
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python3*\python.exe" (
    for /d %%i in ("C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python3*") do (
        set PYTHON_CMD="%%i\python.exe"
        set PIP_CMD="%%i\Scripts\pip.exe"
        echo Found Python at: %%i\python.exe
        goto :check_deps
    )
)

if exist "C:\Python3*\python.exe" (
    for /d %%i in ("C:\Python3*") do (
        set PYTHON_CMD="%%i\python.exe"
        set PIP_CMD="%%i\Scripts\pip.exe"
        echo Found Python at: %%i\python.exe
        goto :check_deps
    )
)

if exist "C:\Python\python.exe" (
    set PYTHON_CMD="C:\Python\python.exe"
    set PIP_CMD="C:\Python\Scripts\pip.exe"
    echo Found Python at: C:\Python\python.exe
    goto :check_deps
)

REM Check py launcher if available
where py >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    set PIP_CMD=py -m pip
    echo Found Python Launcher
    goto :check_deps
)

REM Python not found
echo ========================================
echo   ERROR: Python not found
echo ========================================
echo.
echo Python is not installed or not in standard location.
echo.
echo Please:
echo 1. Install Python from https://www.python.org/downloads/
echo 2. Make sure to check "Add Python to PATH" during installation
echo 3. Or disable Windows Store Python alias:
echo    - Go to Settings > Apps > Advanced app settings > App execution aliases
echo    - Turn off "App Installer (python.exe)"
echo.
echo See FIX-PYTHON-PATH.md for detailed instructions.
echo.
pause
exit /b 1

:check_deps
echo.
echo Checking dependencies...
%PYTHON_CMD% -c "import numpy" >nul 2>&1
if %errorlevel% neq 0 (
    echo Dependencies not found. Installing...
    echo This may take a few minutes...
    %PIP_CMD% install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ========================================
        echo   ERROR: Failed to install dependencies
        echo ========================================
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
)

:run_server
echo.
echo Starting PathoNet API Server...
echo Server will run on: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
%PYTHON_CMD% run_api_server.py
