const CACHE_NAME = "pwa-contagem-v22-mobile";
const ASSETS = [
  "./",
  "./index.html", 
  "./app.js?v=23",
  "./manifest.json",
  "./ping.json"
];

// Instalar Service Worker
self.addEventListener("install", e => {
  console.log("Service Worker: Instalando...");
  self.skipWaiting();
  
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Service Worker: Cache aberto");
        // Para iOS, adicionar assets um por vez para melhor compatibilidade
        return Promise.all(ASSETS.map(asset => {
          return cache.add(asset).catch(error => {
            console.warn(`Service Worker: Falha ao cachear ${asset}:`, error);
            return null; // Continuar mesmo se um asset falhar
          });
        }));
      })
      .then(() => {
        console.log("Service Worker: Instalado com sucesso");
      })
      .catch(error => {
        console.error("Service Worker: Erro ao instalar:", error);
      })
  );
});

// Ativar Service Worker
self.addEventListener("activate", e => {
  console.log("Service Worker: Ativando...");
  
  e.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Removendo cache antigo:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Assumir controle imediatamente
      self.clients.claim()
    ])
  );
});

// Interceptar requisições
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  
  // Para ping.json, sempre tentar a rede primeiro
  if (url.pathname.endsWith("/ping.json")) {
    e.respondWith(
      fetch(e.request)
        .catch(() => {
          // Se falhar, retornar resposta offline
          return new Response('{"ok": false}', {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // Para requisições POST (envio de dados), NÃO interceptar - deixar passar direto
  if (e.request.method === 'POST') {
    console.log("Service Worker: Deixando requisição POST passar direto");
    return; // Não interceptar requisições POST
  }
  
  // Para requisições GET, usar cache-first
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request)
        .then(response => {
          if (response) {
            return response;
          }
          
          // Se não estiver no cache, buscar na rede
          return fetch(e.request)
            .then(response => {
              // Verificar se a resposta é válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonar a resposta para o cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(e.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // Se for uma página HTML e falhar, retornar a página offline
              if (e.request.destination === 'document') {
                return caches.match('./index.html');
              }
            });
        })
    );
  }
});

// Mensagens do cliente
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("Service Worker: Carregado");
