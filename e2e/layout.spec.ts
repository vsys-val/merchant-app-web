import { expect, Page, test } from "./fixtures/session";

/**
 * Cada dispositivo tem o seu layout: celular e tablet com navegação inferior,
 * desktop com navegação no topo e páginas em colunas. Nenhuma tela pode rolar
 * na horizontal.
 */

const product = (id: number, name: string) => ({
  id, name, brand: "Marca", variant: null, quantity: 500, unit: "g", category: "food", barcode: null,
  community_summary: { total_reviews: 1, repurchase_intent: { yes: 100, maybe: 0, no: 0 } }, your_repurchase_intent: null,
});
const review = { id: 7, repurchase_intent: "yes", quality: "high", expectation: "met", value_for_money: "fair", reasons: [{ aspect: "taste", perception: "positive" }], comment: null, created_at: "2026-09-20T12:00:00Z", updated_at: "2026-09-20T12:00:00Z" };
const detail = {
  ...product(1, "Café torrado"),
  community_summary: {
    total_reviews: 1, repurchase_intent: { yes: 100, maybe: 0, no: 0 }, quality: { high: 100, adequate: 0, low: 0 },
    expectation: { exceeded: 0, met: 100, not_met: 0 }, value_for_money: { good: 0, fair: 100, poor: 0 }, reasons: [{ aspect: "taste", positive: 1, negative: 0 }],
  },
  your_review: review,
};

async function signedIn(page: Page) {
  await page.route("**/health", (route) => route.fulfill({ json: { status: "ok", database: "available" } }));
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: { id: 1, name: "Ana", email: "ana@example.com", email_verified: true } }));
  await page.route("**/api/v1/users/me/reviews?**", (route) => route.fulfill({ json: { items: [{ ...review, product: product(1, "Café torrado") }], page: 1, page_size: 20, total: 1 } }));
  await page.route("**/api/v1/users/me/products?**", (route) => route.fulfill({ json: { items: [product(1, "Café torrado")], page: 1, page_size: 20, total: 1 } }));
  await page.route("**/api/v1/products?**", (route) => route.fulfill({ json: { items: [product(1, "Café torrado"), product(2, "Arroz integral")], page: 1, page_size: 20, total: 2, approximate: false } }));
  await page.route("**/api/v1/products/1", (route) => route.fulfill({ json: detail }));
  await page.route("**/api/v1/products/1/reviews?**", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 20, total: 0 } }));
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const pages = [
  ["/", "Lembrete para você"],
  ["/search?name=ca", "Arroz integral"],
  ["/products/1", "Sua experiência"],
  ["/account", "Meus produtos"],
  ["/products/new", "Código GTIN"],
] as const;

test("cada tela cabe na largura do dispositivo", async ({ page }) => {
  await signedIn(page);
  for (const [path, marker] of pages) {
    await page.goto(path);
    await expect(page.getByText(marker).first()).toBeVisible();
    expect(await horizontalOverflow(page), `rolagem horizontal em ${path}`).toBe(0);
  }
});

test("a navegação combina com o dispositivo", async ({ page }, testInfo) => {
  await signedIn(page);
  await page.goto("/");
  const top = page.locator(".topNavigation");
  const bottom = page.locator(".bottomNavigation");
  if (testInfo.project.name === "chromium") {
    await expect(top).toBeVisible();
    await expect(bottom).toBeHidden();
    await expect(top.getByRole("button", { name: "Início", exact: true })).toHaveAttribute("aria-current", "page");
  } else {
    await expect(bottom).toBeVisible();
    await expect(top).toBeHidden();
  }
  // Seja qual for a barra visível, ela leva à busca.
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/search/);
});

test("no desktop, busca e detalhe usam colunas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "layout em colunas só no desktop");
  await signedIn(page);

  await page.goto("/search?name=ca");
  await expect(page.getByText("Arroz integral")).toBeVisible();
  const panel = await page.locator(".searchPanel").boundingBox();
  const results = await page.locator(".searchResultsPane").boundingBox();
  expect(results!.x).toBeGreaterThan(panel!.x + panel!.width);

  await page.goto("/products/1");
  await expect(page.getByText("Sua experiência")).toBeVisible();
  const summary = await page.locator(".summaryHeader").boundingBox();
  const own = await page.locator(".yourReview").boundingBox();
  expect(own!.x).toBeGreaterThan(summary!.x + summary!.width);
  expect(Math.abs(own!.y - summary!.y)).toBeLessThan(80);
});

test("no celular, o conteúdo segue em uma coluna", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "coluna única só no celular");
  await signedIn(page);
  await page.goto("/products/1");
  await expect(page.getByText("Sua experiência")).toBeVisible();
  const summary = await page.locator(".summaryHeader").boundingBox();
  const own = await page.locator(".yourReview").boundingBox();
  expect(own!.y).toBeGreaterThan(summary!.y + summary!.height);
});
