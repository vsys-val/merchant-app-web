import { describe, expect, it, vi } from "vitest";
import source from "../public/sw.js?raw";

/** Executa public/sw.js com um `self` falso e devolve o tratador de fetch. */
function loadServiceWorker() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const self = {
    location: { origin: "https://merchant-app-web.onrender.com" },
    addEventListener: (type: string, listener: (event: unknown) => void) => { listeners[type] = listener; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const caches = { open: vi.fn(), match: vi.fn(() => Promise.resolve(undefined)), keys: vi.fn() };
  new Function("self", "caches", "fetch", source)(self, caches, vi.fn(() => Promise.resolve(new Response("ok"))));
  return { fetch: listeners.fetch, caches };
}

function fetchEvent(url: string, mode: RequestMode = "cors") {
  return { request: { method: "GET", url, mode }, respondWith: vi.fn(), waitUntil: vi.fn() };
}

describe("service worker", () => {
  it.each([
    "https://merchant-app-web.onrender.com/api/v1/products?name=nescau",
    "https://merchant-app-web.onrender.com/api/v1/users/me",
    "https://merchant-app-web.onrender.com/health",
  ])("deixa a API passar direto, sem cache: %s", (url) => {
    const { fetch, caches } = loadServiceWorker();
    const event = fetchEvent(url);
    fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
    expect(caches.match).not.toHaveBeenCalled();
  });

  it("não intercepta fotos de outras origens", () => {
    const { fetch } = loadServiceWorker();
    const event = fetchEvent("https://images.openfoodfacts.org/images/products/789/front_pt.3.400.jpg", "no-cors");
    fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("continua servindo os arquivos do site pelo cache", () => {
    const { fetch } = loadServiceWorker();
    const event = fetchEvent("https://merchant-app-web.onrender.com/assets/index-abc123.js");
    fetch(event);
    expect(event.respondWith).toHaveBeenCalled();
  });

  it("troca o nome do cache para apagar as respostas da API guardadas pela versão anterior", () => {
    expect(source).toMatch(/CACHE_NAME = "merchant-shell-v3"/);
  });
});
