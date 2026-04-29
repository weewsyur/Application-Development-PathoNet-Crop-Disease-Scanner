#!/usr/bin/env powershell
<#
PathoNet Scanner - Quick Start & Diagnostics
Windows PowerShell Script

Usage:
  .\quick_start.ps1
#>

Write-Host "`n" + "="*70
Write-Host "  🌱 PathoNet Scanner — Quick Start & Diagnostics" -ForegroundColor Cyan
Write-Host "="*70 + "`n"

# Function to pause
function Wait-ForUser {
    Write-Host "Press any key to continue..." -ForegroundColor Yellow
    $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
}

# Step 1: Activate Virtual Environment
Write-Host "Step 1: Activating Python Virtual Environment..." -ForegroundColor Cyan
Write-Host "-" * 70

if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    try {
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
        & .\.venv\Scripts\Activate.ps1
        Write-Host "✓ Virtual environment activated`n" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to activate venv: $_`n" -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host "✗ Virtual environment not found at .\.venv`n" -ForegroundColor Red
    Exit 1
}

# Step 2: Check Dependencies
Write-Host "Step 2: Checking Python Dependencies..." -ForegroundColor Cyan
Write-Host "-" * 70

$required_packages = @("flask", "flask-cors", "torch", "pillow")
$missing_packages = @()

foreach ($package in $required_packages) {
    try {
        python -c "import ${package}" 2>$null
        Write-Host "  ✓ $package installed" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $package NOT installed" -ForegroundColor Red
        $missing_packages += $package
    }
}

if ($missing_packages.Count -gt 0) {
    Write-Host "`n⚠️  Missing packages: $($missing_packages -join ', ')" -ForegroundColor Yellow
    Write-Host "Installing..." -ForegroundColor Yellow
    pip install flask flask-cors torch torchvision pillow
    Write-Host ""
}

# Step 3: Check Port 5000
Write-Host "Step 3: Checking Port 5000..." -ForegroundColor Cyan
Write-Host "-" * 70

$port_in_use = netstat -ano 2>$null | Select-String ":5000.*LISTENING"
if ($port_in_use) {
    Write-Host "⚠️  Port 5000 is already in use!`n" -ForegroundColor Yellow
    Write-Host "This might be OK if Flask is already running.`n" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 5000 is available`n" -ForegroundColor Green
}

# Step 4: Start Flask Server
Write-Host "Step 4: Starting Flask API Server..." -ForegroundColor Cyan
Write-Host "-" * 70 + "`n"

Write-Host "Starting: python run_api_server.py`n" -ForegroundColor Yellow
Start-Sleep -Seconds 1

try {
    python run_api_server.py
} catch {
    Write-Host "✗ Error starting Flask server: $_`n" -ForegroundColor Red
    Exit 1
}
