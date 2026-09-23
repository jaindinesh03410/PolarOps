Write-Host "`n🔍 SYSTEM CHECK`n" -ForegroundColor Cyan

Write-Host "1. Node.js: " -NoNewline
try { $v = node --version; Write-Host "$v ✓" -ForegroundColor Green } catch { Write-Host "✗ NOT FOUND" -ForegroundColor Red }

Write-Host "2. Python: " -NoNewline
try { $v = python --version; Write-Host "$v ✓" -ForegroundColor Green } catch { Write-Host "✗ NOT FOUND" -ForegroundColor Red }

Write-Host "3. Backend deps: " -NoNewline
if (Test-Path "backend-api/node_modules") { Write-Host "✓" -ForegroundColor Green } else { Write-Host "✗ Run: cd backend-api; npm install" -ForegroundColor Red }

Write-Host "4. Frontend deps: " -NoNewline
if (Test-Path "frontend/node_modules") { Write-Host "✓" -ForegroundColor Green } else { Write-Host "✗ Run: cd frontend; npm install" -ForegroundColor Red }

Write-Host "5. ML engines: " -NoNewline
$mlTest = python test-ml-service.py 2>&1 | Select-String "ML Service check complete"
if ($mlTest) { Write-Host "✓" -ForegroundColor Green } else { Write-Host "⚠ Check manually" -ForegroundColor Yellow }

Write-Host "`nTo start all services: .\START_ALL_SERVICES.ps1`n"
