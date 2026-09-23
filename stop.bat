@echo off
title Stop Remote Enter Button
cd /d "%~dp0"
echo Stopping Remote Enter Button server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Terminating process ID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
echo Done! Remote Enter Button stopped.
timeout /t 2 >nul
