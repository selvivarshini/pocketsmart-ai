@echo off
title PocketSmart AI
cd /d "%~dp0"
echo ========================================================
echo   Starting PocketSmart AI - Smart Budget Assistant
echo ========================================================
echo.

if not exist ".venv\Scripts\activate.bat" (
    echo [1/3] Creating virtual environment (.venv)...
    python -m venv .venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Ensure Python is in your PATH.
        pause
        exit /b 1
    )
)

echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [3/3] Checking dependencies...
pip install -r requirements.txt

echo.
echo ========================================================
echo   PocketSmart AI is running!
echo   Open your browser and navigate to:
echo   http://127.0.0.1:8000
echo.
echo   Press Ctrl+C to stop the server.
echo ========================================================
echo.

uvicorn app:app --reload --host 127.0.0.1 --port 8000

pause
