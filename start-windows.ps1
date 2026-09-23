# Antarctic Station Management System - Windows Start Script
# This script starts all three services in separate PowerShell windows

Write-Host "🚀 Starting Antarctic Station Management System..." -ForegroundColor Cyan

# Check if setup has been run
if (-not (Test-Path "backend-api/node_modules")) {
    Write-Host "⚠️  Backend API not set up. Run setup-windows.ps1 first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "⚠️  Frontend not set up. Run setup-windows.ps1 first." -ForegroundColor Red
    exit 1
}

# Kill any existing processes on required ports
Write-Host "`n🔍 Checking for existing processes..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "  Killing process on port 3000..." -ForegroundColor Red
    taskkill /F /PID $port3000.OwningProcess 2>$null | Out-Null
}

$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "  Killing process on port 5173..." -ForegroundColor Red
    taskkill /F /PID $port5173.OwningProcess 2>$null | Out-Null
}

$port8001 = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($port8001) {
    Write-Host "  Killing process on port 8001..." -ForegroundColor Red
    taskkill /F /PID $port8001.OwningProcess 2>$null | Out-Null
}

Start-Sleep -Seconds 1

# Start Backend API
Write-Host "`n📡 Starting Backend API (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend-api'; Write-Host '🔵 Backend API Server' -ForegroundColor Cyan; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start ML Service (optional - skip if not needed)
if (Test-Path "backend-ml/venv") {
    Write-Host "🧠 Starting ML Service (Port 8001)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend-ml'; Write-Host '🟣 ML Service' -ForegroundColor Magenta; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8001"
    Start-Sleep -Seconds 2
} else {
    Write-Host "⚠️  ML Service not set up (skipping - can be set up later)" -ForegroundColor Gray
}

# Start Frontend
Write-Host "🎨 Starting Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🟢 Frontend Server' -ForegroundColor Green; npm run dev"

Write-Host "`n✨ All services starting in separate windows!" -ForegroundColor Green
Write-Host "`n📝 Access points:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "  ML Service:  http://localhost:8001/docs" -ForegroundColor White

Write-Host "`n🔐 Test Login Credentials:" -ForegroundColor Cyan
Write-Host "  Email:    ramesh.gupta@maitri.ant" -ForegroundColor White
Write-Host "  Password: Test@123456" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANT: Before logging in, make sure you completed:" -ForegroundColor Yellow
Write-Host "  1. ✓ Inserted seed data in Supabase SQL Editor" -ForegroundColor Gray
Write-Host "  2. ✓ Created auth user in Supabase Authentication" -ForegroundColor Gray
Write-Host "  3. ✓ Linked user_id to personnel table" -ForegroundColor Gray

Write-Host "`nPress Ctrl+C in each window to stop services." -ForegroundColor Gray
