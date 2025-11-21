@echo off
echo 🔍 Verificando configurações...

REM Limpar cache do Expo
echo 🧹 Limpando cache do Expo...
if exist .expo rmdir /s /q .expo

REM Verificar porta 8081
echo 🔍 Verificando porta 8081...
netstat -ano | findstr :8081 >nul
if %errorlevel% == 0 (
    echo ⚠️  Porta 8081 está em uso
    echo 💡 Feche o processo manualmente ou execute: taskkill /F /PID <PID>
    pause
)

REM Obter IP da rede
echo 📱 Obtendo IP da rede local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    set IP=!IP:~1!
    echo ✅ IP detectado: !IP!
    goto :found
)

:found
echo.
echo 🚀 Iniciando Expo com LAN...
echo 📱 Certifique-se de que o iPhone está na mesma rede Wi-Fi
echo.

npx expo start --host lan --clear

