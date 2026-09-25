import { apiRequest } from "../../lib/api";
import type { Category } from "../products/product-api";

export interface DailyPoint {
  date: string;
  new_users: number;
  new_products: number;
  new_reviews: number;
  active_users: number;
  sessions: number;
  searches: number;
}

export interface TechnicalDay {
  date: string;
  requests: number;
  errors_5xx: number;
  p95_ms: number | null;
}

export interface RouteRow {
  method: string;
  route: string;
  requests: number;
  error_4xx_pct: number | null;
  error_5xx_pct: number | null;
  avg_ms: number | null;
  p95_ms: number | null;
  max_ms: number;
}

export interface AlertCheck { key: string; label: string; ok: boolean; value: number | null; threshold: string; detail: string; }

export interface AdminOverview {
  generated_at: string;
  /** Guarda-corpos da última hora; ausente em APIs anteriores aos alertas. */
  alerts?: { status: "ok" | "alert"; evaluated_at: string; window_minutes: number; checks: AlertCheck[] };
  window_days: number;
  timezone: string;
  system: {
    environment: string;
    api_commit: string | null;
    email_delivery: string;
    uptime_seconds: number | null;
    database: { status: "available" | "unavailable"; latency_ms: number | null };
  };
  totals: {
    users: number;
    users_verified: number;
    users_pending: number;
    products_active: number;
    products_deleted: number;
    reviews: number;
    reviews_with_comment: number;
  };
  daily: DailyPoint[];
  product: {
    north_star: { label: string; value: number | null; own_review_views: number; weekly_active_users: number; target: number };
    searches: { total: number; with_results_pct: number | null; barcode_pct: number | null; approximate_pct?: number | null; target_with_results_pct: number };
    activation: { cohort: number; activated: number; pct: number | null; target_pct: number };
    reviews_per_active_user: number | null;
    review_funnel: { steps: Array<{ step: string; sessions: number }>; abandonment_pct: number | null; target_abandonment_pct: number };
    product_creation: { submitted: number; created: number; conflicts: number; conflict_pct: number | null; target_conflict_pct: number };
    /** Ausente em APIs anteriores ao leitor de código de barras. */
    barcode_scanner?: { opened: number; detected_pct: number | null; camera_unavailable_pct: number | null };
    signups_completed: number;
  };
  catalog: {
    by_category: Array<{ category: Category; products: number }>;
    products_without_reviews_pct: number | null;
    top_products: Array<{ id: number; name: string; brand: string; reviews: number }>;
    aspects: Array<{ aspect: string; positive: number; negative: number }>;
    repurchase: { yes: number; maybe: number; no: number };
  };
  technical: {
    requests: number;
    error_4xx_pct: number | null;
    error_5xx_pct: number | null;
    p95_ms: number | null;
    target_p95_ms: number;
    latency_buckets_ms: number[];
    daily: TechnicalDay[];
    routes_24h: RouteRow[];
  };
  frontend: {
    loads: number;
    versions: Array<{ commit: string; sessions: number; last_seen: string }>;
    errors_total: number;
    top_errors: Array<{ message: string; count: number; last_seen: string }>;
  };
}

export function getAdminOverview(days: number, token: string, signal?: AbortSignal) {
  return apiRequest<AdminOverview>(`/api/v1/admin/overview?days=${days}`, { signal }, token);
}
