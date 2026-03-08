// emergency-fix.js
// Correção de emergência para problemas de MIME types e cache

console.log('🚨 APLICANDO CORREÇÃO DE EMERGÊNCIA...');

// 1. Limpar todos os caches
function clearAllCaches() {
  console.log('🧹 Limpando todos os caches...');
  
  // Limpar localStorage
  try {
    localStorage.clear();
    console.log('✅ localStorage limpo');
  } catch (e) {
    console.warn('⚠️ Erro ao limpar localStorage:', e);
  }
  
  // Limpar sessionStorage
  try {
    sessionStorage.clear();
    console.log('✅ sessionStorage limpo');
  } catch (e) {
    console.warn('⚠️ Erro ao limpar sessionStorage:', e);
  }
  
  // Limpar caches do Service Worker
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('🗑️ Limpando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ Todos os caches limpos');
    }).catch(error => {
      console.error('❌ Erro ao limpar caches:', error);
    });
  }
  
  // Desregistrar Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
        console.log('🗑️ Service Worker desregistrado:', registration.scope);
      });
    });
  }
}

// 2. Forçar recarregamento de recursos
function forceReloadResources() {
  console.log('🔄 Forçando recarregamento de recursos...');
  
  // Adicionar timestamp para forçar recarregamento
  const timestamp = Date.now();
  
  // Lista de recursos críticos
  const criticalResources = [
    'app.js',
    'index.html',
    'static/js/jquery-3.1.1.min.js',
    'static/js/bootstrap.min.js',
    'static/js/toastr.js',
    'static/js/plugins/sweetalert/sweetalert.min.js'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = `${resource}?v=${timestamp}`;
    link.as = resource.endsWith('.js') ? 'script' : 'document';
    document.head.appendChild(link);
  });
}

// 3. Verificar e corrigir MIME types
function checkMimeTypes() {
  console.log('🔍 Verificando MIME types...');
  
  // Verificar se os scripts estão carregando corretamente
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(script => {
    const src = script.src;
    if (src.includes('static/js/')) {
      console.log('📜 Script encontrado:', src);
      
      // Verificar se o script carregou
      script.addEventListener('load', () => {
        console.log('✅ Script carregado:', src);
      });
      
      script.addEventListener('error', () => {
        console.error('❌ Erro ao carregar script:', src);
        
        // Tentar recarregar com timestamp
        const newSrc = `${src}?v=${Date.now()}`;
        console.log('🔄 Tentando recarregar:', newSrc);
        
        const newScript = document.createElement('script');
        newScript.src = newSrc;
        newScript.onload = () => console.log('✅ Script recarregado:', newSrc);
        newScript.onerror = () => console.error('❌ Falha ao recarregar:', newSrc);
        document.head.appendChild(newScript);
      });
    }
  });
}

// 4. Aplicar correções
function applyEmergencyFixes() {
  console.log('🚨 INICIANDO CORREÇÕES DE EMERGÊNCIA...');
  
  // Limpar caches
  clearAllCaches();
  
  // Forçar recarregamento
  forceReloadResources();
  
  // Verificar MIME types
  setTimeout(checkMimeTypes, 1000);
  
  // 🚨 CORREÇÃO: NÃO recarregar automaticamente para evitar loop infinito
  console.log('✅ Correções aplicadas - NÃO recarregando automaticamente');
}

// 5. Executar correções
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyEmergencyFixes);
} else {
  applyEmergencyFixes();
}

// 6. Expor função globalmente para uso manual
window.emergencyFix = applyEmergencyFixes;

console.log('🚨 CORREÇÃO DE EMERGÊNCIA CARREGADA - Execute emergencyFix() se necessário');
