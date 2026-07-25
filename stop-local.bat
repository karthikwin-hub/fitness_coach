@echo off
setlocal EnableExtensions EnableDelayedExpansion

set APP_PORT=3010

echo.
echo Stopping Abs-Track dev server on port %APP_PORT%...
echo.

set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%APP_PORT%" ^| findstr "LISTENING"') do (
  set FOUND=1
  set PORT_PID=%%p
  for /f "tokens=1" %%n in ('tasklist /FI "PID eq %%p" /NH 2^>nul') do set PROC_NAME=%%n
  echo   PID %%p  ^(!PROC_NAME!^)
  taskkill /PID %%p /F >nul 2>&1
)

if "%FOUND%"=="0" (
  echo Nothing was listening on port %APP_PORT%.
) else (
  echo.
  echo Done. You can run start-local.bat again.
)

echo.
pause
