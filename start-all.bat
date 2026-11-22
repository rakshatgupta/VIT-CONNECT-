@echo off
setlocal
if not exist "%~dp0node-backend\.env" (
  echo Copy node-backend\.env.example to node-backend\.env and configure MongoDB and JWT_SECRET first.
  exit /b 1
)
start "Campus Connect API" /D "%~dp0node-backend" cmd /k "npm ci && npm start"
start "Campus Connect frontend" /D "%~dp0frontend" cmd /k "npm ci && npm run dev"
