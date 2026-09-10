const API_URL =
  import.meta.env.VITE_API_URL ?? "https://fastapi-merchant-app.onrender.com";

export type ApiStatus = "checking" | "online" | "offline";

export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, { signal });
    return response.ok;
  } catch {
    return false;
  }
}

export { API_URL };
