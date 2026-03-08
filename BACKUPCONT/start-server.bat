@echo off
echo 🚀 Iniciando servidor PWA para CCB Presença...
echo.

REM Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado! Instale Python 3.6+ primeiro.
    echo 📥 Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Inicia o servidor
echo ✅ Python encontrado! Iniciando servidor...
echo.
python server.py

pause
