#!/bin/bash

echo "🚀 Iniciando servidor PWA para CCB Presença..."
echo

# Verifica se Python está instalado
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Python não encontrado! Instale Python 3.6+ primeiro."
        echo "📥 Ubuntu/Debian: sudo apt install python3"
        echo "📥 macOS: brew install python3"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

echo "✅ Python encontrado! Iniciando servidor..."
echo

# Torna o script executável
chmod +x "$0"

# Inicia o servidor
$PYTHON_CMD server.py
