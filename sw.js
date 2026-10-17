// CACHE_VERSION viene riscritto da scripts/publish-page.sh con l'impronta della pagina.
const CACHE_VERSION = 'rassegna-daf70ec049';

const SHELL = [
  './',
  'index.html',
  'js/app.js',
  'js/dom.js',
  'js/store.js',
  'js/sync.js',
  'js/view.js',
  'js/lib/balances.js',
  'js/lib/github.js',
  'js/lib/validate-feed.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))));
});

// Feed: prima la rete, poi la copia salvata. Resto della pagina: prima la cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/feed/')) {
    event.respondWith(fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? Response.error())));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
