@echo off
title Install Laptop Remote to Startup
cd /d "%~dp0"
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v LaptopRemote /t REG_SZ /d "wscript.exe \"%~dp0start-silent.vbs\"" /f
echo.
echo ========================================================
echo   [OK] Successfully registered in Windows Startup!
echo   The server will now start automatically when you open
echo   or log into your laptop.
echo ========================================================
echo.
pause
