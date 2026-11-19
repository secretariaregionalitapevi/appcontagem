// Build identity and assets are generated after Expo export on every deployment.
const BUILD_ID = '__PWA_BUILD_ID__';
const CACHE_PREFIX = 'ccb-contagem-build-';
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
const ASSETS = '__PWA_ASSETS__';

self.addEventListener('message', event => {
  if (event.data?.type === 'GET_BUILD_ID') event.ports[0]?.postMessage({ buildId: BUILD_ID });
  // Compatibility with installed clients before 1.5.2.
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let next = 0;
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (next < ASSETS.length) {
            const url = ASSETS[next++];
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (
              !response.ok ||
              (url !== '/index.html' &&
                /text\/html/i.test(response.headers.get('content-type') || ''))
            ) {
              throw new Error('PWA asset unavailable: ' + url);
            }
            await cache.put(url, response);
          }
        })
      );
      // Never activate a half-downloaded release.
      await self.skipWaiting();
    })()
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX));
      const previous = names.filter(name => name !== CACHE_NAME).slice(-1)[0];
      await Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name !== previous)
          .map(name => caches.delete(name))
      );
      // Keep the preceding release for clients finishing forms. No user storage is cleared.
      await self.clients.claim();
    })()
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (['/sw.js', '/release.json'].includes(url.pathname)) return;
  const navigation = request.mode === 'navigate';
  const configuration = url.pathname === '/config.js';
  const asset =
    /^\/(_expo|assets|icons)\//.test(url.pathname) ||
    ['/manifest.json', '/icon.png', '/pwa-update.js'].includes(url.pathname);
  if (!navigation && !configuration && !asset) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(
        navigation ? '/index.html' : configuration ? url.pathname : request,
        { ignoreSearch: configuration }
      );
      // HTML, updater and bundles must belong to the SAME fully installed release.
      if ((asset || navigation) && cached) return cached;
      try {
        const response = await fetch(request);
        if (!response.ok) throw new Error('PWA network response ' + response.status);
        if (
          !navigation &&
          !configuration &&
          /text\/html/i.test(response.headers.get('content-type') || '')
        )
          throw new Error('Invalid asset response');
        event.waitUntil(
          cache.put(
            navigation ? '/index.html' : configuration ? url.pathname : request,
            response.clone()
          )
        );
        return response;
      } catch {
        if (cached) return cached;
        if (navigation) {
          const shell = await cache.match('/index.html');
          if (shell) return shell;
        }
        for (const name of await caches.keys()) {
          if (
            !name.startsWith(CACHE_PREFIX) &&
            !/^(app-presenca|runtime-cache)-v\d+$/.test(name)
          )
            continue;
          const old = await (await caches.open(name)).match(request);
          if (old) return old;
        }
        return Response.error();
      }
    })()
  );
});
