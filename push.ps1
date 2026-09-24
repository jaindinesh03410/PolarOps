# Quick push script — double-click to run, or run from terminal
$msg = Read-Host "Commit message (press Enter for default)"
if (-not $msg) { $msg = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

git add frontend/src frontend/package.json backend-api/src backend-ml
git commit -m $msg
git push origin main

Write-Host "`n✅ Pushed to GitHub!" -ForegroundColor Green
Read-Host "Press Enter to close"
