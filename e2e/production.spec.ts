import { expect, test } from "@playwright/test";

// Production checks are opt-in and read-only. Fail early rather than accidentally
// calling real infrastructure from the local mocked suite.
test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Set PLAYWRIGHT_BASE_URL for production smoke");
test.describe.configure({ timeout: 360_000 });

async function warmApi(page: import("@playwright/test").Page) {
  // Four bounded attempts fit inside the enclosing test timeout, including UI checks.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await page.request.get("/health", { timeout: 35_000 });
      if (response.ok()) return;
    } catch { /* A sleeping service can need another request. */ }
  }
  throw new Error("Same-origin API health unavailable after four bounded attempts");
}

test("produção conecta à API e mantém a jornada pública principal", async ({ page }) => {
  await warmApi(page);
  // O site repassa /api e /health à API na mesma origem: sem isso, a sessão em cookie não funciona.
  const proxiedHealth = await page.request.get("/health");
  expect(proxiedHealth.ok(), "O site deve repassar /health à API").toBe(true);
  expect(await proxiedHealth.json()).toMatchObject({ status: "healthy" });
  const proxiedSession = await page.request.get("/api/v1/users/me");
  expect(proxiedSession.status(), "O site deve repassar /api à API").toBe(401);
  expect((await proxiedSession.json()).error.code).toBe("invalid_authentication");

  await page.goto("/");
  await expect(page.getByText("Catálogo conectado", { exact: true })).toBeVisible({ timeout: 30_000 });

  const loginTrigger = page.getByRole("button", { name: "Entrar", exact: true });
  await loginTrigger.click();
  await expect(page.getByRole("dialog", { name: "Entre na sua conta" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(loginTrigger).toBeFocused();

  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.getByLabel("Nome do produto").fill("merchant-smoke-produto-inexistente-9f3d");
  await page.getByRole("button", { name: "Executar busca" }).click();
  await expect(page.getByText("Nenhum produto encontrado.", { exact: true })).toBeVisible({ timeout: 30_000 });
});

test("produção mostra as fotos do catálogo inicial", async ({ page }) => {
  await warmApi(page);
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") blocked.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (/images\.open(food|beauty|products)facts\.org/.test(request.url())) {
      blocked.push(`${request.url()} → ${request.failure()?.errorText}`);
    }
  });

  const document = await page.goto("/search?name=nescau");
  const csp = document?.headers()["content-security-policy"] ?? "";
  const imagePolicy = csp.split(";").map((directive) => directive.trim()).find((directive) => directive.startsWith("img-src ")) ?? "";
  for (const provider of ["openfoodfacts", "openbeautyfacts", "openproductsfacts"]) {
    expect(imagePolicy, `Published CSP must allow ${provider}; repository YAML alone is not deployment evidence`).toContain(`https://images.${provider}.org`);
  }
  const card = page.locator(".productCard").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  // O catálogo inicial tem foto em 96% dos produtos; "nescau" só traz produtos com foto.
  const photo = page.locator(".productCard img").first();
  await expect(photo, `Nenhuma foto na busca. Erros: ${blocked.join(" | ")}`).toBeVisible({ timeout: 30_000 });
  await expect.poll(
    () => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    { message: `A foto não carregou. Erros: ${blocked.join(" | ")}`, timeout: 30_000 },
  ).toBe(true);
  expect(blocked.filter((text) => /Content Security Policy|open(food|beauty|products)facts/i.test(text))).toEqual([]);
});
