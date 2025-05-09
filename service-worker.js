const CACHE_NAME = 'youbike-cache-v2'; // 更新 cache 名稱以延長生命週期
const urlsToCache = [
  '/',
  '/YouBike/index.html',
  '/YouBike/main.js',
  '/YouBike/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // 先發起網路請求以背景更新快取
  const networkFetch = fetch(event.request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => {
    // 網路失敗時，可捕捉處理(例如回傳 undefined)
  });

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 若有快取則立即回應，否則回傳網路請求結果
      return cachedResponse || networkFetch;
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});
