@echo off
cd /d "%~dp0.."
set IMAGE_NAME=regionalitapevi/appcontagem:cardoso

echo 🚀 Iniciando Build da imagem Docker...
docker build -t %IMAGE_NAME% .

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro no Build!
    exit /b %ERRORLEVEL%
)

echo ✅ Build concluído!
echo 📤 Enviando para o Docker Hub...
docker push %IMAGE_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro no Push! Certifique-se de estar logado no Docker (docker login).
    exit /b %ERRORLEVEL%
)

echo 🎊 Imagem enviada com sucesso para o Docker Hub!
pause
