@echo off
cls
echo.
echo ========================================
echo   ANTARCTIC STATION - QUICK TEST
echo ========================================
echo.

echo [TEST 1] Checking if backend can start...
cd backend-api
start /B npm start >nul 2>&1
timeout /t 3 /nobreak >nul
cd ..

echo [TEST 2] Testing Backend API health...
curl -s http://localhost:3000/api/stations >nul 2>&1
if %errorlevel%==0 (
    echo     SUCCESS - Backend API responding
) else (
    echo     FAILED - Backend not responding
)

echo [TEST 3] Testing ML Service...
cd backend-ml
start /B python main.py >nul 2>&1
timeout /t 3 /nobreak >nul
cd ..

curl -s http://localhost:8001/health >nul 2>&1
if %errorlevel%==0 (
    echo     SUCCESS - ML Service responding
) else (
    echo     FAILED - ML Service not responding
)

echo.
echo ========================================
echo   TEST COMPLETE
echo ========================================
echo.
echo Next: Open http://localhost:5173 in browser
echo.
pause
