@echo off
REM Hemp OS Unified Startup Script
REM Launches all three systems on their assigned ports:
REM   Hemp OS:      3100 (kernel, simulation, provenance)
REM   Hemp OS DB:   3200 (database, ingestion, insights)
REM   Hemp Agent:   3300 (cognitive swarm, NCBI, brain kernel)

echo ============================================
echo    Hemp OS - Unified Research Platform
echo ============================================
echo.
echo Starting all systems...
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Create log directory
if not exist logs mkdir logs

REM Start Hemp OS (Port 3100)
echo [1/3] Starting Hemp OS on port 3100...
start "Hemp OS" cmd /k "cd /d %~dp0 && npx tsx server.ts > logs\hemp-os.log 2>&1"
timeout /t 3 /nobreak >nul

REM Start Hemp OS DB (Port 3200)
echo [2/3] Starting Hemp OS DB on port 3200...
start "Hemp OS DB" cmd /k "cd /d %~dp0\"Hemp OS DB\" && npx tsx server.ts > ..\logs\hemp-os-db.log 2>&1"
timeout /t 3 /nobreak >nul

REM Start Hemp Agent (Port 3300)
echo [3/3] Starting Hemp Agent on port 3300...
start "Hemp Agent" cmd /k "cd /d %~dp0\Hemp-Agent-main && npx tsx server.ts > ..\logs\hemp-agent.log 2>&1"
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo    All systems started!
echo ============================================
echo.
echo   Hemp OS:       http://localhost:3100
echo   Hemp OS DB:    http://localhost:3200
echo   Hemp Agent:    http://localhost:3300
echo.
echo   Integration:   http://localhost:3100/api/integration
echo   Health:        http://localhost:3100/api/integration/health
echo.
echo   Logs:          logs\hemp-os.log
echo                  logs\hemp-os-db.log
echo                  logs\hemp-agent.log
echo.
echo Press any key to open all systems in browser...
pause >nul

start http://localhost:3100
start http://localhost:3200
start http://localhost:3300
