import { test as base } from "@playwright/test";

/**
 * Sem sessão por padrão: a API real responderia 401 em /users/me. Cada teste
 * que precisa de alguém conectado registra a própria rota de /users/me, que
 * tem precedência sobre esta. Assim nenhum teste depende da API de produção.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/api/v1/users/me", (route) => route.fulfill({
      status: 401,
      json: { error: { code: "invalid_authentication", message: "Autenticação ausente, inválida ou expirada.", details: null } },
    }));
    await use(page);
  },
});

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
