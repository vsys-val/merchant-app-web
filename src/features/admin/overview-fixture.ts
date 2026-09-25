import type { AdminOverview } from "./admin-api";

/** Dados de exemplo coerentes, usados nos testes do painel. */
export function overviewFixture(days = 7): AdminOverview {
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(2026, 8, 24 - (days - 1 - index)));
    return date.toISOString().slice(0, 10);
  });
  return {
    generated_at: "2026-09-24T15:00:00Z",
    alerts: {
      status: "alert",
      evaluated_at: "2026-09-24T15:00:00+00:00",
      window_minutes: 60,
      checks: [
        { key: "database", label: "Banco de dados", ok: true, value: null, threshold: "disponível", detail: "Respondendo." },
        { key: "errors_5xx", label: "Erros 5xx", ok: false, value: 10, threshold: "< 5%", detail: "3 de 30 requisições." },
        { key: "search_p95", label: "Latência p95 da busca", ok: true, value: 200, threshold: "≤ 800 ms", detail: "≤ 200 ms em 25 buscas." },
      ],
    },
    window_days: days,
    timezone: "America/Sao_Paulo",
    system: {
      environment: "production",
      api_commit: "abc1234def",
      email_delivery: "disabled",
      uptime_seconds: 7_380,
      database: { status: "available", latency_ms: 3.2 },
    },
    totals: { users: 12, users_verified: 11, users_pending: 1, products_active: 20, products_deleted: 1, reviews: 18, reviews_with_comment: 7 },
    daily: dates.map((date, index) => ({
      date, new_users: index % 3, new_products: index % 2, new_reviews: index, active_users: 2 + index, sessions: 5 + index * 2, searches: 8 + index,
    })),
    product: {
      north_star: { label: "Consultas…", value: 2.5, own_review_views: 10, weekly_active_users: 4, target: 2 },
      searches: { total: 60, with_results_pct: 55.0, barcode_pct: 10.0, approximate_pct: 15.0, target_with_results_pct: 70 },
      activation: { cohort: 8, activated: 4, pct: 50.0, target_pct: 40 },
      reviews_per_active_user: 1.5,
      review_funnel: {
        steps: [
          { step: "Etapa 1 · experiência", sessions: 10 },
          { step: "Etapa 2 · motivos", sessions: 8 },
          { step: "Etapa 3 · conferência", sessions: 7 },
          { step: "Publicada", sessions: 6 },
        ],
        abandonment_pct: 40.0,
        target_abandonment_pct: 30,
      },
      product_creation: { submitted: 10, created: 9, conflicts: 1, conflict_pct: 10.0, target_conflict_pct: 10 },
      barcode_scanner: { opened: 20, detected_pct: 75.0, camera_unavailable_pct: 10.0 },
      signups_completed: 5,
    },
    catalog: {
      by_category: [{ category: "food", products: 12 }, { category: "cleaning", products: 8 }],
      products_without_reviews_pct: 35.0,
      top_products: [{ id: 1, name: "Café torrado", brand: "Pilão", reviews: 5 }],
      aspects: [{ aspect: "taste", positive: 6, negative: 1 }, { aspect: "price", positive: 2, negative: 4 }],
      repurchase: { yes: 10, maybe: 5, no: 3 },
    },
    technical: {
      requests: 1_520,
      error_4xx_pct: 4.2,
      error_5xx_pct: 0.3,
      p95_ms: 400,
      target_p95_ms: 800,
      latency_buckets_ms: [25, 50, 100, 200, 400, 800, 1600, 3200],
      daily: dates.map((date, index) => ({ date, requests: 150 + index * 20, errors_5xx: index === 3 ? 2 : 0, p95_ms: index === 0 ? null : 200 })),
      routes_24h: [{ method: "GET", route: "/api/v1/products", requests: 300, error_4xx_pct: 2.0, error_5xx_pct: 0, avg_ms: 48.3, p95_ms: 200, max_ms: 910 }],
    },
    frontend: {
      loads: 40,
      versions: [{ commit: "e42dc86cfecc", sessions: 30, last_seen: "2026-09-24T14:50:00Z" }],
      errors_total: 2,
      top_errors: [{ message: "TypeError: x is undefined", count: 2, last_seen: "2026-09-24T12:00:00Z" }],
    },
  };
}
