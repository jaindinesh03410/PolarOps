# Antarctic Station Management System - Windows Setup Script

Write-Host "🚀 Setting up Antarctic Station Management System..." -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "`n📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if Python is installed
Write-Host "`n📦 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✓ Python $pythonVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Setup Backend API
Write-Host "`n📦 Setting up Backend API..." -ForegroundColor Cyan
if (Test-Path "backend-api/node_modules") {
    Write-Host "✓ Backend API dependencies already installed" -ForegroundColor Green
} else {
    Set-Location backend-api
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Backend API setup failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✓ Backend API setup complete" -ForegroundColor Green
}

# Check for .env file
if (-not (Test-Path "backend-api/.env")) {
    Write-Host "⚠️  Backend API .env not found. Copy .env.example and configure." -ForegroundColor Yellow
}

# Setup ML Service
Write-Host "`n📦 Setting up ML Service..." -ForegroundColor Cyan
if (Test-Path "backend-ml/venv") {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
} else {
    Set-Location backend-ml
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Virtual environment creation failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Set-Location backend-ml
& "venv\Scripts\Activate.ps1"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ML Service setup failed" -ForegroundColor Red
    deactivate
    Set-Location ..
    exit 1
}
deactivate
Set-Location ..
Write-Host "✓ ML Service setup complete" -ForegroundColor Green

# Setup Frontend
Write-Host "`n📦 Setting up Frontend..." -ForegroundColor Cyan
if (Test-Path "frontend/node_modules") {
    Write-Host "✓ Frontend dependencies already installed" -ForegroundColor Green
} else {
    Set-Location frontend
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Frontend setup failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✓ Frontend setup complete" -ForegroundColor Green
}

# Check for .env file
if (-not (Test-Path "frontend/.env")) {
    Write-Host "⚠️  Frontend .env not found. Copy .env.example and configure." -ForegroundColor Yellow
}

Write-Host "`n✨ Setup Complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Set up Supabase (see supabase/README.md)" -ForegroundColor White
Write-Host "2. Configure .env files in backend-api/ and frontend/" -ForegroundColor White
Write-Host "3. Run start-windows.ps1 to start all services" -ForegroundColor White
