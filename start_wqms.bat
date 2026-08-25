@echo off
TITLE WQMS - Water Quality Monitoring System Launcher
COLOR 0A
CLS

echo =========================================================
echo    WATER QUALITY MONITORING SYSTEM (WQMS) LAUNCHER
echo =========================================================
echo.

:: 1. Check & Start Database (MySQL / MariaDB / XAMPP)
echo [1/3] Checking Database Service (MySQL / MariaDB)...
net start MySQL >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] MySQL service is running.
) else (
    net start MariaDB >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] MariaDB service is running.
    ) else (
        if exist "C:\xampp\mysql\bin\mysqld.exe" (
            echo Starting MySQL via XAMPP...
            start "" "C:\xampp\mysql_start.bat" >nul 2>&1
        ) else (
            echo [NOTE] Database service check complete. Proceeding to server startup...
        )
    )
)

echo.
:: 2. Launch Flask Backend Server
echo [2/3] Starting WQMS Flask Backend Server...
cd /d "%~dp0backend"

if exist "..\.venv\Scripts\python.exe" (
    echo Using Virtual Environment: .venv
    set "PYTHON_EXEC=..\.venv\Scripts\python.exe"
) else (
    echo Using System Python...
    set "PYTHON_EXEC=python"
)

:: 3. Open Browser automatically
echo [3/3] Launching WQMS Portal in Web Browser...
timeout /t 2 >nul
start "" "http://127.0.0.1:5000"

echo.
echo =========================================================
echo    WQMS Server is LIVE! 🚀
echo    Portal URL: http://127.0.0.1:5000
echo    (Keep this window open while using the system)
echo =========================================================
echo.

%PYTHON_EXEC% app.py

pause
