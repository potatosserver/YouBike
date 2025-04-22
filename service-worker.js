self.addEventListener('install', event => {
    // 立即啟用新的 service worker
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // 簡易轉發網路請求，可根據需求擴充快取策略
    event.respondWith(fetch(event.request));
});
