@echo off
REM Install Python Dependencies for PathoNet
REM This script finds Python and installs required packages

echo ========================================
echo   PathoNet Dependency Installer
echo ========================================
echo.

REM Try to find Python in common locations (bypass Windows Store alias)
set PYTHON_CMD=
set PIP_CMD=

REM Check common Python installation paths first
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python3*\python.exe" (
    for /d %%i in ("C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python3*") do (
        set PYTHON_CMD="%%i\python.exe"
        set PIP_CMD="%%i\Scripts\pip.exe"
        echo Found Python at: %%i\python.exe
        goto :install
    )
)

if exist "C:\Python3*\python.exe" (
    for /d %%i in ("C:\Python3*") do (
        set PYTHON_CMD="%%i\python.exe"
        set PIP_CMD="%%i\Scripts\pip.exe"
        echo Found Python at: %%i\python.exe
        goto :install
    )
)

if exist "C:\Python\python.exe" (
    set PYTHON_CMD="C:\Python\python.exe"
    set PIP_CMD="C:\Python\Scripts\pip.exe"
    echo Found Python at: C:\Python\python.exe
    goto :install
)

REM Check py launcher if available
where py >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    set PIP_CMD=py -m pip
    echo Found Python Launcher
    goto :install
)

echo ERROR: Python not found
pause
exit /b 1

:install
echo.
echo Installing required packages...
echo This may take several minutes...
echo.
%PIP_CMD% install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Dependencies installed successfully!
    echo ========================================
    echo.
    echo You can now start the API server:
    echo   .\start-api-server.bat
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR: Failed to install dependencies
    echo ========================================
    echo.
    echo Try running as Administrator or check your internet connection.
    echo.
)

pause
