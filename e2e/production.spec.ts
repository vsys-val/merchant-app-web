import { expect, request as playwrightRequest, test } from "@playwright/test";

const apiUrl = "https://fastapi-merchant-app.onrender.com";

test("produção conecta à API e mantém a jornada pública principal", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let apiReady = false;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await api.get(`${apiUrl}/health`, { timeout: 60_000 });
      if (response.ok()) {
        apiReady = true;
        break;
      }
    } catch {
      // O plano gratuito pode precisar de uma tentativa extra para acordar.
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  await api.dispose();
  expect(apiReady, "A API deve responder ao health check").toBe(true);

  await page.goto("/");
  await expect(page.getByText("Catálogo conectado", { exact: true })).toBeVisible({ timeout: 30_000 });

  const loginTrigger = page.getByRole("button", { name: "Entrar", exact: true });
  await loginTrigger.click();
  await expect(page.getByRole("dialog", { name: "Entre na sua conta" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(loginTrigger).toBeFocused();

  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.getByLabel("Digite produto").fill("merchant-smoke-produto-inexistente-9f3d");
  await page.getByRole("button", { name: "Executar busca" }).click();
  await expect(page.getByText("Nenhum produto encontrado.", { exact: true })).toBeVisible({ timeout: 30_000 });
});
