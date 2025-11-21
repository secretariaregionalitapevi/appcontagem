// ========================================
// CORREÇÕES PARA DEPLOY EM PRODUÇÃO
// Sistema de Registro de Presença CCB
// ========================================

console.log('🚀 Aplicando correções para deploy em produção...');

// ========================================
// CONFIGURAÇÕES DE PRODUÇÃO
// ========================================
const PRODUCTION_CONFIG = {
  // Timeouts otimizados para produção
  CONNECTIVITY_TIMEOUT: 5000,
  API_TIMEOUT: 10000,
  
  // Configurações de cache
  CACHE_STRATEGY: 'network-first',
  
  // Fallbacks para CDNs
  CDN_FALLBACKS: {
    'bootstrap': [
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css'
    ],
    'supabase': [
      'https://unpkg.com/@supabase/supabase-js@2',
      'https://cdnjs.cloudflare.com/ajax/libs/supabase/2.38.0/supabase.min.js'
    ],
    'sweetalert': [
      'https://cdn.jsdelivr.net/npm/sweetalert2@11',
      'https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/11.7.32/sweetalert2.min.js'
    ]
  }
};

// ========================================
// FUNÇÃO PARA VERIFICAR AMBIENTE
// ========================================
function detectEnvironment() {
  const isFileProtocol = window.location.protocol === 'file:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isHTTPS = window.location.protocol === 'https:';
  const isProduction = !isFileProtocol && !isLocalhost && isHTTPS;
  
  console.log('🔍 Ambiente detectado:', {
    isFileProtocol,
    isLocalhost,
    isHTTPS,
    isProduction,
    hostname: window.location.hostname
  });
  
  return { isFileProtocol, isLocalhost, isHTTPS, isProduction };
}

// ========================================
// FUNÇÃO PARA CARREGAR CDNs COM FALLBACKS
// ========================================
function loadCDNWithFallback(url, fallbackUrl, type = 'script') {
  return new Promise((resolve, reject) => {
    const element = document.createElement(type === 'script' ? 'script' : 'link');
    
    if (type === 'script') {
      element.src = url;
    } else {
      element.href = url;
      element.rel = 'stylesheet';
    }
    
    element.onload = () => {
      console.log(`✅ CDN carregado: ${url}`);
      resolve();
    };
    
    element.onerror = () => {
      console.warn(`⚠️ CDN falhou, tentando fallback: ${url}`);
      const fallbackElement = document.createElement(type === 'script' ? 'script' : 'link');
      
      if (type === 'script') {
        fallbackElement.src = fallbackUrl;
      } else {
        fallbackElement.href = fallbackUrl;
        fallbackElement.rel = 'stylesheet';
      }
      
      fallbackElement.onload = () => {
        console.log(`✅ Fallback carregado: ${fallbackUrl}`);
        resolve();
      };
      
      fallbackElement.onerror = () => {
        console.error(`❌ Ambos CDN e fallback falharam: ${url}`);
        reject(new Error('CDN e fallback falharam'));
      };
      
      document.head.appendChild(fallbackElement);
    };
    
    document.head.appendChild(element);
  });
}

// ========================================
// FUNÇÃO PARA VERIFICAR CONECTIVIDADE ROBUSTA
// ========================================
async function checkConnectivityRobust() {
  const { isProduction } = detectEnvironment();
  
  try {
    // Verificação básica
    if (!navigator.onLine) {
      console.log('📴 Navegador reporta offline');
      return false;
    }
    
    // Em produção, usar verificação mais robusta
    if (isProduction) {
      console.log('🌐 Verificação robusta de conectividade em produção...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PRODUCTION_CONFIG.CONNECTIVITY_TIMEOUT);
      
      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);
        console.log('✅ Conectividade confirmada em produção');
        return true;
      } catch (error) {
        clearTimeout(timeoutId);
        console.log('❌ Falha na verificação de conectividade:', error.message);
        return false;
      }
    }
    
    // Verificação padrão para desenvolvimento
    return navigator.onLine;
    
  } catch (error) {
    console.error('❌ Erro na verificação de conectividade:', error);
    return false;
  }
}

// ========================================
// FUNÇÃO PARA CONFIGURAR SERVICE WORKER
// ========================================
function configureServiceWorker() {
  const { isProduction, isFileProtocol } = detectEnvironment();
  
  if (isFileProtocol) {
    console.log('ℹ️ Protocolo file:// - Service Worker desabilitado');
    return;
  }
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration);
        
        // Em produção, forçar atualização
        if (isProduction) {
          registration.update();
        }
      })
      .catch(error => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  }
}

// ========================================
// FUNÇÃO PARA CONFIGURAR CACHE
// ========================================
function configureCache() {
  const { isProduction } = detectEnvironment();
  
  if (isProduction) {
    console.log('🌐 Configurando cache para produção...');
    
    // Limpar cache antigo
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('ccb-presenca') && !cacheName.includes('v2.1')) {
            console.log(`🗑️ Removendo cache antigo: ${cacheName}`);
            caches.delete(cacheName);
          }
        });
      });
    }
  }
}

// ========================================
// FUNÇÃO PARA CONFIGURAR PWA
// ========================================
function configurePWA() {
  const { isProduction, isFileProtocol } = detectEnvironment();
  
  if (isFileProtocol) {
    console.log('ℹ️ Protocolo file:// - PWA desabilitado');
    return;
  }
  
  // Configurar manifest
  if (isProduction) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = './manifest.json';
    document.head.appendChild(manifestLink);
    console.log('✅ PWA Manifest configurado para produção');
  }
}

// ========================================
// FUNÇÃO PARA CONFIGURAR FALLBACKS
// ========================================
async function configureFallbacks() {
  const { isProduction } = detectEnvironment();
  
  if (isProduction) {
    console.log('🛡️ Configurando fallbacks para produção...');
    
    try {
      // Carregar Bootstrap com fallback
      await loadCDNWithFallback(
        PRODUCTION_CONFIG.CDN_FALLBACKS.bootstrap[0],
        PRODUCTION_CONFIG.CDN_FALLBACKS.bootstrap[1],
        'link'
      );
      
      // Carregar Supabase com fallback
      await loadCDNWithFallback(
        PRODUCTION_CONFIG.CDN_FALLBACKS.supabase[0],
        PRODUCTION_CONFIG.CDN_FALLBACKS.supabase[1],
        'script'
      );
      
      console.log('✅ Fallbacks configurados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao configurar fallbacks:', error);
    }
  }
}

// ========================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ========================================
async function initializeProduction() {
  console.log('🚀 Inicializando sistema para produção...');
  
  try {
    // 1. Detectar ambiente
    const environment = detectEnvironment();
    
    // 2. Configurar Service Worker
    configureServiceWorker();
    
    // 3. Configurar cache
    configureCache();
    
    // 4. Configurar PWA
    configurePWA();
    
    // 5. Configurar fallbacks
    await configureFallbacks();
    
    // 6. Verificar conectividade
    const isOnline = await checkConnectivityRobust();
    console.log('🌐 Status de conectividade:', isOnline ? 'Online' : 'Offline');
    
    console.log('✅ Sistema inicializado para produção com sucesso!');
    
    return {
      environment,
      isOnline,
      config: PRODUCTION_CONFIG
    };
    
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    throw error;
  }
}

// ========================================
// EXPORTAR FUNÇÕES
// ========================================
window.ProductionDeploy = {
  initialize: initializeProduction,
  checkConnectivity: checkConnectivityRobust,
  loadCDNWithFallback,
  detectEnvironment,
  config: PRODUCTION_CONFIG
};

// ========================================
// AUTO-INICIALIZAÇÃO
// ========================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProduction);
} else {
  initializeProduction();
}

console.log('🎵 Deploy Fix v1.0 carregado com sucesso!');
