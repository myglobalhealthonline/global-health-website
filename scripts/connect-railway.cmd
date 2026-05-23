@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0connect-railway.ps1"
exit /b %ERRORLEVEL%
