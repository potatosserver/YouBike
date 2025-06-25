self.addEventListener('install', (event) => {
    // Skip waiting immediately to activate the new service worker
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Simply fetch from the network, no caching
    event.respondWith(fetch(event.request));
});

self.addEventListener('activate', (event) => {
    // Delete all old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});
