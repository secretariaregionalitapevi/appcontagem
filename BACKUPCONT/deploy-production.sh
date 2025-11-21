#!/bin/bash
# ===== SCRIPT DE DEPLOY AUTOMATIZADO =====
# Deploy seguro para produção com verificações de segurança

set -e  # Parar em caso de erro

# ===== CONFIGURAÇÕES =====
APP_NAME="ccb-presenca"
PRODUCTION_DIR="/var/www/ccb-presenca"
BACKUP_DIR="/var/backups/ccb-presenca"
NGINX_CONFIG="/etc/nginx/sites-available/ccb-presenca"
SERVICE_NAME="ccb-presenca"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===== FUNÇÕES AUXILIARES =====
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# ===== VERIFICAÇÕES PRÉ-DEPLOY =====
pre_deploy_checks() {
    log "Executando verificações pré-deploy..."
    
    # Verificar se está no diretório correto
    if [ ! -f "app.js" ] || [ ! -f "index.html" ]; then
        error "Arquivos principais não encontrados. Execute o script no diretório raiz do projeto."
    fi
    
    # Verificar se os arquivos de segurança existem
    if [ ! -f "security-system.js" ]; then
        error "Arquivo de segurança não encontrado: security-system.js"
    fi
    
    if [ ! -f "mobile-optimizations-enhanced.js" ]; then
        error "Arquivo de otimizações mobile não encontrado: mobile-optimizations-enhanced.js"
    fi
    
    # Verificar se o usuário tem permissões
    if [ "$EUID" -eq 0 ]; then
        warning "Executando como root. Certifique-se de que isso é necessário."
    fi
    
    success "Verificações pré-deploy concluídas"
}

# ===== BACKUP DA VERSÃO ANTERIOR =====
backup_current_version() {
    log "Criando backup da versão atual..."
    
    # Criar diretório de backup se não existir
    mkdir -p "$BACKUP_DIR"
    
    # Criar backup com timestamp
    BACKUP_NAME="${APP_NAME}-backup-$(date +'%Y%m%d-%H%M%S')"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
    
    if [ -d "$PRODUCTION_DIR" ]; then
        cp -r "$PRODUCTION_DIR" "$BACKUP_PATH"
        success "Backup criado: $BACKUP_PATH"
        
        # Manter apenas os últimos 5 backups
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        success "Backups antigos removidos (mantidos últimos 5)"
    else
        warning "Diretório de produção não encontrado. Primeiro deploy?"
    fi
}

# ===== DEPLOY DOS ARQUIVOS =====
deploy_files() {
    log "Fazendo deploy dos arquivos..."
    
    # Criar diretório de produção se não existir
    mkdir -p "$PRODUCTION_DIR"
    
    # Copiar arquivos principais
    cp -f index.html "$PRODUCTION_DIR/"
    cp -f app.js "$PRODUCTION_DIR/"
    cp -f security-system.js "$PRODUCTION_DIR/"
    cp -f mobile-optimizations-enhanced.js "$PRODUCTION_DIR/"
    cp -f mobile_optimizations.js "$PRODUCTION_DIR/"
    cp -f stop-loop.js "$PRODUCTION_DIR/"
    
    # Copiar arquivos estáticos se existirem
    if [ -d "static" ]; then
        cp -rf static "$PRODUCTION_DIR/"
    fi
    
    # Copiar outros arquivos HTML se existirem
    for file in *.html; do
        if [ -f "$file" ]; then
            cp -f "$file" "$PRODUCTION_DIR/"
        fi
    done
    
    # Definir permissões corretas
    chown -R www-data:www-data "$PRODUCTION_DIR"
    chmod -R 755 "$PRODUCTION_DIR"
    
    success "Arquivos deployados com sucesso"
}

# ===== CONFIGURAÇÃO DO NGINX =====
configure_nginx() {
    log "Configurando Nginx..."
    
    # Verificar se o arquivo de configuração existe
    if [ ! -f "nginx-production.conf" ]; then
        warning "Arquivo nginx-production.conf não encontrado. Usando configuração padrão."
        return
    fi
    
    # Copiar configuração do Nginx
    cp nginx-production.conf "$NGINX_CONFIG"
    
    # Testar configuração
    if nginx -t; then
        success "Configuração do Nginx válida"
        
        # Recarregar Nginx
        systemctl reload nginx
        success "Nginx recarregado"
    else
        error "Configuração do Nginx inválida"
    fi
}

# ===== VERIFICAÇÕES PÓS-DEPLOY =====
post_deploy_checks() {
    log "Executando verificações pós-deploy..."
    
    # Verificar se os arquivos foram copiados
    if [ ! -f "$PRODUCTION_DIR/index.html" ]; then
        error "index.html não encontrado no diretório de produção"
    fi
    
    if [ ! -f "$PRODUCTION_DIR/security-system.js" ]; then
        error "security-system.js não encontrado no diretório de produção"
    fi
    
    # Verificar permissões
    if [ ! -r "$PRODUCTION_DIR/index.html" ]; then
        error "Permissões de leitura incorretas"
    fi
    
    # Testar conectividade (se possível)
    if command -v curl >/dev/null 2>&1; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
            success "Servidor respondendo corretamente"
        else
            warning "Servidor pode não estar respondendo corretamente"
        fi
    fi
    
    success "Verificações pós-deploy concluídas"
}

# ===== LIMPEZA DE CACHE =====
clear_caches() {
    log "Limpando caches..."
    
    # Limpar cache do Nginx
    if command -v nginx >/dev/null 2>&1; then
        rm -rf /var/cache/nginx/*
        success "Cache do Nginx limpo"
    fi
    
    # Limpar cache do sistema (se aplicável)
    if command -v systemctl >/dev/null 2>&1; then
        systemctl restart nginx
        success "Nginx reiniciado"
    fi
    
    success "Caches limpos"
}

# ===== MONITORAMENTO =====
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Criar script de monitoramento básico
    cat > /usr/local/bin/ccb-presenca-monitor.sh << 'EOF'
#!/bin/bash
# Monitor básico para CCB Presença

LOG_FILE="/var/log/ccb-presenca-monitor.log"
APP_DIR="/var/www/ccb-presenca"

check_files() {
    if [ ! -f "$APP_DIR/index.html" ]; then
        echo "$(date): ERRO - index.html não encontrado" >> "$LOG_FILE"
        return 1
    fi
    
    if [ ! -f "$APP_DIR/security-system.js" ]; then
        echo "$(date): ERRO - security-system.js não encontrado" >> "$LOG_FILE"
        return 1
    fi
    
    return 0
}

check_nginx() {
    if ! systemctl is-active --quiet nginx; then
        echo "$(date): ERRO - Nginx não está rodando" >> "$LOG_FILE"
        return 1
    fi
    
    return 0
}

# Executar verificações
if check_files && check_nginx; then
    echo "$(date): OK - Sistema funcionando normalmente" >> "$LOG_FILE"
else
    echo "$(date): ERRO - Problemas detectados" >> "$LOG_FILE"
    # Aqui você pode adicionar notificações por email ou outros alertas
fi
EOF
    
    chmod +x /usr/local/bin/ccb-presenca-monitor.sh
    
    # Adicionar ao crontab para execução a cada 5 minutos
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ccb-presenca-monitor.sh") | crontab -
    
    success "Monitoramento configurado"
}

# ===== FUNÇÃO PRINCIPAL =====
main() {
    log "Iniciando deploy do $APP_NAME..."
    
    # Verificações pré-deploy
    pre_deploy_checks
    
    # Backup da versão atual
    backup_current_version
    
    # Deploy dos arquivos
    deploy_files
    
    # Configuração do Nginx
    configure_nginx
    
    # Verificações pós-deploy
    post_deploy_checks
    
    # Limpeza de cache
    clear_caches
    
    # Configurar monitoramento
    setup_monitoring
    
    success "Deploy concluído com sucesso!"
    log "Aplicação disponível em: https://congregacaocristanobrasil.org.br"
    
    # Mostrar próximos passos
    echo ""
    echo -e "${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
    echo "1. Verificar logs: tail -f /var/log/nginx/ccb-presenca-access.log"
    echo "2. Monitorar sistema: tail -f /var/log/ccb-presenca-monitor.log"
    echo "3. Testar funcionalidades críticas"
    echo "4. Verificar métricas de segurança"
    echo ""
    echo -e "${GREEN}🚀 Sistema pronto para produção!${NC}"
}

# ===== EXECUÇÃO =====
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
