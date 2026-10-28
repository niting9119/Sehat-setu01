@echo off
echo =========================================================
echo Starting Sehat Setu Web App (http://127.0.0.1:3000) ...
echo =========================================================
start "Sehat Setu Web Server" /D "%~dp0" cmd /c "node server.js"
if exist "%~dp0sehat_setu.exe" (
    echo Starting Sehat Setu C++ Surveillance Terminal...
    start "Sehat Setu C++ Terminal" "%~dp0sehat_setu.exe"
)

