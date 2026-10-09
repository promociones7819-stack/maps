const APP_CACHE = 'traza-bizkaia-shell-v1';
const ORTHO_CACHE = 'ortofoto-euskadi-v1';
const ORTHO_PATH = '/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const response = await fetch('/');
    const html = await response.text();
    await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
    await cache.put('/index.html', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
    const assets = [...html.matchAll(/(?:src|href)="([^\"]*\/assets\/[^\"]+)"/g)].map(match => match[1]);
    await Promise.allSettled(assets.map(async asset => {
      const assetResponse = await fetch(asset);
      if (assetResponse.ok) await cache.put(asset, assetResponse);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

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

  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(APP_CACHE);
        await cache.put('/', response.clone());
        await cache.put('/index.html', response.clone());
        return response;
      } catch {
        const cache = await caches.open(APP_CACHE);
        return (await cache.match(request)) || (await cache.match('/')) || (await cache.match('/index.html'));
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
