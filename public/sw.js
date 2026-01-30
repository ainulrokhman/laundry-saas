const CACHE_NAME = 'kasirlondri-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass through for now, but presence of this listener satisfies PWA criteria
    event.respondWith(fetch(event.request));
});
