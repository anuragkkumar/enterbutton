@echo off
title Laptop Remote Control
cd /d "%~dp0"

echo ========================================================
echo   Starting Laptop Remote Control...
echo ========================================================
echo.

set "NODE_CMD=node"

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "bin\node.exe" (
        set "NODE_CMD=bin\node.exe"
    ) else (
        echo [INFO] Node.js is not installed on this PC.
        echo [INFO] Setting up portable runtime automatically...
        echo (One-time setup - no installation or admin rights required!)
        echo.
        if not exist "bin\" mkdir bin
        echo Downloading portable Node.js runtime...
        curl.exe -# -L -o "bin\node.exe" "https://nodejs.org/dist/v20.18.0/win-x64/node.exe"
        if %errorlevel% neq 0 (
            echo.
            echo [ERROR] Automatic download failed.
            echo Please check your internet connection or install Node.js from https://nodejs.org
            pause
            exit /b
        )
        echo.
        echo [OK] Portable Node.js runtime ready!
        echo.
        set "NODE_CMD=bin\node.exe"
    )
)

if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    echo Please wait a moment...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies. Check your internet connection.
        pause
        exit /b
    )
    echo [OK] Setup complete!
    echo.
)

%NODE_CMD% server.js
pause
