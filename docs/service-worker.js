const CACHE_NAME = 'static-image-gallery-v1';
const staticAssets = [
    './',
    './index.html',
    './main.js',
    './style.css',
    './manifest.webmanifest',
    './offline.html',
    'https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css',
    'https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js'
];
const imageCache = 'image-cache';

self.addEventListener('install', async event => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(staticAssets);
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME && name !== imageCache)
                    .map(name => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.origin === location.origin && (request.destination === 'image')) {
        event.respondWith(cacheFirst(request, imageCache));
        return;
    }

    event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || await caches.match('./offline.html');
    }
}

async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        // Fallback for images can be a placeholder
        return null;
    }
}