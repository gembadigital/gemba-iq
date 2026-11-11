// Only public install assets are stored here. CRM/API/auth responses and
// hashed application scripts always use the network and normal HTTP cache.
const CACHE_NAME = "gemba-iq-static-v4";
const PUBLIC_ASSETS = [
  "/offline.html",
  "/icons/gemba-g-192.png",
  "/icons/gemba-g-512.png",
  "/icons/gemba-g-maskable-512.png",
  "/icons/apple-touch-icon-180.png",
  "/icons/favicon-32.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key !== CACHE_NAME && (key.startsWith("gemba-iq-static-") || key.startsWith("smart-mail-merge-cache-")))
      .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE_NAME).then((cache) => cache.match("/offline.html"))));
    return;
  }
  if (!PUBLIC_ASSETS.includes(url.pathname) || url.search) return;
  event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(event.request)).then((cached) => cached || fetch(event.request)));
});
