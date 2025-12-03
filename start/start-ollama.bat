@echo off
echo Starting Ollama AI Engine...
echo.

where ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo Checking if Ollama is already running...
    netstat -ano | findstr ":11434" >nul 2>&1
    if %errorlevel% equ 0 (
        echo Ollama is already running on port 11434
        echo.
        echo Access at: http://localhost:11434
        pause
    ) else (
        echo Starting Ollama server...
        ollama serve
    )
) else (
    echo ERROR: Ollama not found in PATH
    echo.
    echo Download Ollama from: https://ollama.com/download
    echo After installing, add Ollama to your PATH and try again.
    pause
    exit /b 1
)
