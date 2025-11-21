// Script para limpar cache em produção
// Execute este script no console do navegador para forçar atualização

console.log('🧹 Limpando cache do sistema...');

// Limpar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🗑️ Service Worker desregistrado');
    });
  });
}

// Limpar cache do navegador
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log('🗑️ Cache removido:', cacheName);
    });
  });
}

// Limpar localStorage
const keysToRemove = [
  'fila_envio',
  'fila_supabase',
  'offline_queue_v3',
  'cache_nomes_',
  'cache_instrumentos',
  'cache_cargos',
  'cache_comuns'
];

keysToRemove.forEach(key => {
  if (key.endsWith('_')) {
    // Remove chaves que começam com o prefixo
    Object.keys(localStorage).forEach(storageKey => {
      if (storageKey.startsWith(key)) {
        localStorage.removeItem(storageKey);
        console.log('🗑️ localStorage removido:', storageKey);
      }
    });
  } else {
    localStorage.removeItem(key);
    console.log('🗑️ localStorage removido:', key);
  }
});

console.log('✅ Cache limpo! Recarregue a página para aplicar as mudanças.');
