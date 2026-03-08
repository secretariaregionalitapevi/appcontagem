// Service Worker para CCB Presença - Versão 2.3 - EMERGÊNCIA
// Cache inteligente com funcionalidades offline avançadas

const CACHE_NAME = 'ccb-presenca-v2.3';
const STATIC_CACHE = 'ccb-static-v2.3';
const DYNAMIC_CACHE = 'ccb-dynamic-v2.3';
const API_CACHE = 'ccb-api-v2.3';
const OFFLINE_QUEUE = 'ccb-offline-queue-v2.3';

// Arquivos essenciais para cache estático
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './app.js',
  './mobile_optimizations.js',
  './ping.json',
  './manifest.json'
  // CDNs removidos - serão carregados dinamicamente com fallbacks
];

// URLs de API que devem ser cacheadas
const API_ENDPOINTS = [
  /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
  /^https:\/\/.*\.supabase\.co\/auth\/v1\//
];

// Configurações de cache
const CACHE_CONFIG = {
  maxEntries: 50,
  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
  purgeOnQuotaError: true
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    // Cache apenas arquivos locais
    caches.open(STATIC_CACHE).then(cache => {
      console.log('📦 Cache estático: Carregando recursos essenciais...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('⚠️ Alguns arquivos não puderam ser cacheados:', err);
        return Promise.resolve();
      });
    }).then(() => {
      console.log('✅ Service Worker: Instalação concluída');
      return self.skipWaiting();
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Ativando...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== CACHE_NAME) {
              console.log(`🗑️ Removendo cache antigo: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Assumir controle de todas as abas
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Ativação concluída');
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 🚨 CORREÇÃO CRÍTICA: Para requisições POST (envio de dados), NUNCA interceptar
  // Deixar passar direto para a rede para garantir que os dados sejam enviados
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH' || request.method === 'DELETE') {
    // Para requisições de escrita, sempre tentar a rede primeiro
    // Se falhar, não cachear - deixar o app lidar com o erro
    event.respondWith(
      fetch(request).catch(error => {
        // Se falhar, retornar erro para que o app possa adicionar à fila offline
        console.log('📴 Requisição POST falhou (offline) - app irá adicionar à fila');
        return new Response(JSON.stringify({
          error: 'Offline',
          message: 'Sem conexão. O registro será salvo na fila offline.',
          offline: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Estratégias de cache baseadas no tipo de requisição (apenas GET)
  if (request.method === 'GET') {
    if (isStaticAsset(request)) {
      event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
      event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
      event.respondWith(handleNavigationRequest(request));
    } else {
      event.respondWith(handleOtherRequest(request));
    }
  }
});

// Verificar se é um recurso estático
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
}

// Verificar se é uma requisição de API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_ENDPOINTS.some(pattern => pattern.test(url.href));
}

// Verificar se é uma requisição de navegação
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Estratégia: Cache First para recursos estáticos
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`📦 Cache hit (estático): ${request.url}`);
      return cachedResponse;
    }
    
    console.log(`🌐 Fetching (estático): ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error(`❌ Erro ao buscar recurso estático: ${request.url}`, error);
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// Estratégia: Network First para APIs
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // 🚨 CORREÇÃO: Reduzir logs para melhorar performance (apenas logs importantes)
    const networkResponse = await fetch(request);
    
    // 🚨 CORREÇÃO CRÍTICA: Não cachear respostas parciais (206) ou com status que não suportam cache
    // A Cache API não suporta cache.put() para respostas 206 (Partial Content)
    if (networkResponse.ok && networkResponse.status !== 206) {
      // Verificar se a resposta é válida para cache (não é partial response)
      const contentType = networkResponse.headers.get('content-type');
      const isPartial = networkResponse.headers.get('content-range') !== null;
      
      // Só cachear se não for resposta parcial e tiver conteúdo válido
      if (!isPartial && networkResponse.status === 200 && contentType && contentType.includes('application/json')) {
        try {
          await cache.put(request, networkResponse.clone());
        } catch (cacheError) {
          // 🚨 CORREÇÃO: Capturar erros de cache silenciosamente para não quebrar o fluxo
          // Não logar todos os erros para evitar spam no console (apenas erros críticos)
          if (cacheError.message && !cacheError.message.includes('206') && !cacheError.message.includes('Partial')) {
            console.warn(`⚠️ Erro ao cachear resposta (ignorado): ${cacheError.message}`);
          }
        }
      }
    }
    
    return networkResponse;
  } catch (error) {
    // 🚨 CORREÇÃO: Reduzir logs para melhorar performance
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar resposta offline para APIs
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Dados não disponíveis offline. Tente novamente quando estiver conectado.',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Estratégia: Network First para navegação, mas SEMPRE retornar app quando offline
async function handleNavigationRequest(request) {
  // 🚨 CORREÇÃO CRÍTICA: Sempre tentar cache primeiro para navegação quando offline
  // Isso garante que o app continue funcionando mesmo sem internet
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match('./index.html');
  
  try {
    console.log(`🌐 Navigation Request: ${request.url}`);
    const networkResponse = await fetch(request);
    
    // Se a resposta da rede for bem-sucedida, cachear e retornar
    if (networkResponse.ok) {
      // Cachear a resposta para uso offline
      cache.put('./index.html', networkResponse.clone()).catch(() => {
        // Ignorar erros de cache silenciosamente
      });
      return networkResponse;
    }
    
    // Se a resposta não for OK mas temos cache, usar cache
    if (cachedResponse) {
      console.log(`📦 Usando cache (resposta não OK): ${request.url}`);
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`📦 Navigation Cache fallback (offline): ${request.url}`);
    
    // 🚨 CORREÇÃO CRÍTICA: SEMPRE retornar o app do cache quando offline
    // Isso permite que o usuário continue cadastrando registros mesmo sem internet
    if (cachedResponse) {
      console.log('✅ Retornando app do cache para funcionamento offline');
      return cachedResponse;
    }
    
    // Se não houver cache, tentar buscar index.html de outras formas
    const indexUrls = ['./index.html', '/index.html', 'index.html', './'];
    for (const url of indexUrls) {
      const altCache = await cache.match(url);
      if (altCache) {
        console.log(`✅ Retornando app do cache (alternativo): ${url}`);
        return altCache;
      }
    }
    
    // Último recurso: retornar uma página mínima que recarrega o app
    return new Response(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>CCB Presença</title>
        <script>
          // Tentar carregar do cache
          caches.open('ccb-static-v2.3').then(cache => {
            cache.match('./index.html').then(response => {
              if (response) {
                response.text().then(html => {
                  document.open();
                  document.write(html);
                  document.close();
                });
              } else {
                window.location.reload();
              }
            });
          });
        </script>
      </head>
      <body>
        <p>Carregando aplicativo...</p>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Estratégia: Stale While Revalidate para outras requisições
async function handleOtherRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      try {
        // 🚨 CORREÇÃO: Não tentar fazer cache de requisições de extensões do Chrome
        // chrome-extension:// não é suportado pela Cache API
        if (request.url && !request.url.startsWith('chrome-extension://') && !request.url.startsWith('moz-extension://')) {
          cache.put(request, networkResponse.clone());
        }
      } catch (error) {
        // 🚨 CORREÇÃO: Não logar erro se for de extensão do Chrome (esperado)
        if (!error.message || !error.message.includes('chrome-extension')) {
          console.error('❌ Erro ao armazenar no cache:', error);
        }
      }
    }
    return networkResponse;
  }).catch((error) => {
    console.error('❌ Erro na requisição de rede:', error);
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Gerenciamento de mensagens
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload.urls).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'STORE_OFFLINE_DATA':
      storeOfflineData(payload.data).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'GET_OFFLINE_DATA':
      getOfflineData().then(data => {
        event.ports[0].postMessage({ data });
      });
      break;
      
    case 'SYNC_OFFLINE_DATA':
      syncOfflineData().then(result => {
        event.ports[0].postMessage({ result });
      });
      break;
  }
});

// Limpar todos os caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('🗑️ Todos os caches foram limpos');
}

// Cachear URLs específicas
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await Promise.allSettled(
    urls.map(url => 
      cache.add(url).catch(err => 
        console.warn(`⚠️ Falha ao cachear: ${url}`, err)
      )
    )
  );
  console.log(`📦 ${urls.length} URLs foram cacheadas`);
}

// Limpeza automática de cache (executada periodicamente)
self.addEventListener('sync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCache());
  }
});

// Limpeza de cache antigo
async function cleanupOldCache() {
  const cacheNames = await caches.keys();
  const now = Date.now();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader) {
        const responseDate = new Date(dateHeader).getTime();
        const age = now - responseDate;
        
        if (age > CACHE_CONFIG.maxAgeSeconds * 1000) {
          await cache.delete(request);
          console.log(`🗑️ Cache expirado removido: ${request.url}`);
        }
      }
    }
  }
}

// Notificações push (para futuras implementações)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver Detalhes',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Funções de sincronização offline
async function storeOfflineData(data) {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const timestamp = Date.now();
    const key = `offline_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    await cache.put(key, new Response(JSON.stringify({
      ...data,
      timestamp,
      id: key
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
    console.log(`📦 Dados offline armazenados: ${key}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao armazenar dados offline:', error);
    return false;
  }
}

async function getOfflineData() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const requests = await cache.keys();
    const offlineData = [];
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        offlineData.push(data);
      }
    }
    
    // Ordena por timestamp
    offlineData.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📦 ${offlineData.length} itens offline encontrados`);
    return offlineData;
  } catch (error) {
    console.error('❌ Erro ao recuperar dados offline:', error);
    return [];
  }
}

async function syncOfflineData() {
  try {
    const offlineData = await getOfflineData();
    const results = [];
    
    for (const item of offlineData) {
      try {
        // Tenta enviar para o servidor
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          // Remove do cache offline se enviado com sucesso
          const cache = await caches.open(OFFLINE_QUEUE);
          await cache.delete(`offline_${item.timestamp}_${item.id.split('_')[2]}`);
          results.push({ id: item.id, status: 'success' });
          console.log(`✅ Dados sincronizados: ${item.id}`);
        } else {
          results.push({ id: item.id, status: 'failed', error: response.statusText });
        }
      } catch (error) {
        results.push({ id: item.id, status: 'failed', error: error.message });
      }
    }
    
    return {
      total: offlineData.length,
      synced: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    };
  } catch (error) {
    console.error('❌ Erro na sincronização offline:', error);
    return { error: error.message };
  }
}

// Sincronização automática quando voltar online
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Intercepta requisições POST para armazenar offline quando necessário
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Intercepta requisições POST que podem falhar offline
  if (request.method === 'POST' && 
      (request.url.includes('/api/submit') || 
       request.url.includes('script.google.com'))) {
    
    event.respondWith(
      fetch(request).catch(async (error) => {
        console.log('📦 Armazenando requisição offline:', request.url);
        
        // Armazena os dados offline
        const requestBody = await request.clone().text();
        const offlineData = {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: requestBody,
          timestamp: Date.now()
        };
        
        await storeOfflineData(offlineData);
        
        // Retorna resposta indicando que foi armazenado offline
        return new Response(JSON.stringify({
          success: false,
          offline: true,
          message: 'Dados armazenados offline. Serão enviados quando a conexão for restabelecida.',
          stored: true
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

console.log('🎵 Service Worker CCB Presença v2.2 carregado com sucesso!');