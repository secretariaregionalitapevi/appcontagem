# Script para configurar Git com UTF-8
# Execute este script uma vez para configurar o Git corretamente

Write-Host "🔧 Configurando Git para usar UTF-8..." -ForegroundColor Cyan

# Configurar Git globalmente para UTF-8
git config --global core.quotepath false
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
git config --global core.autocrlf input

# Configurar Git localmente para este repositório
git config core.quotepath false
git config i18n.commitencoding utf-8
git config i18n.logoutputencoding utf-8

# Configurar PowerShell para UTF-8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# Criar perfil do PowerShell se não existir
$profilePath = $PROFILE.CurrentUserAllHosts
if (-not (Test-Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

# Adicionar configuração UTF-8 ao perfil do PowerShell
$utf8Config = @"
# Configuração UTF-8 para Git
`$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
"@

if (-not (Get-Content $profilePath -ErrorAction SilentlyContinue | Select-String -Pattern "Configuração UTF-8")) {
    Add-Content -Path $profilePath -Value $utf8Config
    Write-Host "✅ Configuração UTF-8 adicionada ao perfil do PowerShell" -ForegroundColor Green
}

# Tornar hooks executáveis (se estiverem no WSL/Git Bash)
if (Get-Command bash -ErrorAction SilentlyContinue) {
    bash -c "chmod +x .git/hooks/commit-msg .git/hooks/pre-commit" 2>$null
}

Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Configurações aplicadas:" -ForegroundColor Yellow
Write-Host "   - Git commit encoding: UTF-8"
Write-Host "   - Git log output encoding: UTF-8"
Write-Host "   - PowerShell encoding: UTF-8"
Write-Host "   - Hooks de validação UTF-8 instalados"
Write-Host ""
Write-Host "🚀 Todos os commits futuros usarão UTF-8 automaticamente!" -ForegroundColor Green

