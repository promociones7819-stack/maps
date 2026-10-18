const ORTHO_CACHE = 'ortofoto-euskadi-v1';
const ORTHO_PATH = '/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/';

// Private web sessions must always reach the server; retain only public map tiles.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('traza-bizkaia-shell'))await caches.delete(key);
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === 'https://www.geo.euskadi.eus' && url.pathname.includes(ORTHO_PATH)) {
    event.respondWith((async () => {
      const cache = await caches.open(ORTHO_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('', { status: 503, statusText: 'Ortofoto no descargada para uso sin conexión' });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) event.respondWith(fetch(request, {cache:'no-store'}));
});
