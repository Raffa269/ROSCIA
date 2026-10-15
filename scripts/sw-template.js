const CACHE = 'roscia-static-__VERSION__';
const ASSETS = ['/', '/index.html', '/config.js', '/cloud.js', '/offline.js', '/vendor/supabase.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('roscia-static-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request,copy))); }
    return response;
  }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
