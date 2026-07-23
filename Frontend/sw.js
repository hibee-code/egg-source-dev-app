const CACHE_NAME = "egg-connect-cache-v3";
const STATIC_ASSETS = [
  "/",
  "/home",
  "/login",
  "/register",
  "/marketplace",
  "/why",
  "/about",
  "/index.html",
  "/css/style.css",
  "/assets/css/tokens.css",
  "/assets/js/utils.js",
  "/assets/js/auth.js",
  "/assets/js/api.js",
  "/js/api.js",
  "/components/layout/navbar.js",
  "/assets/images/logo-egg.svg",
  "/assets/images/logo-egg.png",
  "/assets/images/logo-egg-192.png",
  "/assets/images/logo-egg-512.png",
  "/assets/images/logo-egg-maskable-192.png",
  "/assets/images/logo-egg-maskable-512.png",
  "/assets/images/apple-touch-icon.png",
  "/pages/auth.html"
];

// Install Event - Pre-cache Static Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Pre-caching static app shell...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up legacy caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Clearing legacy cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Caching Strategies
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests and external URLs (e.g. fonts, lucide CDN)
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Dynamic API Routes Strategy: Network-First (with cache fallback)
  if (requestUrl.pathname.includes("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static Assets Strategy: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for document pages when offline
        const acceptHeader = event.request.headers.get("accept");
        if (acceptHeader && acceptHeader.includes("text/html")) {
          return caches.match("/index.html") || caches.match("/pages/auth.html");
        }
      });
      return cachedResponse || fetchPromise;
    })
  );
});
