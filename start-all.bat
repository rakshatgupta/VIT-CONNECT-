@echo off
echo ===================================================
echo     Starting VIT Vellore Student Platform
echo ===================================================

echo.
echo [1/2] Starting Node.js Core Backend (Port 5000)...
start cmd /k "title Node.js Core Backend && cd node-backend && npm install && node server.js"

echo.
echo [2/2] Starting React Vite Frontend (Port 5173)...
start cmd /k "title React Frontend && cd frontend && npm install && npm run dev"

echo.
echo All services have been launched in separate terminal windows!
echo Make sure MongoDB is running locally on port 27017.
echo.
pause
