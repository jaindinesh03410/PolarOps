#!/usr/bin/env pwsh
# System Diagnostic Script - Find all issues

Write-Host ""
Write-Host "🔍 COMPLETE SYSTEM DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# Check 1: Node.js
Write-Host "[1/10] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js NOT found" -ForegroundColor Red
    $issues += "Node.js not installed"
}

# Check 2: Python
Write-Host "[2/10] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✓ Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python NOT found" -ForegroundColor Red
    $issues += "Python not installed"
}

# Check 3: Backend Dependencies
Write-Host "[3/10] Checking Backend API dependencies..." -ForegroundColor Yellow
if (Test-Path "backend-api/node_modules") {
    Write-Host "✓ Backend node_modules exists" -ForegroundColor Green
} else {
    Write-Host "✗ Backend dependencies missing" -ForegroundColor Red
    $issues += "Backend dependencies not installed (run: cd backend-api && npm install)"
}

# Check 4: Frontend Dependencies
Write-Host "[4/10] Checking Frontend dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend/node_modules") {
    Write-Host "✓ Frontend node_modules exists" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend dependencies missing" -ForegroundColor Red
    $issues += "Frontend dependencies not installed (run: cd frontend && npm install)"
}

# Check 5: ML Dependencies
Write-Host "[5/10] Checking ML Python packages..." -ForegroundColor Yellow
$mlCheck = python -c @"
import sys
missing = []
try: import fastapi
except: missing.append('fastapi')
try: import uvicorn
except: missing.append('uvicorn')
try: import numpy
except: missing.append('numpy')
try: import pandas
except: missing.append('pandas')
try: import sklearn
except: missing.append('sklearn')
try: import prophet
except: missing.append('prophet')
if missing:
    print('MISSING:' + ','.join(missing))
else:
    print('OK')
"@ 2>&1

if ($mlCheck -match "OK") {
    Write-Host "✓ Core ML packages installed" -ForegroundColor Green
} else {
    Write-Host "✗ Missing ML packages: $mlCheck" -ForegroundColor Red
    $issues += "ML dependencies missing (run: cd backend-ml && pip install -r requirements.txt)"
}

# Check 6: Environment Files
Write-Host "[6/10] Checking environment files..." -ForegroundColor Yellow
if (Test-Path "backend-api/.env") {
    Write-Host "✓ Backend .env exists" -ForegroundColor Green
} else {
    Write-Host "✗ Backend .env missing" -ForegroundColor Red
    $issues += "backend-api/.env file missing"
}

if (Test-Path "frontend/.env") {
    Write-Host "✓ Frontend .env exists" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend .env missing" -ForegroundColor Red
    $issues += "frontend/.env file missing"
}

# Check 7: Test ML Engines
Write-Host "[7/10] Testing ML engines..." -ForegroundColor Yellow
Set-Location backend-ml
$mlEngineTest = python -c @"
import sys
sys.path.insert(0, '.')
errors = []
try:
    from ml_models.astar import astar_pathfind
    result = astar_pathfind({'lat': -70.0, 'lng': 10.0}, {'lat': -69.5, 'lng': 11.0}, [])
except Exception as e:
    errors.append(f'A*: {e}')
try:
    from ml_models.nlp_triage import get_classifier
    clf = get_classifier()
    clf.predict('test')
except Exception as e:
    errors.append(f'NLP: {e}')
try:
    from ml_models.knapsack import knapsack_optimize
    knapsack_optimize([{'item_name': 'test', 'weight': 10, 'volume': 5, 'priority': 8}], 20, 10)
except Exception as e:
    errors.append(f'Knapsack: {e}')
try:
    from ml_models.inventory_forecast import forecast_depletion
    forecast_depletion(100, 5, 'test', [])
except Exception as e:
    errors.append(f'Forecast: {e}')
if errors:
    for e in errors: print(e)
else:
    print('OK')
"@ 2>&1
Set-Location ..

if ($mlEngineTest -match "OK") {
    Write-Host "✓ A* Pathfinding" -ForegroundColor Green
    Write-Host "✓ NLP Triage" -ForegroundColor Green
    Write-Host "✓ Knapsack Optimizer" -ForegroundColor Green
    Write-Host "✓ Prophet Forecast" -ForegroundColor Green
} else {
    Write-Host "✗ ML engine errors:" -ForegroundColor Red
    Write-Host $mlEngineTest -ForegroundColor Red
    $issues += "ML engines have errors (see above)"
}

# Check 8: Port Availability
Write-Host "[8/10] Checking ports..." -ForegroundColor Yellow
$ports = @{3000 = "Backend API"; 5173 = "Frontend"; 8001 = "ML Service"}
foreach ($port in $ports.Keys) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "⚠️  Port $port ($($ports[$port])) is in use" -ForegroundColor Yellow
        $warnings += "Port $port in use - service may already be running"
    } else {
        Write-Host "✓ Port $port available" -ForegroundColor Green
    }
}

# Check 9: Database Connection
Write-Host "[9/10] Testing Supabase connection..." -ForegroundColor Yellow
try {
    $supabaseUrl = Get-Content "backend-api/.env" | Select-String "SUPABASE_URL" | ForEach-Object { $_.ToString().Split('=')[1].Trim() }
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Supabase connection successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot reach Supabase" -ForegroundColor Red
    $issues += "Supabase connection failed - check SUPABASE_URL in backend-api/.env"
}

# Check 10: File Structure
Write-Host "[10/10] Checking project structure..." -ForegroundColor Yellow
$requiredPaths = @(
    "backend-api/src/routes",
    "backend-ml/ml_models",
    "frontend/src/pages",
    "frontend/src/components",
    "supabase"
)
$allGood = $true
foreach ($path in $requiredPaths) {
    if (!(Test-Path $path)) {
        Write-Host "✗ Missing: $path" -ForegroundColor Red
        $allGood = $false
    }
}
if ($allGood) {
    Write-Host "✓ Project structure intact" -ForegroundColor Green
} else {
    $issues += "Project structure incomplete"
}

# Summary
Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "📊 DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ NO ISSUES FOUND!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your system is ready. Run START_ALL_SERVICES.ps1 to start." -ForegroundColor Green
} else {
    if ($issues.Count -gt 0) {
        Write-Host "🔴 CRITICAL ISSUES ($($issues.Count)):" -ForegroundColor Red
        $issues | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   • $_" -ForegroundColor Yellow }
        Write-Host ""
    }
    
    Write-Host "QUICK FIXES:" -ForegroundColor Cyan
    if ($issues -match "Backend dependencies") {
        Write-Host "   cd backend-api && npm install" -ForegroundColor White
    }
    if ($issues -match "Frontend dependencies") {
        Write-Host "   cd frontend && npm install" -ForegroundColor White
    }
    if ($issues -match "ML dependencies") {
        Write-Host "   cd backend-ml && pip install -r requirements.txt" -ForegroundColor White
    }
}

Write-Host ""
