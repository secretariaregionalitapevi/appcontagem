@echo off
echo ========================================
echo    CCB PRESENCA - SERVIDOR LOCAL
echo ========================================
echo.

REM Verifica se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    echo.
    echo 📥 Para instalar o Node.js:
    echo    1. Acesse: https://nodejs.org
    echo    2. Baixe a versão LTS
    echo    3. Execute o instalador
    echo    4. Reinicie este script
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado!
node --version

REM Verifica se as dependências estão instaladas
if not exist "node_modules" (
    echo.
    echo 📦 Instalando dependências...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências!
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas!
)

echo.
echo 🚀 Iniciando servidor local...
echo.
echo 💡 O aplicativo será aberto em: http://localhost:3000
echo 💡 Para parar o servidor: Ctrl+C
echo.

REM Inicia o servidor
node server-local.js

echo.
echo 🛑 Servidor encerrado.
pause
