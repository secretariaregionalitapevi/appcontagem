// ===== MOBILE OPTIMIZATIONS FOR CCB PRESENÇA =====
// Sistema otimizado para funcionar perfeitamente no celular como app

console.log('📱 Inicializando otimizações mobile...');

// ===== DETECÇÃO DE DISPOSITIVO MOBILE =====
// Definir variáveis de detecção de dispositivo se não estiverem disponíveis
if (typeof isMobile === 'undefined') {
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
if (typeof isIOS === 'undefined') {
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
if (typeof isAndroid === 'undefined') {
  var isAndroid = /Android/.test(navigator.userAgent);
}
if (typeof isStandalone === 'undefined') {
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true;
}

console.log('📱 Dispositivo detectado:', {
  isMobile,
  isIOS,
  isAndroid,
  isStandalone,
  userAgent: navigator.userAgent
});

// ===== CONFIGURAÇÕES MOBILE ESPECÍFICAS =====
// 🚀 OTIMIZAÇÃO: Configurações unificadas para Android e iOS (mesma performance)
const MOBILE_CONFIG = {
  // 🚨 CORREÇÃO CRÍTICA: Timeout aumentado para 8 segundos (era 2s - muito curto quebrava a lógica)
  CONNECTIVITY_TIMEOUT: 8000, // 8 segundos para ambas as plataformas (timeout muito curto cancelava requisições)
  SYNC_INTERVAL: 15000, // 15 segundos para mobile
  RETRY_ATTEMPTS: 3,
  
  // Configurações de cache
  CACHE_SIZE: 50, // MB
  OFFLINE_STORAGE_LIMIT: 1000, // registros
  
  // Configurações de UI
  TOUCH_TARGET_SIZE: 44, // pixels mínimos para toque
  ANIMATION_DURATION: 200, // ms
  
  // Configurações de rede
  NETWORK_CHECK_INTERVAL: 30000, // 30 segundos (reduzido de 10s)
  OFFLINE_GRACE_PERIOD: 5000, // 5 segundos antes de considerar offline
  
  // Configurações de logging
  LOG_THROTTLE_INTERVAL: 60000, // 1 minuto entre logs repetitivos
  VERBOSE_LOGGING: false // Controle global de logs verbosos
};

// ===== SISTEMA DE CONECTIVIDADE ROBUSTO PARA MOBILE =====
class MobileConnectivityManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.lastOnlineCheck = Date.now();
    this.connectionQuality = 'unknown';
    this.retryCount = 0;
    this.maxRetries = MOBILE_CONFIG.RETRY_ATTEMPTS;
    
    // Sistema de throttling para logs
    this.lastLogTimes = {};
    
    this.init();
  }
  
  init() {
    console.log('🌐 Inicializando gerenciador de conectividade mobile...');
    
    // Event listeners para mudanças de conectividade
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Sincronizar com sistema principal se disponível
    this.syncWithMainSystem();
    
    // Monitoramento contínuo da qualidade da conexão
    this.startConnectionMonitoring();
    
    // Verificação inicial
    this.checkConnectivity();
  }
  
  // Método para throttling de logs
  shouldLog(logKey, interval = MOBILE_CONFIG.LOG_THROTTLE_INTERVAL) {
    if (MOBILE_CONFIG.VERBOSE_LOGGING) return true;
    
    const now = Date.now();
    const lastTime = this.lastLogTimes[logKey] || 0;
    
    if (now - lastTime > interval) {
      this.lastLogTimes[logKey] = now;
      return true;
    }
    
    return false;
  }
  
  syncWithMainSystem() {
    // Aguardar um pouco para o sistema principal ser inicializado
    setTimeout(() => {
      if (typeof window.isOnline !== 'undefined') {
        console.log('🔄 Sincronizando com sistema principal de conectividade...');
        this.isOnline = window.isOnline;
        this.lastOnlineCheck = Date.now();
        
        // Escutar mudanças do sistema principal
        window.addEventListener('connectivityChange', (e) => {
          if (e.detail && typeof e.detail.isOnline !== 'undefined') {
            console.log('🔄 Recebida mudança de conectividade do sistema principal:', e.detail.isOnline);
            this.setOnline(e.detail.isOnline);
          }
        });
      }
    }, 1000);
  }
  
  async checkConnectivity() {
    try {
      // Usar throttling para logs de conectividade
      if (this.shouldLog('connectivity_check', 30000)) {
        console.log('🔍 Verificando conectividade mobile...');
      }
      
      // Se estiver em file://, usar teste básico
      if (window.location.protocol === 'file:') {
        if (this.shouldLog('file_protocol', 60000)) {
          console.log('📁 Protocolo file:// - usando teste básico');
        }
        if (navigator.onLine) {
          this.setOnline(true);
          this.retryCount = 0;
          return true;
        } else {
          this.setOnline(false);
          return false;
        }
      }
      
      // Verificar se o sistema principal de conectividade está funcionando
      if (typeof window.isOnline !== 'undefined' && window.isOnline) {
        console.log('✅ Sistema principal reporta online - usando status principal');
        this.setOnline(true);
        this.retryCount = 0;
        return true;
      }
      
      // Teste simples e rápido para mobile (http/https)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MOBILE_CONFIG.CONNECTIVITY_TIMEOUT);
      
      const response = await fetch('./ping.json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.setOnline(true);
        this.retryCount = 0;
        return true;
      } else {
        this.setOnline(false);
        return false;
      }
      
    } catch (error) {
      console.log('📴 Conectividade mobile falhou:', error.message);
      
      // Se falhar, mas o navegador está online, assumir online
      if (navigator.onLine) {
        console.log('⚠️ Teste falhou, mas navegador online - assumindo conectividade');
        this.setOnline(true);
        return true;
      } else {
        this.setOnline(false);
        return false;
      }
    }
  }
  
  setOnline(status) {
    const wasOnline = this.isOnline;
    this.isOnline = status;
    this.lastOnlineCheck = Date.now();
    
    if (wasOnline !== status) {
      console.log(`🌐 Status de conectividade mudou: ${status ? 'ONLINE' : 'OFFLINE'}`);
      this.notifyStatusChange(status);
      
      if (status && !wasOnline) {
        // Voltou online - tentar sincronizar
        setTimeout(() => this.triggerSync(), 2000);
      }
    }
  }
  
  handleOnline() {
    console.log('🌐 Dispositivo reportou online');
    setTimeout(() => this.checkConnectivity(), 1000);
  }
  
  handleOffline() {
    console.log('📴 Dispositivo reportou offline');
    this.setOnline(false);
  }
  
  startConnectionMonitoring() {
    setInterval(() => {
      this.checkConnectivity();
    }, MOBILE_CONFIG.NETWORK_CHECK_INTERVAL);
  }
  
  notifyStatusChange(isOnline) {
    // Notificar outros componentes do sistema
    window.dispatchEvent(new CustomEvent('connectivityChange', {
      detail: { isOnline, timestamp: Date.now() }
    }));
  }
  
  triggerSync() {
    // Disparar sincronização quando voltar online
    window.dispatchEvent(new CustomEvent('triggerSync', {
      detail: { reason: 'connectivity_restored' }
    }));
  }
  
  async isReallyOnline() {
    // Verificação mais robusta para mobile
    if (!navigator.onLine) return false;
    
    // Se estiver em file://, apenas verificar navigator.onLine
    if (window.location.protocol === 'file:') {
      return navigator.onLine;
    }
    
    try {
      // Usar AbortController para compatibilidade com navegadores mais antigos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MOBILE_CONFIG.CONNECTIVITY_TIMEOUT);
      
      const response = await fetch('./ping.json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch (error) {
      // Se falhar, mas o navegador está online, assumir online
      return navigator.onLine;
    }
  }
}

// ===== SISTEMA DE ARMAZENAMENTO OFFLINE OTIMIZADO =====
class MobileOfflineStorage {
  constructor() {
    this.storageKey = 'ccb_mobile_offline_queue';
    this.maxItems = MOBILE_CONFIG.OFFLINE_STORAGE_LIMIT;
    this.init();
  }
  
  init() {
    console.log('💾 Inicializando armazenamento offline mobile...');
    this.cleanupOldItems();
  }
  
  // Adicionar item à fila offline
  addItem(data) {
    try {
      const queue = this.getQueue();
      
      // Verificar limite
      if (queue.length >= this.maxItems) {
        console.warn('⚠️ Limite de armazenamento offline atingido, removendo item mais antigo');
        queue.shift(); // Remove o mais antigo
      }
      
      const item = {
        id: this.generateId(),
        data: data,
        timestamp: Date.now(),
        attempts: 0,
        synced: false,
        device: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: typeof isMobile !== 'undefined' ? isMobile : false,
        isIOS: typeof isIOS !== 'undefined' ? isIOS : false,
        isAndroid: typeof isAndroid !== 'undefined' ? isAndroid : false
        }
      };
      
      queue.push(item);
      this.saveQueue(queue);
      
      console.log('💾 Item adicionado à fila offline mobile:', item);
      this.updateUI();
      
      return item.id;
      
    } catch (error) {
      console.error('❌ Erro ao adicionar item offline:', error);
      return null;
    }
  }
  
  // Obter fila de itens offline
  getQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Erro ao ler fila offline:', error);
      return [];
    }
  }
  
  // Salvar fila de itens offline
  saveQueue(queue) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(queue));
      this.updateUI();
    } catch (error) {
      console.error('❌ Erro ao salvar fila offline:', error);
    }
  }
  
  // Marcar item como sincronizado
  markAsSynced(itemId) {
    const queue = this.getQueue();
    const item = queue.find(i => i.id === itemId);
    
    if (item) {
      item.synced = true;
      item.syncedAt = Date.now();
      this.saveQueue(queue);
      console.log('✅ Item marcado como sincronizado na fila mobile:', itemId);
    }
    
    // Também marcar na fila principal se disponível
    if (typeof window.getOfflineQueue === 'function' && typeof window.setOfflineQueue === 'function') {
      try {
        const mainQueue = window.getOfflineQueue();
        const mainItem = mainQueue.find(i => i.id === itemId);
        
        if (mainItem) {
          mainItem.synced = true;
          mainItem.syncedAt = Date.now();
          window.setOfflineQueue(mainQueue);
          console.log('✅ Item marcado como sincronizado na fila principal:', itemId);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao marcar item na fila principal:', error);
      }
    }
  }
  
  // Obter itens pendentes de sincronização
  getPendingItems() {
    const mobileQueue = this.getQueue().filter(item => !item.synced);
    
    // Também verificar fila principal se disponível
    if (typeof window.getOfflineQueue === 'function') {
      try {
        const mainQueue = window.getOfflineQueue().filter(item => !item.synced);
        
        // Usar throttling para logs de filas
        if (this.shouldLog('queue_status', 60000)) {
          console.log(`📊 Filas encontradas: Mobile: ${mobileQueue.length}, Principal: ${mainQueue.length}`);
        }
        
        // Se a fila principal tem itens, usar ela
        if (mainQueue.length > 0) {
          if (this.shouldLog('using_main_queue', 60000)) {
            console.log('🔄 Usando fila principal para sincronização');
          }
          return mainQueue;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao verificar fila principal:', error);
      }
    }
    
    return mobileQueue;
  }
  
  // Método para throttling de logs (reutilizar da classe principal)
  shouldLog(logKey, interval = MOBILE_CONFIG.LOG_THROTTLE_INTERVAL) {
    if (MOBILE_CONFIG.VERBOSE_LOGGING) return true;
    
    const now = Date.now();
    const lastTime = this.lastLogTimes = this.lastLogTimes || {};
    const lastLogTime = lastTime[logKey] || 0;
    
    if (now - lastLogTime > interval) {
      lastTime[logKey] = now;
      return true;
    }
    
    return false;
  }
  
  // Limpar itens antigos
  cleanupOldItems() {
    const queue = this.getQueue();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
    
    const cleanedQueue = queue.filter(item => {
      const age = now - item.timestamp;
      return age < maxAge;
    });
    
    if (cleanedQueue.length !== queue.length) {
      this.saveQueue(cleanedQueue);
      console.log(`🧹 Limpeza offline: ${queue.length - cleanedQueue.length} itens removidos`);
    }
  }
  
  // Gerar ID único
  generateId() {
    return `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Atualizar UI com status da fila
  updateUI() {
    const pendingCount = this.getPendingItems().length;
    
    // Atualizar contador na UI
    const queueElement = document.getElementById('queue-count');
    if (queueElement) {
      queueElement.textContent = pendingCount;
    }
    
    // Atualizar status visual
    const statusElement = document.getElementById('queue-status');
    if (statusElement) {
      if (pendingCount === 0) {
        statusElement.textContent = '✓';
        statusElement.className = 'queue-badge empty';
      } else {
        statusElement.textContent = '⏳';
        statusElement.className = 'queue-badge pending';
      }
    }
    
    console.log(`📊 Fila offline: ${pendingCount} itens pendentes`);
  }
  
  // Limpar toda a fila
  clearQueue() {
    localStorage.removeItem(this.storageKey);
    this.updateUI();
    console.log('🗑️ Fila offline limpa');
  }
}

// ===== SISTEMA DE SINCRONIZAÇÃO MOBILE =====
class MobileSyncManager {
  constructor(connectivityManager, offlineStorage) {
    this.connectivityManager = connectivityManager;
    this.offlineStorage = offlineStorage;
    this.isSyncing = false;
    this.syncInterval = null;
    
    // Sistema de throttling para logs
    this.lastLogTimes = {};
    
    this.init();
  }
  
  init() {
    console.log('🔄 Inicializando gerenciador de sincronização mobile...');
    
    // Event listeners
    window.addEventListener('triggerSync', () => this.sync());
    window.addEventListener('connectivityChange', (e) => {
      if (e.detail.isOnline) {
        setTimeout(() => this.sync(), 2000);
      }
    });
    
    // Sincronização automática
    this.startAutoSync();
  }
  
  // Método para throttling de logs
  shouldLog(logKey, interval = MOBILE_CONFIG.LOG_THROTTLE_INTERVAL) {
    if (MOBILE_CONFIG.VERBOSE_LOGGING) return true;
    
    const now = Date.now();
    const lastTime = this.lastLogTimes[logKey] || 0;
    
    if (now - lastTime > interval) {
      this.lastLogTimes[logKey] = now;
      return true;
    }
    
    return false;
  }
  
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.connectivityManager.isOnline) {
        this.sync();
      }
    }, MOBILE_CONFIG.SYNC_INTERVAL);
    
    console.log('🔄 Sincronização automática iniciada');
  }
  
  async sync() {
    if (this.isSyncing) {
      if (this.shouldLog('sync_in_progress', 30000)) {
        console.log('⏳ Sincronização já em andamento');
      }
      return;
    }
    
    const pendingItems = this.offlineStorage.getPendingItems();
    if (pendingItems.length === 0) {
      if (this.shouldLog('no_pending_items', 60000)) {
        console.log('📭 Nenhum item pendente para sincronizar');
      }
      return;
    }
    
    // Verificar se o sistema principal está sincronizando
    if (typeof window.syncPending === 'function') {
      console.log('🔄 Sistema principal está sincronizando - aguardando...');
      // Aguardar um pouco e tentar novamente
      setTimeout(() => this.sync(), 5000);
      return;
    }
    
    // Verificar conectividade real
    const isReallyOnline = await this.connectivityManager.isReallyOnline();
    if (!isReallyOnline) {
      console.log('📴 Sem conectividade real - pulando sincronização');
      return;
    }
    
    this.isSyncing = true;
    console.log(`🔄 Iniciando sincronização mobile de ${pendingItems.length} itens...`);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const item of pendingItems) {
        try {
          const success = await this.syncItem(item);
          if (success) {
            this.offlineStorage.markAsSynced(item.id);
            successCount++;
            console.log(`✅ Item sincronizado: ${item.id}`);
          } else {
            item.attempts = (item.attempts || 0) + 1;
            failCount++;
            console.log(`❌ Falha ao sincronizar item: ${item.id}`);
          }
          
          // Pausa entre envios para evitar sobrecarga
          await this.delay(1000);
          
        } catch (error) {
          console.error(`❌ Erro ao sincronizar item ${item.id}:`, error);
          item.attempts = (item.attempts || 0) + 1;
          failCount++;
        }
      }
      
      // Salvar fila atualizada
      this.offlineStorage.saveQueue(this.offlineStorage.getQueue());
      
      console.log(`✅ Sincronização mobile concluída: ${successCount} sucessos, ${failCount} falhas`);
      
      if (successCount > 0) {
        this.showSyncNotification(`${successCount} item(s) sincronizado(s)`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro durante sincronização mobile:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  async syncItem(item) {
    try {
      console.log('📤 Enviando item mobile:', item.data);
      
      // Tentar usar o sistema principal se disponível
      if (typeof window.sendToGoogleSheets === 'function') {
        console.log('🔄 Usando sistema principal para envio...');
        try {
          await window.sendToGoogleSheets(item.data);
          return true;
        } catch (error) {
          console.log('⚠️ Sistema principal falhou, tentando método alternativo...');
        }
      }
      
      // Método alternativo usando fetch direto
      const response = await fetch('./app.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_offline_item',
          data: item.data
        })
      });
      
      return response.ok;
      
    } catch (error) {
      console.error('❌ Erro ao enviar item mobile:', error);
      return false;
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  showSyncNotification(message, type = 'info') {
    // Implementar notificação visual
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Se SweetAlert2 estiver disponível
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 2000
      });
    }
  }
}

// ===== OTIMIZAÇÕES DE UI PARA MOBILE =====
class MobileUIOptimizer {
  constructor() {
    this.init();
  }
  
  init() {
    console.log('🎨 Inicializando otimizações de UI mobile...');
    
    this.optimizeTouchTargets();
    this.optimizeViewport();
    this.addMobileStyles();
    this.handleOrientationChange();
  }
  
  optimizeTouchTargets() {
    // Garantir que todos os elementos clicáveis tenham tamanho mínimo
    const touchTargets = document.querySelectorAll('button, a, input[type="radio"], input[type="checkbox"]');
    
    touchTargets.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width < MOBILE_CONFIG.TOUCH_TARGET_SIZE || rect.height < MOBILE_CONFIG.TOUCH_TARGET_SIZE) {
        element.style.minWidth = `${MOBILE_CONFIG.TOUCH_TARGET_SIZE}px`;
        element.style.minHeight = `${MOBILE_CONFIG.TOUCH_TARGET_SIZE}px`;
      }
    });
  }
  
  optimizeViewport() {
    // Otimizar viewport para mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }
  }
  
  addMobileStyles() {
    // Adicionar estilos específicos para mobile
    const style = document.createElement('style');
    style.textContent = `
      /* Otimizações mobile */
      @media (max-width: 768px) {
        body {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        button, a, input {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        /* Melhorar legibilidade em telas pequenas */
        .form-control, .btn {
          font-size: 16px; /* Evita zoom no iOS */
        }
        
        /* Espaçamento otimizado para toque */
        .btn {
          padding: 12px 16px;
          margin: 4px 0;
        }
        
        /* Status bar para PWA */
        .status-bar {
          height: env(safe-area-inset-top);
          background: var(--primary);
        }
      }
      
      /* Modo standalone (PWA) */
      @media (display-mode: standalone) {
        body {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  handleOrientationChange() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.optimizeTouchTargets();
        console.log('📱 Orientação alterada - otimizações aplicadas');
      }, 100);
    });
  }
}

// ===== INICIALIZAÇÃO DO SISTEMA MOBILE =====
class MobileAppManager {
  constructor() {
    this.connectivityManager = null;
    this.offlineStorage = null;
    this.syncManager = null;
    this.uiOptimizer = null;
    
    this.init();
  }
  
  async init() {
    console.log('📱 Inicializando sistema mobile CCB Presença...');
    
    try {
      // Inicializar componentes
      this.connectivityManager = new MobileConnectivityManager();
      this.offlineStorage = new MobileOfflineStorage();
      this.syncManager = new MobileSyncManager(this.connectivityManager, this.offlineStorage);
      this.uiOptimizer = new MobileUIOptimizer();
      
      // Configurar Service Worker
      await this.setupServiceWorker();
      
      // Configurar PWA
      this.setupPWA();
      
      // Expor APIs globais
      this.exposeGlobalAPIs();
      
      console.log('✅ Sistema mobile inicializado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar sistema mobile:', error);
    }
  }
  
  async setupServiceWorker() {
    // Verificar se não está em protocolo file://
    if (window.location.protocol === 'file:') {
      console.log('📁 Protocolo file:// detectado - Service Worker não suportado');
      return;
    }
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('✅ Service Worker registrado:', registration);
        
        // Aguardar ativação
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ativo');
        
      } catch (error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      }
    } else {
      console.log('⚠️ Service Worker não suportado neste navegador');
    }
  }
  
  setupPWA() {
    // Detectar se está rodando como PWA
    if (typeof isStandalone !== 'undefined' && isStandalone) {
      console.log('📱 Executando como PWA');
      document.body.classList.add('pwa-mode');
    }
    
    // Configurar instalação
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('📱 PWA pode ser instalado');
    });
    
    // Expor função de instalação
    window.installPWA = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('✅ PWA instalado');
          }
          deferredPrompt = null;
        });
      }
    };
  }
  
  exposeGlobalAPIs() {
    // Expor APIs para uso global
    window.MobileApp = {
      connectivity: this.connectivityManager,
      offline: this.offlineStorage,
      sync: this.syncManager,
      ui: this.uiOptimizer,
      
      // Métodos utilitários
      isOnline: () => this.connectivityManager.isOnline,
      addOfflineItem: (data) => this.offlineStorage.addItem(data),
      syncNow: () => this.syncManager.sync(),
      clearOfflineQueue: () => this.offlineStorage.clearQueue(),
      
      // Métodos de diagnóstico
      getStatus: () => ({
        isOnline: this.connectivityManager.isOnline,
        pendingItems: this.offlineStorage.getPendingItems().length,
        isSyncing: this.syncManager.isSyncing,
        lastCheck: this.connectivityManager.lastOnlineCheck
      }),
      
      // Método para forçar verificação de conectividade
      forceConnectivityCheck: () => this.connectivityManager.checkConnectivity()
    };
    
    // Integrar com sistema principal se disponível
    if (typeof window.addToOfflineQueue === 'function') {
      console.log('🔄 Integrando com sistema principal de fila offline...');
      // Sobrescrever função global para usar sistema mobile também
      const originalAddToOfflineQueue = window.addToOfflineQueue;
      window.addToOfflineQueue = function(data) {
        // Usar sistema principal
        const result = originalAddToOfflineQueue(data);
        // Também adicionar ao sistema mobile
        window.MobileApp.addOfflineItem(data);
        return result;
      };
    }
    
    console.log('🌐 APIs mobile expostas globalmente');
  }
}

// ===== INICIALIZAÇÃO AUTOMÁTICA =====
document.addEventListener('DOMContentLoaded', () => {
  // Só inicializar sistema mobile se for realmente um dispositivo mobile
  if (typeof isMobile !== 'undefined' && isMobile) {
    console.log('📱 DOM carregado - iniciando sistema mobile...');
    
    // Aguardar um pouco para garantir que tudo foi carregado
    setTimeout(() => {
      new MobileAppManager();
    }, 100);
  } else {
    console.log('🖥️ Dispositivo desktop detectado - sistema mobile não inicializado');
  }
});

// ===== EXPORTAR PARA USO GLOBAL =====
window.MobileOptimizations = {
  MobileConnectivityManager,
  MobileOfflineStorage,
  MobileSyncManager,
  MobileUIOptimizer,
  MobileAppManager,
  MOBILE_CONFIG,
  
  // Métodos utilitários
  enableVerboseLogging: () => {
    MOBILE_CONFIG.VERBOSE_LOGGING = true;
    console.log('📱 Logs verbosos mobile ativados');
  },
  
  disableVerboseLogging: () => {
    MOBILE_CONFIG.VERBOSE_LOGGING = false;
    console.log('📱 Logs verbosos mobile desativados');
  },
  
  getStatus: () => ({
    isMobile: typeof isMobile !== 'undefined' ? isMobile : false,
    verboseLogging: MOBILE_CONFIG.VERBOSE_LOGGING,
    networkCheckInterval: MOBILE_CONFIG.NETWORK_CHECK_INTERVAL,
    logThrottleInterval: MOBILE_CONFIG.LOG_THROTTLE_INTERVAL
  })
};

console.log('📱 Módulo de otimizações mobile carregado!');