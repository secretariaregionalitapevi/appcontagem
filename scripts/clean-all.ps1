# Script para limpar todos os caches e arquivos temporários
# Uso: npm run clean:all

Write-Host "🧹 Limpando todos os caches do projeto..." -ForegroundColor Cyan
Write-Host ""

# Cache do Expo
Write-Host "📦 Limpando cache do Expo..." -ForegroundColor Yellow
if (Test-Path ".\.expo") {
    Remove-Item -Recurse -Force ".\.expo" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Cache do Expo removido" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Cache do Expo não encontrado" -ForegroundColor Gray
}

# Cache do Metro
Write-Host "🚇 Limpando cache do Metro..." -ForegroundColor Yellow
$metroCache = Get-ChildItem -Path $env:TEMP -Filter "metro-*" -ErrorAction SilentlyContinue
if ($metroCache) {
    $metroCache | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Cache do Metro removido" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Cache do Metro não encontrado" -ForegroundColor Gray
}

# Cache do node_modules
Write-Host "📁 Limpando cache do node_modules..." -ForegroundColor Yellow
if (Test-Path ".\node_modules\.cache") {
    Remove-Item -Recurse -Force ".\node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Cache do node_modules removido" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Cache do node_modules não encontrado" -ForegroundColor Gray
}

# Watchman cache (se instalado)
Write-Host "👀 Limpando cache do Watchman..." -ForegroundColor Yellow
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>$null
    Write-Host "  ✅ Cache do Watchman limpo" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Watchman não instalado" -ForegroundColor Gray
}

# Limpar arquivos temporários do React Native
Write-Host "⚛️  Limpando arquivos temporários do React Native..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\react-*") {
    Get-ChildItem -Path $env:TEMP -Filter "react-*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Arquivos temporários removidos" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Nenhum arquivo temporário encontrado" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Limpeza completa!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Dica: Se o problema persistir, considere:" -ForegroundColor Yellow
Write-Host "   1. Mover o projeto para fora do OneDrive" -ForegroundColor Yellow
Write-Host "   2. Executar: npm cache clean --force" -ForegroundColor Yellow
Write-Host "   3. Reinstalar dependências: rm -rf node_modules && npm install" -ForegroundColor Yellow
Write-Host ""

