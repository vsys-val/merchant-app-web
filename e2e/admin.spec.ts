import { expect, Page, test } from "@playwright/test";
import { overviewFixture } from "../src/features/admin/overview-fixture";

async function signInAs(page: Page, isAdmin: boolean) {
  await page.addInitScript(() => localStorage.setItem("merchant.access-token", "e2e-token"));
  await page.route("**/api/v1/users/me", (route) => route.fulfill({
    json: { id: 1, name: "Admin", email: "admin@example.com", email_verified: true, is_admin: isAdmin },
  }));
}

test("administração vê os indicadores e troca o período", async ({ page }) => {
  const requested: string[] = [];
  await signInAs(page, true);
  await page.route("**/api/v1/admin/overview?**", (route) => {
    const days = Number(new URL(route.request().url()).searchParams.get("days"));
    requested.push(String(days));
    return route.fulfill({ json: overviewFixture(days) });
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Painel do Merchant" })).toBeVisible();
  const northStar = page.locator(".statTile--hero");
  await expect(northStar).toContainText("2,5");
  await expect(northStar).toContainText("Dentro da meta");
  await expect(page.getByText("E-mail desligado")).toBeVisible();

  await page.getByRole("button", { name: "Últimos 7 dias" }).click();
  await expect(page.getByRole("button", { name: "Últimos 7 dias" })).toHaveAttribute("aria-pressed", "true");
  expect(requested).toEqual(["30", "7"]);

  const requests = page.locator("figure", { hasText: "Requisições por dia" });
  await requests.getByText("Ver tabela").click();
  await expect(requests.locator("tbody tr")).toHaveCount(7);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("quem não é administrador não vê o painel", async ({ page }) => {
  let overviewCalls = 0;
  await signInAs(page, false);
  await page.route("**/api/v1/admin/overview?**", (route) => {
    overviewCalls += 1;
    return route.fulfill({ status: 403, json: { error: { code: "admin_required", message: "Acesso restrito à administração.", details: null } } });
  });

  await page.goto("/admin");
  await expect(page.getByText("Esta área é restrita à administração.")).toBeVisible();
  expect(overviewCalls).toBe(0);
});
