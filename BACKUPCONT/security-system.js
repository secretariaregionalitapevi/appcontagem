// ===== SISTEMA DE SEGURANÇA PARA PRODUÇÃO =====
// Implementação de medidas de segurança robustas para ambiente de produção

console.log('🛡️ Inicializando sistema de segurança para produção...');

// ===== CONFIGURAÇÕES DE SEGURANÇA =====
const SECURITY_CONFIG = {
  // Versão atual da aplicação
  APP_VERSION: '2.1.0',
  
  // Configurações de validação
  MAX_INPUT_LENGTH: 255,
  MAX_TEXTAREA_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 8,
  
  // Configurações de rate limiting
  MAX_REQUESTS_PER_MINUTE: 30,
  MAX_REQUESTS_PER_HOUR: 1000,
  
  // Configurações de timeout
  REQUEST_TIMEOUT: 10000, // 10 segundos
  CONNECTION_TIMEOUT: 5000, // 5 segundos
  
  // Configurações de logging
  LOG_SECURITY_EVENTS: true,
  LOG_USER_ACTIONS: true,
  
  // Configurações de sanitização
  ALLOWED_HTML_TAGS: [],
  ALLOWED_PROTOCOLS: ['https:', 'http:'],
  
  // Configurações de CORS
  ALLOWED_ORIGINS: [
    'https://congregacaocristanobrasil.org.br',
    'https://www.congregacaocristanobrasil.org.br',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]
};

// ===== SISTEMA DE VERSIONING E ATUALIZAÇÃO =====
class VersionManager {
  constructor() {
    this.currentVersion = SECURITY_CONFIG.APP_VERSION;
    this.lastCheckedVersion = localStorage.getItem('lastCheckedVersion') || this.currentVersion;
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 horas
    this.lastUpdateCheck = localStorage.getItem('lastUpdateCheck') || 0;
  }
  
  // Verificar se há atualizações disponíveis
  async checkForUpdates() {
    const now = Date.now();
    const timeSinceLastCheck = now - parseInt(this.lastUpdateCheck);
    
    // Só verificar se passou o intervalo configurado
    if (timeSinceLastCheck < this.updateCheckInterval) {
      console.log('🔄 Verificação de atualização ainda não necessária');
      return false;
    }
    
    try {
      console.log('🔄 Verificando atualizações...');
      
      // Simular verificação de versão (em produção, isso viria de um endpoint)
      const latestVersion = await this.fetchLatestVersion();
      
      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log('🆕 Nova versão disponível:', latestVersion);
        this.showUpdateAlert(latestVersion);
        return true;
      } else {
        console.log('✅ Aplicação está atualizada');
        this.lastUpdateCheck = now.toString();
        localStorage.setItem('lastUpdateCheck', this.lastUpdateCheck);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar atualizações:', error);
      return false;
    }
  }
  
  // Simular busca da versão mais recente
  async fetchLatestVersion() {
    // Em produção, isso seria uma chamada para um endpoint de versioning
    // Por enquanto, simulamos com uma versão fixa para teste
    return '2.2.0'; // Simular nova versão disponível
  }
  
  // Comparar versões
  isNewerVersion(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return true;
      if (v1Part < v2Part) return false;
    }
    
    return false;
  }
  
  // Mostrar alerta de atualização
  showUpdateAlert(newVersion) {
    // Verificar se já mostrou o alerta para esta versão
    const lastShownVersion = localStorage.getItem('lastShownUpdateVersion');
    if (lastShownVersion === newVersion) {
      console.log('🔄 Alerta de atualização já foi mostrado para esta versão');
      return;
    }
    
    // Criar modal de atualização
    const updateModal = document.createElement('div');
    updateModal.id = 'updateModal';
    updateModal.innerHTML = `
      <div class="modal fade" id="updateModal" tabindex="-1" aria-labelledby="updateModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="updateModalLabel">
                <i class="fas fa-download me-2"></i>Atualização Disponível
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="text-center mb-3">
                <i class="fas fa-rocket fa-3x text-primary mb-3"></i>
                <h4>Nova versão disponível!</h4>
                <p class="text-muted">Versão atual: <strong>${this.currentVersion}</strong></p>
                <p class="text-muted">Nova versão: <strong>${newVersion}</strong></p>
              </div>
              
              <div class="alert alert-info">
                <h6><i class="fas fa-info-circle me-2"></i>O que há de novo:</h6>
                <ul class="mb-0">
                  <li>Melhorias de segurança e performance</li>
                  <li>Correções de bugs</li>
                  <li>Novas funcionalidades</li>
                  <li>Otimizações para mobile</li>
                </ul>
              </div>
              
              <p class="text-center mb-0">
                <strong>Recomendamos atualizar para a melhor experiência!</strong>
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-2"></i>Mais tarde
              </button>
              <button type="button" class="btn btn-primary" id="updateNowBtn">
                <i class="fas fa-download me-2"></i>Atualizar Agora
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(updateModal);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('updateModal'));
    modal.show();
    
    // Event listeners
    document.getElementById('updateNowBtn').addEventListener('click', () => {
      this.performUpdate();
      modal.hide();
    });
    
    // Marcar como mostrado para esta versão
    localStorage.setItem('lastShownUpdateVersion', newVersion);
    localStorage.setItem('lastUpdateCheck', Date.now().toString());
  }
  
  // Executar atualização
  performUpdate() {
    console.log('🔄 Executando atualização...');
    
    // Mostrar loading
    const loadingToast = this.showToast('info', 'Atualizando...', 'Recarregando a aplicação com a nova versão', 0);
    
    // Limpar cache e recarregar
    setTimeout(() => {
      // Limpar cache do service worker se existir
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
      
      // Limpar localStorage de cache
      const keysToKeep = ['session_user', 'session_role', 'session_local', 'theme'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Recarregar página
      window.location.reload(true);
    }, 2000);
  }
  
  // Mostrar toast
  showToast(type, title, message, duration = 4000) {
    if (typeof window.showToast === 'function') {
      return window.showToast(type, title, message, duration);
    } else {
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
      return null;
    }
  }
}

// ===== SISTEMA DE VALIDAÇÃO E SANITIZAÇÃO =====
class SecurityValidator {
  constructor() {
    this.suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /<link[^>]*>.*?<\/link>/gi,
      /<meta[^>]*>.*?<\/meta>/gi,
      /<style[^>]*>.*?<\/style>/gi,
      /<form[^>]*>.*?<\/form>/gi,
      /<input[^>]*>.*?<\/input>/gi,
      /<button[^>]*>.*?<\/button>/gi,
      /<select[^>]*>.*?<\/select>/gi,
      /<textarea[^>]*>.*?<\/textarea>/gi
    ];
  }
  
  // Validar entrada de texto
  validateTextInput(input, fieldName = 'campo') {
    if (!input || typeof input !== 'string') {
      return { valid: false, error: `${fieldName} deve ser uma string válida` };
    }
    
    // Verificar comprimento
    if (input.length > SECURITY_CONFIG.MAX_INPUT_LENGTH) {
      return { 
        valid: false, 
        error: `${fieldName} deve ter no máximo ${SECURITY_CONFIG.MAX_INPUT_LENGTH} caracteres` 
      };
    }
    
    // Verificar padrões suspeitos
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('SUSPICIOUS_INPUT', { field: fieldName, input: input.substring(0, 100) });
        return { 
          valid: false, 
          error: `${fieldName} contém conteúdo não permitido` 
        };
      }
    }
    
    return { valid: true, sanitized: this.sanitizeInput(input) };
  }
  
  // Validar entrada de textarea
  validateTextareaInput(input, fieldName = 'campo') {
    if (!input || typeof input !== 'string') {
      return { valid: false, error: `${fieldName} deve ser uma string válida` };
    }
    
    // Verificar comprimento
    if (input.length > SECURITY_CONFIG.MAX_TEXTAREA_LENGTH) {
      return { 
        valid: false, 
        error: `${fieldName} deve ter no máximo ${SECURITY_CONFIG.MAX_TEXTAREA_LENGTH} caracteres` 
      };
    }
    
    // Verificar padrões suspeitos
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('SUSPICIOUS_INPUT', { field: fieldName, input: input.substring(0, 100) });
        return { 
          valid: false, 
          error: `${fieldName} contém conteúdo não permitido` 
        };
      }
    }
    
    return { valid: true, sanitized: this.sanitizeInput(input) };
  }
  
  // Sanitizar entrada
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Remover caracteres de controle
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Escapar caracteres HTML
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    // Remover espaços extras
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
    
    return sanitized;
  }
  
  // Validar URL
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL deve ser uma string válida' };
    }
    
    try {
      const urlObj = new URL(url);
      
      // Verificar protocolo permitido
      if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
        return { valid: false, error: 'Protocolo não permitido' };
      }
      
      return { valid: true, sanitized: urlObj.toString() };
    } catch (error) {
      return { valid: false, error: 'URL inválida' };
    }
  }
  
  // Validar email
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email deve ser uma string válida' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Formato de email inválido' };
    }
    
    if (email.length > 254) {
      return { valid: false, error: 'Email muito longo' };
    }
    
    return { valid: true, sanitized: email.toLowerCase().trim() };
  }
  
  // Log de eventos de segurança
  logSecurityEvent(eventType, data) {
    if (!SECURITY_CONFIG.LOG_SECURITY_EVENTS) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data: data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('session_user') || 'anonymous'
    };
    
    console.warn('🛡️ Security Event:', event);
    
    // Em produção, enviar para sistema de logging
    this.sendSecurityLog(event);
  }
  
  // Enviar log de segurança
  async sendSecurityLog(event) {
    try {
      // Em produção, isso seria enviado para um endpoint de logging
      console.log('📊 Security log:', event);
    } catch (error) {
      console.error('❌ Erro ao enviar log de segurança:', error);
    }
  }
}

// ===== SISTEMA DE RATE LIMITING =====
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = 60000; // 1 minuto
    this.startCleanup();
  }
  
  // Verificar se pode fazer requisição
  canMakeRequest(identifier = 'default') {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, {
        minuteRequests: new Map(),
        hourRequests: new Map()
      });
    }
    
    const userRequests = this.requests.get(identifier);
    
    // Verificar limite por minuto
    const minuteCount = userRequests.minuteRequests.get(minute) || 0;
    if (minuteCount >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return { allowed: false, reason: 'Rate limit por minuto excedido' };
    }
    
    // Verificar limite por hora
    const hourCount = userRequests.hourRequests.get(hour) || 0;
    if (hourCount >= SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR) {
      return { allowed: false, reason: 'Rate limit por hora excedido' };
    }
    
    // Incrementar contadores
    userRequests.minuteRequests.set(minute, minuteCount + 1);
    userRequests.hourRequests.set(hour, hourCount + 1);
    
    return { allowed: true };
  }
  
  // Limpeza periódica
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000);
      const currentHour = Math.floor(now / 3600000);
      
      this.requests.forEach((userRequests, identifier) => {
        // Limpar dados antigos (mais de 1 hora)
        userRequests.minuteRequests.forEach((count, minute) => {
          if (minute < currentMinute - 60) {
            userRequests.minuteRequests.delete(minute);
          }
        });
        
        userRequests.hourRequests.forEach((count, hour) => {
          if (hour < currentHour - 24) {
            userRequests.hourRequests.delete(hour);
          }
        });
        
        // Remover usuário se não tem requisições recentes
        if (userRequests.minuteRequests.size === 0 && userRequests.hourRequests.size === 0) {
          this.requests.delete(identifier);
        }
      });
    }, this.cleanupInterval);
  }
}

// ===== SISTEMA DE PROTEÇÃO CONTRA ATAQUES =====
class SecurityProtection {
  constructor() {
    this.validator = new SecurityValidator();
    this.rateLimiter = new RateLimiter();
    this.setupProtections();
  }
  
  // Configurar proteções
  setupProtections() {
    // Proteção contra XSS
    this.setupXSSProtection();
    
    // Proteção contra CSRF
    this.setupCSRFProtection();
    
    // Proteção contra clickjacking
    this.setupClickjackingProtection();
    
    // Proteção contra MIME sniffing
    this.setupMIMESniffingProtection();
    
    // Interceptar requisições
    this.setupRequestInterception();
  }
  
  // Proteção contra XSS
  setupXSSProtection() {
    // Interceptar innerHTML
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value) {
        // Verificar se o validator está disponível
        if (window.SecuritySystem && window.SecuritySystem.validator) {
          const sanitized = window.SecuritySystem.validator.sanitizeInput(value);
          originalInnerHTML.set.call(this, sanitized);
        } else {
          // Fallback: usar valor original se validator não estiver disponível
          originalInnerHTML.set.call(this, value);
        }
      },
      get: originalInnerHTML.get
    });
    
    // Interceptar document.write
    const originalWrite = document.write;
    document.write = function(content) {
      // Verificar se o validator está disponível
      if (window.SecuritySystem && window.SecuritySystem.validator) {
        const sanitized = window.SecuritySystem.validator.sanitizeInput(content);
        originalWrite.call(document, sanitized);
      } else {
        // Fallback: usar valor original se validator não estiver disponível
        originalWrite.call(document, content);
      }
    };
  }
  
  // Proteção contra CSRF
  setupCSRFProtection() {
    // Adicionar token CSRF a todas as requisições
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      // Adicionar token CSRF se for requisição POST/PUT/DELETE
      if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (csrfToken) {
          options.headers = {
            ...options.headers,
            'X-CSRF-Token': csrfToken
          };
        }
      }
      
      return originalFetch.call(this, url, options);
    };
  }
  
  // Proteção contra clickjacking
  setupClickjackingProtection() {
    // Verificar se está sendo executado em iframe
    if (window !== window.top) {
      console.warn('🛡️ Tentativa de execução em iframe detectada');
      this.validator.logSecurityEvent('CLICKJACKING_ATTEMPT', {
        referrer: document.referrer,
        location: window.location.href
      });
      
      // Bloquear execução
      document.body.innerHTML = '<h1>Acesso negado</h1><p>Esta aplicação não pode ser executada em iframe.</p>';
      return;
    }
  }
  
  // Proteção contra MIME sniffing
  setupMIMESniffingProtection() {
    // Adicionar header X-Content-Type-Options
    const meta = document.createElement('meta');
    meta.httpEquiv = 'X-Content-Type-Options';
    meta.content = 'nosniff';
    document.head.appendChild(meta);
  }
  
  // Interceptar requisições
  setupRequestInterception() {
    const originalFetch = window.fetch;
    const self = this; // Capturar referência correta
    window.fetch = async function(url, options = {}) {
      // Verificar rate limiting
      const identifier = localStorage.getItem('session_user') || 'anonymous';
      const rateLimitCheck = self.rateLimiter.canMakeRequest(identifier);
      
      if (!rateLimitCheck.allowed) {
        console.warn('🛡️ Rate limit excedido:', rateLimitCheck.reason);
        if (self.validator) {
          self.validator.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            identifier,
            url: url.toString(),
            reason: rateLimitCheck.reason
          });
        }
        
        throw new Error('Rate limit excedido. Tente novamente mais tarde.');
      }
      
      // Validar URL
      const urlValidation = self.validator ? self.validator.validateUrl(url.toString()) : { valid: true, sanitized: url.toString() };
      if (!urlValidation.valid) {
        console.warn('🛡️ URL inválida:', urlValidation.error);
        if (self.validator) {
          self.validator.logSecurityEvent('INVALID_URL', {
            url: url.toString(),
            error: urlValidation.error
          });
        }
        
        throw new Error('URL inválida');
      }
      
      // Adicionar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, SECURITY_CONFIG.REQUEST_TIMEOUT);
      
      try {
        const response = await originalFetch.call(this, urlValidation.sanitized, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError' && self.validator) {
          self.validator.logSecurityEvent('REQUEST_TIMEOUT', {
            url: url.toString(),
            timeout: SECURITY_CONFIG.REQUEST_TIMEOUT
          });
        }
        
        throw error;
      }
    };
  }
}

// ===== INICIALIZAÇÃO =====
function initSecuritySystem() {
  console.log('🛡️ Inicializando sistema de segurança...');
  
  // Inicializar componentes
  const versionManager = new VersionManager();
  const securityProtection = new SecurityProtection();
  
  // Verificar atualizações após 5 segundos
  setTimeout(() => {
    versionManager.checkForUpdates();
  }, 5000);
  
  // Disponibilizar globalmente
  window.SecuritySystem = {
    versionManager,
    securityProtection,
    validator: securityProtection.validator,
    rateLimiter: securityProtection.rateLimiter
  };
  
  console.log('✅ Sistema de segurança inicializado');
}

// ===== EXPORTAR FUNÇÕES =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECURITY_CONFIG,
    VersionManager,
    SecurityValidator,
    RateLimiter,
    SecurityProtection,
    initSecuritySystem
  };
} else {
  // Auto-inicializar se não estiver em modo módulo
  if (typeof window !== 'undefined') {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSecuritySystem);
    } else {
      initSecuritySystem();
    }
  }
}
