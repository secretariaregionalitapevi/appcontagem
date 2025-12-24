const CACHE = 'cadastro-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
});

self.addEventListener('fetch', (e)=>{
  const { request } = e;
  // Cache-first para navegação e assets estáticos
  if (request.mode === 'navigate' || (request.method === 'GET' && ASSETS.some(a => request.url.endsWith(a.replace('./',''))))) {
    e.respondWith(
      caches.match(request).then(resp => resp || fetch(request).then(net => {
        const copy = net.clone();
        caches.open(CACHE).then(c=>c.put(request, copy));
        return net;
      }).catch(()=> caches.match('./index.html')))
    );
  }
});