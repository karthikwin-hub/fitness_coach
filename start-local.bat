@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Re-launch in a dedicated window that stays open (double-click friendly).
if /i not "%~1"=="run" (
  start "Abs-Track Local (port 3010)" cmd /k "%~f0" run
  exit /b 0
)

cd /d "%~dp0"
title Abs-Track Local Dev — http://localhost:3010

set APP_PORT=3010

echo.
echo ============================================================
echo   Abs-Track Fitness Coach — Local Dev
echo ============================================================
echo.
echo   App URL:     http://localhost:%APP_PORT%
echo   Sign in:     http://localhost:%APP_PORT%/login
echo   Coach:       http://localhost:%APP_PORT%/coach
echo   Member app:  http://localhost:%APP_PORT%/member
echo.
echo   Dev personas (no Firebase): open Sign in, then pick:
echo     Coach — Helna
echo     Member — Demo (Hetal plans)  ^(or Hetal / Avinash / Shruti^)
echo.
echo   Database:    localhost:5435  ^(Docker Postgres^)
echo   Stop server: Ctrl+C in this window, or run stop-local.bat
echo.
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker is not installed or not on PATH.
  echo         Install Docker Desktop and start it, then run this script again.
  goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js/npm is not installed or not on PATH.
  goto :failed
)

if not exist "web\package.json" (
  echo [ERROR] web\package.json not found. Run this from the project root.
  goto :failed
)

if not exist "web\node_modules" (
  echo Installing npm dependencies...
  pushd web
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    goto :failed
  )
  popd
  echo.
)

if not exist "web\.env.local" (
  if exist "web\.env.example" (
    echo Creating web\.env.local from .env.example...
    copy /Y "web\.env.example" "web\.env.local" >nul
  ) else (
    echo [WARN] web\.env.local not found. Create it before first run.
  )
  echo.
)

call :free_port %APP_PORT%
if errorlevel 1 goto :failed

echo [1/4] Starting PostgreSQL (Docker)...
docker compose up -d
if errorlevel 1 (
  echo [ERROR] Docker compose failed. Is Docker Desktop running?
  goto :failed
)

echo [2/4] Waiting for database...
timeout /t 4 /nobreak >nul

echo [3/4] Syncing database schema...
pushd web
call npm run db:push
if errorlevel 1 (
  echo [ERROR] db:push failed. Check DATABASE_URL in web\.env.local
  popd
  goto :failed
)

echo [4/4] Seeding demo data...
call npm run db:seed
if errorlevel 1 (
  echo [WARN] db:seed failed — app may still run with partial data.
)
popd

echo.
echo ============================================================
echo   Ready — starting Next.js on port %APP_PORT%
echo.
echo   Open:  http://localhost:%APP_PORT%
echo         http://localhost:%APP_PORT%/login
echo.
echo   Press Ctrl+C to stop the dev server.
echo ============================================================
echo.

pushd web
call npm run dev
set EXIT_CODE=%ERRORLEVEL%
popd

echo.
if not "%EXIT_CODE%"=="0" (
  echo Dev server stopped with error code %EXIT_CODE%.
) else (
  echo Dev server stopped.
)
goto :done

:failed
echo.
echo Startup failed. Fix the error above and run start-local.bat again.
goto :done

:done
echo.
pause
exit /b 0

REM --- Stop stale Node process on APP_PORT if needed ---
:free_port
set CHECK_PORT=%~1
set PORT_PID=

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%CHECK_PORT%" ^| findstr "LISTENING"') do (
  if not defined PORT_PID set PORT_PID=%%p
)

if not defined PORT_PID exit /b 0

set PROC_NAME=
for /f "tokens=1" %%n in ('tasklist /FI "PID eq %PORT_PID%" /NH 2^>nul') do set PROC_NAME=%%n

if /i "%PROC_NAME%"=="node.exe" (
  echo [INFO] Port %CHECK_PORT% in use by previous dev server ^(PID %PORT_PID%^).
  echo        Stopping it so a fresh server can start...
  taskkill /PID %PORT_PID% /F >nul 2>&1
  timeout /t 2 /nobreak >nul
  exit /b 0
)

echo [ERROR] Port %CHECK_PORT% is already in use by %PROC_NAME% ^(PID %PORT_PID%^).
echo         Close that program, or run stop-local.bat if it is an old Abs-Track server.
exit /b 1
