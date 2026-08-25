@echo off
TITLE Stop WQMS Server
COLOR 0C
CLS

echo =========================================================
echo    STOPPING WATER QUALITY MONITORING SYSTEM (WQMS)
echo =========================================================
echo.

echo Terminating running Python WQMS processes...
taskkill /F /FI "WINDOWTITLE eq WQMS*" >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1

echo.
echo [OK] All WQMS server processes have been stopped successfully.
echo.
timeout /t 3
