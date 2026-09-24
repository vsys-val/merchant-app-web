import { expect, Page, test } from "@playwright/test";

const review = {
  id: 7,
  repurchase_intent: "yes",
  quality: "adequate",
  expectation: "met",
  value_for_money: "fair",
  reasons: [{ aspect: "taste", perception: "positive" }],
  comment: "Voltaria a comprar.",
  created_at: "2026-09-14T12:00:00Z",
  updated_at: "2026-09-14T12:00:00Z",
};

const product = {
  id: 3,
  name: "Produto de teste",
  brand: "Marca teste",
  variant: null,
  quantity: 1500,
  unit: "ml",
  category: "food",
  barcode: null,
  community_summary: {
    total_reviews: 0,
    repurchase_intent: { yes: 0, maybe: 0, no: 0 },
    quality: { high: 0, adequate: 0, low: 0 },
    expectation: { exceeded: 0, met: 0, not_met: 0 },
    value_for_money: { good: 0, fair: 0, poor: 0 },
  },
};

async function mockPublicApi(page: Page) {
  await page.route("**/health", (route) => route.fulfill({ json: { status: "ok", database: "available" } }));
  await page.route("**/api/v1/products?**", (route) => route.fulfill({
    json: {
      items: [{ ...product, community_summary: { total_reviews: 2, repurchase_intent: { yes: 75, maybe: 25, no: 0 } }, your_repurchase_intent: null }],
      page: 1,
      page_size: 20,
      total: 1,
    },
  }));
}

test("busca pública, navegação e modal de acesso funcionam por teclado", async ({ page }) => {
  await mockPublicApi(page);
  await page.route("**/api/v1/products/3", (route) => route.fulfill({ json: { ...product, your_review: null } }));
  await page.route("**/api/v1/products/3/reviews?**", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 20, total: 0 } }));

  await page.goto("/");
  const loginTrigger = page.getByRole("button", { name: "Entrar", exact: true });
  await expect(loginTrigger).toBeVisible();
  await loginTrigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName("Entre na sua conta");
  await expect(page.getByRole("button", { name: "Fechar" })).toBeFocused();
  await page.getByRole("tab", { name: "Entrar" }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Cadastrar" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog).toHaveAccessibleName("Crie sua conta");
  await expect(dialog).toContainText("Crie sua conta");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(loginTrigger).toBeFocused();

  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.getByLabel("Digite produto").fill("Produto");
  await page.getByRole("button", { name: "Executar busca" }).click();
  await expect(page.getByText("Produto de teste", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver detalhes de Produto de teste" }).click();
  await expect(page).toHaveURL(/\/products\/3$/);
  await expect(page.getByRole("heading", { name: "Produto de teste", level: 1 })).toBeVisible();
});

test("exclusão exige confirmação e atualiza o detalhe", async ({ page }) => {
  let deleted = false;
  let deleteRequests = 0;
  await page.addInitScript(() => localStorage.setItem("merchant.access-token", "e2e-token"));
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: { id: 1, name: "Pessoa teste", email: "qa@example.com" } }));
  await page.route("**/api/v1/products/3", (route) => route.fulfill({ json: { ...product, your_review: deleted ? null : review } }));
  await page.route("**/api/v1/products/3/reviews?**", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 20, total: 0 } }));
  await page.route("**/api/v1/reviews/7", async (route) => {
    deleteRequests += 1;
    deleted = true;
    await route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/products/3");
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir sua avaliação?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  expect(deleteRequests).toBe(0);

  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await dialog.getByRole("button", { name: "Excluir avaliação" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Você ainda não avaliou este produto.")).toBeVisible();
  expect(deleteRequests).toBe(1);
});

test("cadastro exige o código enviado por e-mail antes de entrar", async ({ page }) => {
  let verified = false;
  const verifications: unknown[] = [];
  await mockPublicApi(page);
  await page.route("**/api/v1/users/me/reviews?**", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 20, total: 0 } }));
  await page.route("**/api/v1/users/me", (route) => route.fulfill(
    verified
      ? { json: { id: 5, name: "Ana", email: "ana@example.com", email_verified: true } }
      : { status: 401, json: { error: { code: "invalid_authentication", message: "Autenticação ausente, inválida ou expirada.", details: null } } },
  ));
  await page.route("**/api/v1/users", (route) => route.fulfill({
    status: 201,
    json: { id: 5, name: "Ana", email: "ana@example.com", email_verified: false },
  }));
  await page.route("**/api/v1/auth/email-verification", async (route) => {
    verifications.push(route.request().postDataJSON());
    verified = true;
    await route.fulfill({ json: { access_token: "verified-token", token_type: "bearer", expires_in: 86400 } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("tab", { name: "Cadastrar" }).click();
  await page.getByLabel("Nome público").fill("Ana");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Senha").fill("frase secreta exclusiva");
  await page.getByRole("button", { name: "Criar conta" }).click();

  const dialog = page.getByRole("dialog", { name: "Confirme seu e-mail" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Enviamos um código de 6 dígitos para ana@example.com.");
  await expect(dialog.getByRole("button", { name: /Reenviar código em \d+ s/ })).toBeDisabled();

  await dialog.getByLabel("Código de 6 dígitos").fill("482913");
  await dialog.getByRole("button", { name: "Confirmar e entrar" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Lembrete para você" })).toBeVisible();
  expect(verifications).toEqual([{ email: "ana@example.com", code: "482913" }]);
});
