const CACHE_NAME = "pos-v1-locked";

// ⚠️ IMPORTANTE: todo lo necesario para que la app funcione offline
const urlsToCache = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./sw.js",

  // Librerías externas (se guardan en cache en la instalación)
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://html2canvas.hertzen.com/dist/html2canvas.min.js",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
];


// ======================================
// 🟢 INSTALACIÓN (cache completo)
// ======================================
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});


// ======================================
// 🟢 ACTIVACIÓN (limpieza de versiones viejas)
// ======================================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});


// ======================================
// 🔒 FETCH (OFFLINE 100% BLOQUEADO)
// ======================================
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // SOLO CACHE → NO INTERNET
      return response;
    })
  );
});
