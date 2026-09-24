import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flush, resetAnalyticsForTests, track, trackError } from "./analytics";

function sentBodies(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

describe("analytics", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    resetAnalyticsForTests(true);
  });

  afterEach(() => {
    resetAnalyticsForTests(undefined);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("agrupa eventos e envia depois de 5 segundos, com sessão estável", () => {
    track("search_performed", { results: 3 });
    track("product_viewed", { product_id: 7, own_review: true });
    expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5_000);
    track("app_loaded", { commit: "abc" });
    vi.advanceTimersByTime(5_000);

    const [first, second] = sentBodies(fetchMock);
    expect(first.events.map((event: { name: string }) => event.name)).toEqual(["search_performed", "product_viewed"]);
    expect(first.session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.session_id).toBe(first.session_id);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/events");
  });

  it("envia imediatamente ao juntar 10 eventos", () => {
    for (let index = 0; index < 10; index += 1) track("search_performed", { results: index });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBodies(fetchMock)[0].events).toHaveLength(10);
  });

  it("identifica a pessoa só pelo token já existente", () => {
    localStorage.setItem("merchant.access-token", "jwt-teste");
    track("review_saved", { editing: false });
    flush({ keepalive: true });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt-teste");
    expect(init.keepalive).toBe(true);
  });

  it("limita e higieniza erros do navegador", () => {
    trackError("TypeError: x", "https://app.example/assets/app.js?token=segredo");
    trackError("TypeError: x", "https://app.example/assets/app.js?token=segredo");
    for (let index = 0; index < 10; index += 1) trackError(`Erro ${index}`);
    flush();

    const events = sentBodies(fetchMock)[0].events;
    expect(events).toHaveLength(5);
    expect(events[0].properties).toEqual({ message: "TypeError: x", source: "https://app.example/assets/app.js" });
  });

  it("não envia nada quando está desligado", () => {
    resetAnalyticsForTests(false);
    track("app_loaded", { commit: "abc" });
    trackError("TypeError: x");
    flush();
    vi.advanceTimersByTime(10_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("liga só no build de produção, fora de automação e sem Do Not Track", () => {
    resetAnalyticsForTests(undefined);
    const setNavigator = (webdriver: boolean, doNotTrack: string | null) => {
      Object.defineProperty(navigator, "webdriver", { value: webdriver, configurable: true });
      Object.defineProperty(navigator, "doNotTrack", { value: doNotTrack, configurable: true });
    };
    const sends = () => {
      fetchMock.mockClear();
      track("app_loaded", { commit: "abc" });
      flush();
      return fetchMock.mock.calls.length > 0;
    };

    setNavigator(false, null);
    expect(sends()).toBe(false); // modo de teste não é produção

    vi.stubEnv("PROD", true);
    expect(sends()).toBe(true);
    setNavigator(true, null);
    expect(sends()).toBe(false);
    setNavigator(false, "1");
    expect(sends()).toBe(false);
    setNavigator(false, null);
    vi.unstubAllEnvs();
  });

  it("falhas de rede não chegam à interface", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    track("app_loaded", { commit: "abc" });
    expect(() => flush()).not.toThrow();
    await vi.runAllTimersAsync();
  });
});
