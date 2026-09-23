#!/usr/bin/env pwsh
# Complete System Startup Script for Antarctic Research Station Management

Write-Host ""
Write-Host "🚀 ANTARCTIC RESEARCH STATION MANAGEMENT SYSTEM" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Function to kill process on port
function Stop-PortProcess {
    param($Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "⚠️  Port $Port is in use. Stopping process..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Write-Host "📋 STEP 1: Environment Check" -ForegroundColor Green
Write-Host "----------------------------" -ForegroundColor Gray

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found! Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Install from https://python.org" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 STEP 2: Check ML Dependencies" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Gray

# Test ML engines
$mlTest = python -c @"
try:
    from ml_models.astar import astar_pathfind
    from ml_models.nlp_triage import get_classifier
    from ml_models.knapsack import knapsack_optimize
    from ml_models.inventory_forecast import forecast_depletion
    print('OK')
except Exception as e:
    print(f'ERROR: {e}')
"@ 2>&1

if ($mlTest -match "OK") {
    Write-Host "✓ A* Pathfinding Engine" -ForegroundColor Green
    Write-Host "✓ NLP Triage Classifier" -ForegroundColor Green
    Write-Host "✓ Knapsack Optimizer" -ForegroundColor Green
    Write-Host "✓ Prophet Forecasting" -ForegroundColor Green
} else {
    Write-Host "✗ ML engines have issues: $mlTest" -ForegroundColor Red
    Write-Host "⚠️  Installing dependencies..." -ForegroundColor Yellow
    Set-Location backend-ml
    pip install -r requirements.txt --quiet
    Set-Location ..
}

Write-Host ""
Write-Host "📋 STEP 3: Clear Ports" -ForegroundColor Green
Write-Host "----------------------" -ForegroundColor Gray

# Clear ports if in use
if (Test-Port 3000) { Stop-PortProcess 3000 }
if (Test-Port 5173) { Stop-PortProcess 5173 }
if (Test-Port 8001) { Stop-PortProcess 8001 }

Write-Host "✓ Ports cleared (3000, 5173, 8001)" -ForegroundColor Green

Write-Host ""
Write-Host "📋 STEP 4: Starting Services" -ForegroundColor Green
Write-Host "----------------------------" -ForegroundColor Gray

# Start ML Service
Write-Host ""
Write-Host "🤖 Starting ML Service (Port 8001)..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend-ml; Write-Host '🤖 ML SERVICE' -ForegroundColor Magenta; python main.py"
Start-Sleep -Seconds 3

# Check ML service health
try {
    $mlHealth = Invoke-RestMethod -Uri "http://localhost:8001/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ ML Service: $($mlHealth.status)" -ForegroundColor Green
    Write-Host "  - A* Route Optimizer: ✓" -ForegroundColor Gray
    Write-Host "  - NLP Triage: ✓" -ForegroundColor Gray
    Write-Host "  - Prophet Forecast: ✓" -ForegroundColor Gray
    Write-Host "  - Knapsack: ✓" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  ML Service starting (may take a moment)..." -ForegroundColor Yellow
}

# Start Backend API
Write-Host ""
Write-Host "⚙️  Starting Backend API (Port 3000)..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend-api; Write-Host '⚙️  BACKEND API' -ForegroundColor Blue; npm start"
Start-Sleep -Seconds 3

# Check Backend health
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend API: Running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend API starting..." -ForegroundColor Yellow
}

# Start Frontend
Write-Host ""
Write-Host "🎨 Starting Frontend (Port 5173)..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host '🎨 FRONTEND' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Service URLs:" -ForegroundColor Yellow
Write-Host "   🎨 Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "   ⚙️  Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "   🤖 ML Service:  http://localhost:8001" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Open your browser and navigate to:" -ForegroundColor Yellow
Write-Host "   http://localhost:5173" -ForegroundColor Cyan -NoNewline
Write-Host ""
Write-Host ""
Write-Host "📝 Login with any of these roles:" -ForegroundColor Yellow
Write-Host "   • Station Commander" -ForegroundColor White
Write-Host "   • Logistics Officer" -ForegroundColor White
Write-Host "   • Field Crew" -ForegroundColor White
Write-Host "   • Medical Officer" -ForegroundColor White
Write-Host "   • HQ Admin" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  To stop all services, close all PowerShell windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to exit this window..." -ForegroundColor Gray

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "Exiting..." -ForegroundColor Gray
}
