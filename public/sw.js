/* global caches, fetch, self, URL */

const CACHE_NAME = 'triangle-shell-v1';
const APP_SHELL = ['/triangle.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
   event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
   );
   self.skipWaiting();
});

self.addEventListener('activate', (event) => {
   event.waitUntil(
      caches
         .keys()
         .then((cacheNames) =>
            Promise.all(
               cacheNames
                  .filter((cacheName) => cacheName !== CACHE_NAME)
                  .map((cacheName) => caches.delete(cacheName))
            )
         )
   );
   self.clients.claim();
});

self.addEventListener('fetch', (event) => {
   const request = event.request;
   const url = new URL(request.url);

   if (request.method !== 'GET' || url.origin !== self.location.origin) {
      return;
   }

   if (request.mode === 'navigate') {
      const responsePromise = fetch(request).catch(() =>
         caches.match(request).then((cachedResponse) => cachedResponse || caches.match('/projects'))
      );
      event.respondWith(responsePromise);
      event.waitUntil(
         responsePromise.then((response) => {
            if (!response.ok) return;
            return caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
         })
      );
      return;
   }

   if (url.pathname.startsWith('/assets/')) {
      const responsePromise = caches.match(request).then((cachedResponse) => cachedResponse || fetch(request));
      event.respondWith(responsePromise);
      event.waitUntil(
         responsePromise.then((response) => {
            if (!response.ok) return;
            return caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
         })
      );
   }
});
