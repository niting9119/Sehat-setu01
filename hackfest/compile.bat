@echo off
echo ===================================================
echo Compiling Sehat Setu C++ Surveillance Engine...
echo ===================================================
g++ -std=c++17 -O2 cpp/sehat_setu.cpp -o sehat_setu.exe
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Compilation complete: sehat_setu.exe
) else (
    echo [ERROR] Compilation failed.
)
pause
