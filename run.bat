@echo off
echo =========================================================
echo Starting Sehat Setu Platform (http://127.0.0.1:3000) ...
echo =========================================================
start "Sehat Setu Web Server" cmd /c "npm start"
if exist "hackfest\sehat_setu.exe" (
    echo Starting Sehat Setu C++ Surveillance Terminal...
    start "Sehat Setu C++ Terminal" "hackfest\sehat_setu.exe"
)
