/**
 * Versões anteriores do site guardavam o token de acesso no localStorage.
 * A sessão agora vive num cookie HttpOnly, fora do alcance do JavaScript;
 * esta chave só é lida uma vez, para migrar quem já estava conectado.
 */
const LEGACY_TOKEN_KEY = "merchant.access-token";

export function readLegacyToken(): string | null {
  try {
    return localStorage.getItem(LEGACY_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function removeLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Armazenamento bloqueado: não há o que remover.
  }
}
