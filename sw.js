// Bump this version when changing the application shell.
const cachePrefix = `good-dog:${self.registration.scope}:`;
const cacheName = `${cachePrefix}v7`;
const essentialFiles = [
  "./", "./index.html", "./styles.css", "./app.js", "./pwa.js",
  "./manifest.webmanifest", "./icons/paw-180.png",
  "./icons/paw-192.png", "./icons/paw-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(essentialFiles)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(cachePrefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(self.registration.scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    // Prefer fresh files on manual refresh; fall back to the saved app when offline.
    try {
      return await fetch(request, { cache: "no-cache" });
    } catch (error) {
      const saved = await cache.match(request);
      if (saved) return saved;
      if (request.mode === "navigate") return cache.match("./index.html");
      throw error;
    }
  })());
});
