const API_URL =
  import.meta.env.VITE_API_URL ?? "https://fastapi-merchant-app.onrender.com";

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
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

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

  if (response.status === 204) return undefined as T;
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

export { API_URL };
