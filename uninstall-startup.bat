@echo off
title Remove Laptop Remote from Startup
reg delete HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v LaptopRemote /f >nul 2>&1
reg delete HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v RemoteEnterButton /f >nul 2>&1
echo.
echo ========================================================
echo   [OK] Removed from Windows Startup!
echo ========================================================
echo.
pause
