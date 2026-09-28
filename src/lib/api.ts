// Caminhos relativos: a API responde na mesma origem do site (rewrite do Render em
// produção, proxy do Vite em desenvolvimento). É o que mantém o cookie de sessão
// HttpOnly primário. Não há variável para apontar a outra origem, de propósito.
/** Cabeçalho exigido pela API em escritas autenticadas por cookie (proteção CSRF). */
export const CLIENT_HEADER = "X-Merchant-Client";
const REQUEST_TIMEOUT_MS = 15_000;

export type ApiStatus = "checking" | "online" | "offline";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "unexpected_error",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) headers.set("Content-Type", "application/json");
  headers.set(CLIENT_HEADER, "web");

  const controller = new AbortController();
  let didTimeOut = false;
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = window.setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (caught) {
    if (didTimeOut) {
      throw new ApiError(
        "A solicitação demorou mais que o esperado. Tente novamente.",
        408,
        "request_timeout",
      );
    }
    throw caught;
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // A resposta pode não conter JSON em falhas de infraestrutura.
    }

    throw new ApiError(
      payload.error?.message ?? "Não foi possível concluir a solicitação.",
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  }

  // 202 (pedido aceito, como envio de e-mail) e 204 não têm corpo nesta API.
  if (response.status === 202 || response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    await apiRequest("/health", { signal });
    return true;
  } catch {
    return false;
  }
}

