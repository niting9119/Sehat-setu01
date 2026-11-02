@echo off
cd /d "%~dp0"
echo =========================================================
echo Starting Sehat Setu Platform (http://localhost:3000) ...
echo =========================================================
start "Sehat Setu Web Server" cmd /c "npm start"
if exist "hackfest\cpp\sehat_setu.exe" (
    echo Starting Sehat Setu C++ Surveillance Terminal...
    start "Sehat Setu C++ Terminal" "hackfest\cpp\sehat_setu.exe"
)
