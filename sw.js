const CACHE_NAME = 'cadastro-cache-v4';
const RUNTIME_CACHE = 'cadastro-runtime-v4';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json?v=2',
  './assets/icon.png?v=2',
  './assets/favicon.png?v=2'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting()) // Ativar imediatamente
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
      .then(() => self.clients.claim()) // Assumir controle imediatamente
  );
});

// Estratégia de cache: Network-first com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET e requisições de API (devem sempre ir para rede)
  if (request.method !== 'GET') {
    return; // Deixar passar direto para rede
  }

  // Para assets estáticos: Cache-first
  if (ASSETS.some(asset => request.url.endsWith(asset.replace('./', '')))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              // Verificar se resposta é válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              // Clonar resposta para cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
              return response;
            })
            .catch(() => {
              // Fallback para index.html se for navegação
              if (request.mode === 'navigate') {
                return caches.match('./index.html');
              }
            });
        })
    );
    return;
  }

  // Para navegação: Network-first com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear resposta de navegação
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // Fallback para cache ou index.html
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('./index.html');
            });
        })
    );
    return;
  }

  // Para outras requisições: Network-first (APIs sempre tentam rede primeiro)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cachear apenas respostas válidas de GET
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Fallback para cache apenas se disponível
        return caches.match(request);
      })
  );
});

// Listener para mensagens do cliente (para sincronização)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});