import { readToken } from "../features/auth/auth-storage";
import { API_URL } from "./api";

/**
 * Eventos de uso próprios, sem terceiros.
 *
 * Nunca envia texto digitado, e-mail ou outro dado pessoal: só nomes de
 * eventos previstos pela API e propriedades escalares curtas. Fica desligado
 * fora do build de produção, em navegadores automatizados (testes E2E e smoke
 * em produção) e quando o navegador pede "Do Not Track".
 */
export type EventName =
  | "app_loaded"
  | "client_error"
  | "search_performed"
  | "product_viewed"
  | "review_step_viewed"
  | "review_saved"
  | "product_create_submitted"
  | "product_created"
  | "product_create_conflict"
  | "product_edit_saved"
  | "signup_completed"
  | "barcode_scan";

type Properties = Record<string, string | number | boolean | null>;

interface QueuedEvent {
  name: EventName;
  properties: Properties;
}

const FLUSH_DELAY_MS = 5_000;
const MAX_BATCH = 10;
const MAX_ERRORS_PER_SESSION = 5;
const SESSION_KEY = "merchant.analytics-session";

let queue: QueuedEvent[] = [];
let timer: number | undefined;
let enabledOverride: boolean | undefined;
let memorySessionId: string | undefined;
const reportedErrors = new Set<string>();

function isEnabled(): boolean {
  if (enabledOverride !== undefined) return enabledOverride;
  if (!import.meta.env.PROD) return false;
  if (navigator.webdriver) return false;
  return navigator.doNotTrack !== "1";
}

function sessionId(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    memorySessionId ??= crypto.randomUUID();
    return memorySessionId;
  }
}

export function flush(options: { keepalive?: boolean } = {}): void {
  window.clearTimeout(timer);
  timer = undefined;
  if (queue.length === 0) return;
  const events = queue.slice(0, 20);
  queue = queue.slice(20);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  void fetch(`${API_URL}/api/v1/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session_id: sessionId(), events }),
    keepalive: options.keepalive,
  }).catch(() => {
    // Métricas nunca atrapalham o uso do app.
  });
  if (queue.length > 0) flush(options);
}

export function track(name: EventName, properties: Properties = {}): void {
  if (!isEnabled()) return;
  queue.push({ name, properties });
  if (queue.length >= MAX_BATCH) flush();
  else timer ??= window.setTimeout(() => flush(), FLUSH_DELAY_MS);
}

export function trackError(message: string, source = ""): void {
  const key = `${message}|${source}`;
  if (reportedErrors.has(key) || reportedErrors.size >= MAX_ERRORS_PER_SESSION) return;
  reportedErrors.add(key);
  // Sem query string: URLs podem carregar parâmetros de busca.
  track("client_error", { message: message.slice(0, 200), source: source.split("?")[0].slice(0, 200) });
}

export function startAnalytics(commit: string): void {
  if (!isEnabled()) return;
  track("app_loaded", { commit });
  window.addEventListener("error", (event) => trackError(event.message || "Erro sem mensagem", event.filename));
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    trackError(`Promessa rejeitada: ${reason}`);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush({ keepalive: true });
  });
  window.addEventListener("pagehide", () => flush({ keepalive: true }));
}

/** Somente testes. */
export function resetAnalyticsForTests(enabled: boolean | undefined): void {
  window.clearTimeout(timer);
  timer = undefined;
  queue = [];
  reportedErrors.clear();
  enabledOverride = enabled;
}
