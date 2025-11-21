// clear-cache-emergency.js
// Script de limpeza de cache de emergência para resolver problemas online

console.log('🚨 LIMPEZA DE CACHE DE EMERGÊNCIA INICIADA...');

// 1. Limpar todos os tipos de cache
function clearAllCaches() {
  console.log('🧹 Limpando todos os caches...');
  
  // Limpar localStorage
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('cache') || key.includes('sent_records') || key.includes('offline')) {
        localStorage.removeItem(key);
        console.log('🗑️ Removido do localStorage:', key);
      }
    });
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
      console.log('🔍 Caches encontrados:', cacheNames);
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('🗑️ Limpando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ Todos os caches do Service Worker limpos');
    }).catch(error => {
      console.error('❌ Erro ao limpar caches:', error);
    });
  }
  
  // Desregistrar Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('🔍 Service Workers encontrados:', registrations.length);
      registrations.forEach(registration => {
        registration.unregister();
        console.log('🗑️ Service Worker desregistrado:', registration.scope);
      });
      console.log('✅ Todos os Service Workers desregistrados');
    }).catch(error => {
      console.error('❌ Erro ao desregistrar Service Workers:', error);
    });
  }
}

// 2. Forçar recarregamento de recursos com timestamp
function forceReloadResources() {
  console.log('🔄 Forçando recarregamento de recursos...');
  
  const timestamp = Date.now();
  
  // Lista de recursos críticos que podem estar com problemas
  const criticalResources = [
    'app.js',
    'index.html',
    'static/js/jquery-3.1.1.min.js',
    'static/js/bootstrap.min.js',
    'static/js/toastr.js',
    'static/js/plugins/sweetalert/sweetalert.min.js',
    'emergency-fix.js'
  ];
  
  // Adicionar preload para forçar recarregamento
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = `${resource}?v=${timestamp}`;
    link.as = resource.endsWith('.js') ? 'script' : 'document';
    document.head.appendChild(link);
    console.log('🔄 Preload adicionado:', resource);
  });
}

// 3. Verificar e corrigir scripts com problemas
function fixScripts() {
  console.log('🔧 Verificando e corrigindo scripts...');
  
  const scripts = document.querySelectorAll('script[src]');
  let fixedCount = 0;
  
  scripts.forEach(script => {
    const src = script.src;
    if (src.includes('static/js/') || src.includes('app.js')) {
      console.log('📜 Verificando script:', src);
      
      // Verificar se o script carregou corretamente
      if (!script.textContent && !script.innerHTML) {
        console.log('⚠️ Script vazio detectado:', src);
        
        // Tentar recarregar com timestamp
        const newSrc = `${src}?v=${Date.now()}`;
        console.log('🔄 Tentando recarregar:', newSrc);
        
        const newScript = document.createElement('script');
        newScript.src = newSrc;
        newScript.onload = () => {
          console.log('✅ Script recarregado com sucesso:', newSrc);
          fixedCount++;
        };
        newScript.onerror = () => {
          console.error('❌ Falha ao recarregar script:', newSrc);
        };
        document.head.appendChild(newScript);
      } else {
        console.log('✅ Script OK:', src);
      }
    }
  });
  
  console.log(`🔧 Scripts verificados. ${fixedCount} scripts recarregados.`);
}

// 4. Aplicar todas as correções
function applyEmergencyFixes() {
  console.log('🚨 APLICANDO CORREÇÕES DE EMERGÊNCIA...');
  
  // Limpar caches
  clearAllCaches();
  
  // Forçar recarregamento
  forceReloadResources();
  
  // Corrigir scripts
  setTimeout(fixScripts, 1000);
  
  // 🚨 CORREÇÃO: NÃO recarregar automaticamente para evitar loop infinito
  console.log('✅ Limpeza de cache concluída - NÃO recarregando automaticamente');
}

// 5. Executar automaticamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyEmergencyFixes);
} else {
  applyEmergencyFixes();
}

// 6. Expor função globalmente
window.clearCacheEmergency = applyEmergencyFixes;

console.log('🚨 SCRIPT DE LIMPEZA DE CACHE CARREGADO');
console.log('💡 Execute clearCacheEmergency() para limpeza manual');
