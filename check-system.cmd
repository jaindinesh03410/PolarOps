@echo off
echo.
echo =================================
echo    SYSTEM DIAGNOSTIC CHECK
echo =================================
echo.

echo [1] Checking Node.js...
node --version >nul 2>&1
if %errorlevel%==0 (
    echo     OK - Node.js installed
) else (
    echo     ERROR - Node.js NOT found
)

echo [2] Checking Python...
python --version >nul 2>&1
if %errorlevel%==0 (
    echo     OK - Python installed
) else (
    echo     ERROR - Python NOT found
)

echo [3] Checking Backend dependencies...
if exist "backend-api\node_modules" (
    echo     OK - Backend node_modules exists
) else (
    echo     ERROR - Run: cd backend-api ^&^& npm install
)

echo [4] Checking Frontend dependencies...
if exist "frontend\node_modules" (
    echo     OK - Frontend node_modules exists
) else (
    echo     ERROR - Run: cd frontend ^&^& npm install
)

echo [5] Testing ML engines...
python test-ml-service.py >nul 2>&1
if %errorlevel%==0 (
    echo     OK - ML engines working
) else (
    echo     WARNING - ML engines may have issues
)

echo.
echo =================================
echo    CHECK COMPLETE
echo =================================
echo.
echo To start services manually:
echo   1. cd backend-ml ^& python main.py
echo   2. cd backend-api ^& npm start
echo   3. cd frontend ^& npm run dev
echo.
pause
