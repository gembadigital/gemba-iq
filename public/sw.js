const CACHE_NAME = "smart-mail-merge-cache-v2";

// Install Lifecycle - Skip waiting to update service worker instantly
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate Lifecycle - Claim clients immediately to manage control flow
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-First with Cache fallback strategy for static resources
self.addEventListener("fetch", (event) => {
  // Only attempt to handle non-POST HTTP or HTTPS requests
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid responses for offline use
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Retrieve offline cached assets if server is unreachable
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback SPA index
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
          return new Response("Offline connection error.", { status: 503, statusText: "Service Unavailable" });
        });
      })
  );
});
