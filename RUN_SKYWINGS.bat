@echo off
title SkyWings Airlines - C++ Backend
cd /d "%~dp0"

echo ==========================================
echo       SKYWINGS AIRLINES - BACKEND
echo ==========================================
echo.

where g++ >nul 2>nul
if errorlevel 1 (
  echo ERROR: MinGW g++ was not found.
  echo Install a MinGW-w64 C++ compiler and add its bin folder to PATH.
  pause
  exit /b 1
)

if not exist "backend\backend.exe" (
  echo Compiling the C++ backend...
  g++ -std=c++17 -O2 -pthread "backend\backend.cpp" -I"backend" -lsqlite3 -lws2_32 -o "backend\backend.exe"
  if errorlevel 1 (
    echo.
    echo COMPILATION FAILED.
    echo Check that SQLite development files are installed for MinGW.
    pause
    exit /b 1
  )
)

echo Starting SkyWings C++ backend...
echo Keep this window open while using the website.
echo.
"backend\backend.exe"
echo.
echo Backend stopped.
pause
