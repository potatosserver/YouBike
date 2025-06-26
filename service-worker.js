self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('youbike-cache-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/YouBike/index.html',
                '/YouBike/main.js',
                '/YouBike/manifest.json',
                '/YouBike/icons/html.webp',
                '/YouBike/icons/python.webp',
                'https://unpkg.com/leaflet/dist/leaflet.css',
                'https://unpkg.com/leaflet/dist/leaflet.js',
                'https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js',
                'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css',
                'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css',
                // 新增 Leaflet 預設圖示
                'https://unpkg.com/leaflet/dist/images/marker-icon.png',
                'https://unpkg.com/leaflet/dist/images/marker-icon-2x.png',
                'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
                // 新增紅色標記圖示
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
            ]);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // 特別處理 OpenStreetMap 圖磚請求
    if (url.hostname === 'tile.openstreetmap.org') {
        event.respondWith(
            caches.open('map-tiles-cache').then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then((response) => {
                        if (response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                });
            })
        );
        return;
    }

    // 處理其他請求
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;
            return fetch(event.request).catch((error) => {
                console.error('PWA fetch failed:', error);
                throw error;
            });
        })
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
