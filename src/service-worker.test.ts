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
  const caches = {
    open: vi.fn(() => Promise.resolve({ put: vi.fn(() => Promise.resolve()) })),
    match: vi.fn(() => Promise.resolve(undefined)),
    delete: vi.fn(() => Promise.resolve(true)),
    keys: vi.fn(() => Promise.resolve(["merchant-shell-v2", "merchant-shell-v3", "merchant-shell-v4", "another-app"])),
  };
  new Function("self", "caches", "fetch", source)(self, caches, vi.fn(() => Promise.resolve(new Response("ok"))));
  return { fetch: listeners.fetch, activate: listeners.activate, caches, self };
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

  it("ativa a atualização removendo caches antigos e suas respostas privadas", async () => {
    const { activate, caches, self } = loadServiceWorker();
    const event = { waitUntil: vi.fn() };
    activate(event);
    await event.waitUntil.mock.calls[0][0];
    expect(caches.delete.mock.calls).toEqual([["merchant-shell-v2"], ["merchant-shell-v3"]]);
    expect(self.clients.claim).toHaveBeenCalledOnce();
  });
});
