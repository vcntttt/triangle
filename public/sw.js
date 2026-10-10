/* global caches, self */

// The service worker only makes Triangle installable. Pages carry live issue
// data and hashed assets already use the HTTP cache, so nothing is cached here.
// Activation deletes the caches left by earlier versions, which stored rendered
// pages for every visited URL.

self.addEventListener('install', () => {
   self.skipWaiting();
});

self.addEventListener('activate', (event) => {
   event.waitUntil(
      caches
         .keys()
         .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
         .then(() => self.clients.claim())
   );
});
