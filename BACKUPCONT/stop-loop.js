// stop-loop.js
// Script para parar o loop infinito de recarregamento

console.log('🚨 PARANDO LOOP INFINITO...');

// 1. Desregistrar Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🗑️ Service Worker desregistrado:', registration.scope);
    });
    console.log('✅ Todos os Service Workers desregistrados');
  });
}

// 2. Limpar caches sem recarregar
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
  });
}

// 3. Limpar localStorage de cache
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

// 4. Limpar sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ sessionStorage limpo');
} catch (e) {
  console.warn('⚠️ Erro ao limpar sessionStorage:', e);
}

console.log('✅ LOOP INFINITO PARADO - Sistema estável');
console.log('💡 Agora você pode recarregar manualmente se necessário');
