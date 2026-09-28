// v3: a v2 guardou respostas da API (/api/*) depois que ela passou para a mesma
// origem do site; trocar o nome apaga esse cache na ativação.
const CACHE_NAME = "merchant-shell-v3";
const APP_SHELL = ["/index.html", "/manifest.webmanifest", "/icon.svg", "/maskable-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // A API responde na mesma origem (rewrite do Render): dados e sessão nunca
  // vão para o cache, senão a busca mostraria resultados velhos e a conta de
  // quem saiu continuaria gravada no aparelho.
  if (url.pathname.startsWith("/api/") || url.pathname === "/health") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy)));
          }
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      });
      if (cached) {
        event.waitUntil(network.catch(() => undefined));
        return cached;
      }
      return network;
    }),
  );
});
