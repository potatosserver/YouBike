self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('youbike-cache-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/YouBike/index.html',
                '/YouBike/main.js',
                '/YouBike/manifest.json',
            ]);
        }).then(() => self.skipWaiting()) // 加入立即跳過等待
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open('map-tiles-cache').then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) return response;
                    return fetch(event.request).then(networkResponse => {
                        // 將下載到的地圖加入緩存
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch((error) => {
                        console.error('Tile fetch failed:', error);
                        // 回傳一個透明 1x1 gif 以作為預設地圖圖片
                        const transparentImg = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                        return new Response(transparentImg, { headers: { 'Content-Type': 'image/gif' } });
                    });
                });
            })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) return response;
                return fetch(event.request).catch((error) => {
                    console.error('PWA fetch failed:', error);
                    throw error;
                });
            })
        );
    }
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
        }).then(() => self.clients.claim()) // 加入立即控制所有客戶端
    );
});
