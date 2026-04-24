const CACHE_NAME = "pos-v3";
const RUNTIME_CACHE = "pos-runtime-v2";
const STATIC_ASSETS = "pos-static-v2";

// ======================================
// 📦 RECURSOS ESTÁTICOS A CACHEAR
// ======================================
const urlsToCache = [
  "./",
  "./index.html",
  "./app14.js",
  "./parser14.js",
  "./inventario.html",
  "./inventario.js",
  "./ganancias.html",
  "./ganancias.js",
  "./manifest.json",
  "./sw.js",
  
  // CSS y librerías externas
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://html2canvas.hertzen.com/dist/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcode.js/1.4.4/qrcode.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  
  // Fuentes de Bootstrap Icons
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.woff2",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.woff"
];

// ======================================
// 📥 INSTALL - Cachear recursos estáticos
// ======================================
self.addEventListener("install", event => {
  console.log("🚀 Service Worker instalándose...");
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("💾 Cacheando recursos estáticos...");
      return cache.addAll(urlsToCache).catch(err => {
        console.warn("⚠️ Algunos recursos no se pudieron cachear:", err);
        // Continuar incluso si fallan algunos recursos externos
        return Promise.resolve();
      });
    })
  );
});

// ======================================
// 🧹 ACTIVATE - Limpiar cachés antiguos
// ======================================
self.addEventListener("activate", event => {
  console.log("🔄 Service Worker activándose...");
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== STATIC_ASSETS) {
            console.log("🗑️ Eliminando caché antigua:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// ======================================
// 🌐 FETCH - Estrategia: Cache First + Network Fallback
// ======================================
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // ❌ NO cachear solicitudes POST (como guardado de datos)
  if (request.method !== "GET") {
    return;
  }

  // 📄 Archivos HTML - Network first, cache fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(response => {
            return response || caches.match("./index.html");
          });
        })
    );
    return;
  }

  // 🎨 Assets (CSS, JS, fuentes) - Cache first
  if (request.url.includes(".js") || 
      request.url.includes(".css") ||
      request.url.includes(".woff") ||
      request.url.includes(".woff2") ||
      request.url.includes(".ttf")) {
    
    event.respondWith(
      caches.match(request).then(response => {
        if (response) return response;
        
        return fetch(request).then(fetchResponse => {
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }
          
          const responseClone = fetchResponse.clone();
          caches.open(STATIC_ASSETS).then(cache => {
            cache.put(request, responseClone);
          });
          
          return fetchResponse;
        }).catch(() => {
          // Retornar respuesta offline si existe
          return caches.match(request);
        });
      })
    );
    return;
  }

  // 🖼️ Imágenes - Cache first, con expiración
  if (request.url.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) return response;
        
        return fetch(request).then(fetchResponse => {
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }
          
          const responseClone = fetchResponse.clone();
          caches.open(STATIC_ASSETS).then(cache => {
            cache.put(request, responseClone);
          });
          
          return fetchResponse;
        }).catch(() => {
          // Imagen por defecto offline
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // 🔗 Todo lo demás - Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ======================================
// 🔔 MESSAGE - Manejo de mensajes del cliente
// ======================================
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("✅ Service Worker v2 - Modo Offline First activado");
