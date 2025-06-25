self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('youbike-cache-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/YouBike/index.html',
                '/YouBike/main.js',
                '/YouBike/manifest.json',
                '/YouBike/icons/icon-192x192.png',
                '/YouBike/icons/icon-512x512.png',
                '/YouBike/icons/icon.ico',
                '/YouBike/icons/icon.jpg',
                '/YouBike/icons/github.png',
                '/YouBike/icons/github.webp',
                '/YouBike/icons/html.png',
                '/YouBike/icons/html.webp',
                '/YouBike/icons/python.png',
                '/YouBike/icons/python.webp',
                '/YouBike/icons/translate.png',
                '/YouBike/icons/translate.webp',
                '/YouBike/icons/install.png',
                '/YouBike/icons/install.webp',
                'https://unpkg.com/leaflet/dist/leaflet.css',
                'https://unpkg.com/leaflet/dist/leaflet.js',
                'https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js',
                'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css',
                'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css',
                'https://unpkg.com/leaflet/dist/images/marker-icon.png',
                'https://unpkg.com/leaflet/dist/images/marker-icon-2x.png',
                'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
            ]);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', (event) => {
    // 移除針對離線模式的快取機制，直接嘗試網路請求
    event.respondWith(
        fetch(event.request)
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = ['youbike-cache-v1'];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
