#!/bin/bash

echo "========================================"
echo "   CCB PRESENCA - SERVIDOR LOCAL"
echo "========================================"
echo

# Verifica se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo
    echo "📥 Para instalar o Node.js:"
    echo "   Ubuntu/Debian: sudo apt install nodejs npm"
    echo "   CentOS/RHEL: sudo yum install nodejs npm"
    echo "   macOS: brew install node"
    echo "   Ou acesse: https://nodejs.org"
    echo
    exit 1
fi

echo "✅ Node.js encontrado!"
node --version

# Verifica se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências!"
        exit 1
    fi
    echo "✅ Dependências instaladas!"
fi

echo
echo "🚀 Iniciando servidor local..."
echo
echo "💡 O aplicativo será aberto em: http://localhost:3000"
echo "💡 Para parar o servidor: Ctrl+C"
echo

# Inicia o servidor
node server-local.js

echo
echo "🛑 Servidor encerrado."
