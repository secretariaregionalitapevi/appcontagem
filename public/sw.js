const CACHE_NAME = 'ccb-contagem-cache-v5'; // Aumentado para v5
const RUNTIME_CACHE = 'ccb-contagem-runtime-v5';

const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json?v=3',
    '/icon.png?v=3'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Força a pular a espera (atualiza imediatamente)
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[Service Worker] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Ignorar requisições que não sejam GET ou sejam requisições de API (Supabase/Google Sheets)
    if (
        event.request.method !== 'GET' ||
        event.request.url.includes('supabase.co') ||
        event.request.url.includes('script.google.com')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // Se a rede respondeu com sucesso, armazena no cache e retorna
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
        }).catch(() => {
            // Se falhou (offline), busca a versão em cache
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Tratar fallback genérico offline se for navegação
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
