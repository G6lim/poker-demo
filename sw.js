const CACHE_NAME = "poker-cache-v3";  // ← 每次更新改这里

const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Install — pre-cache assets + force activate new SW immediately
self.addEventListener("install", event => {
  console.log("[SW] Installing…");
  self.skipWaiting();  // Activate new SW immediately

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS)
        .catch(err => {
          console.error("[SW] Cache addAll error:", err);
        });
    })
  );
});

// Activate — remove old caches + take control of clients
self.addEventListener("activate", event => {
  console.log("[SW] Activating…");

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())  // take control immediately
  );
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Clone and store in cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() =>
        caches.match(request).then(cacheRes => cacheRes || Promise.reject("no-match"))
      )
  );
});
