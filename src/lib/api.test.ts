import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("envia JSON e token Bearer e lê a resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 7 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ id: number }>("/api/v1/test", {
      method: "POST",
      body: JSON.stringify({ name: "Café" }),
    }, "jwt-token")).resolves.toEqual({ id: 7 });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("converte o erro estruturado do backend em ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        error: { code: "validation_error", message: "Dados inválidos.", details: { field: "name" } },
      }), { status: 422, headers: { "Content-Type": "application/json" } }),
    ));

    const promise = apiRequest("/api/v1/test");
    await expect(promise).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      code: "validation_error",
      message: "Dados inválidos.",
    } satisfies Partial<ApiError>);
  });

  it("aceita respostas 204 sem tentar ler JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest<void>("/api/v1/reviews/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
