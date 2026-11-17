/* Mode installable : l'application se lance même avec une connexion faible. Les appels IA (/api/) ne sont jamais mis en cache. */
const CACHE = "revizeasy-v1";
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html", "./shim.js", "./icons/icon-192.png"]))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") { e.respondWith(fetch(e.request).catch(() => caches.match("./index.html"))); return; }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
