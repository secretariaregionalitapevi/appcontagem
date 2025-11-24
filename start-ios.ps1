# Script PowerShell para iniciar Expo iOS com configuração correta
# Uso: .\start-ios.ps1

Write-Host "🔍 Verificando configurações..." -ForegroundColor Cyan

# Obter IP da rede local
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "❌ Não foi possível detectar o IP da rede local" -ForegroundColor Red
    Write-Host "💡 Certifique-se de estar conectado à rede Wi-Fi" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ IP detectado: $ipAddress" -ForegroundColor Green

# Verificar se porta 8081 está em uso
$port8081 = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($port8081) {
    Write-Host "⚠️  Porta 8081 está em uso. Tentando liberar..." -ForegroundColor Yellow
    $processId = $port8081.OwningProcess
    if ($processId) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "✅ Porta 8081 liberada" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Não foi possível liberar a porta automaticamente" -ForegroundColor Yellow
            Write-Host "💡 Feche manualmente o processo usando a porta 8081" -ForegroundColor Yellow
        }
    }
}

# Limpar todos os caches possíveis
Write-Host "🧹 Limpando caches (Expo, Metro, npm)..." -ForegroundColor Cyan

# Cache do Expo
if (Test-Path ".\.expo") {
    Remove-Item -Recurse -Force ".\.expo" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Cache do Expo limpo" -ForegroundColor Green
}

# Cache do Metro
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Cache do Metro limpo" -ForegroundColor Green
}

# Cache do npm (opcional, mas pode ajudar)
Write-Host "  💡 Para limpar cache do npm completamente, execute: npm cache clean --force" -ForegroundColor Yellow

# Limpar node_modules/.cache se existir
if (Test-Path ".\node_modules\.cache") {
    Remove-Item -Recurse -Force ".\node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Cache do node_modules limpo" -ForegroundColor Green
}

Write-Host ""

# Iniciar Expo com LAN e otimizações
Write-Host "🚀 Iniciando Expo com LAN e otimizações..." -ForegroundColor Cyan
Write-Host "📱 Seu IP: $ipAddress" -ForegroundColor Green
Write-Host "📱 Certifique-se de que o iPhone está na mesma rede Wi-Fi" -ForegroundColor Yellow
Write-Host "⚡ Usando modo otimizado (--clear para garantir cache limpo)" -ForegroundColor Cyan
Write-Host ""

# Iniciar com cache limpo e otimizações
# --clear: limpa cache do Metro
# --host lan: permite conexão via rede local
npx expo start --host lan --clear

