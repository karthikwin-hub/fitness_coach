@echo off
setlocal
cd /d "%~dp0.."

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-app.ps1" ^
  -Remote ubuntu@140.245.206.149 ^
  -KeyPath "%USERPROFILE%\.ssh\oracle-trade-ideas.key" ^
  -EnvFile "web\.env.production.local"

set EXITCODE=%ERRORLEVEL%
if %EXITCODE% neq 0 (
  echo.
  echo Redeploy failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)

echo.
echo Redeploy complete: https://abstrack.duckdns.org
exit /b 0
