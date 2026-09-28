import { expect, test } from "./fixtures/session";

// PNG 1x1, para não depender do Open Food Facts nos testes.
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const PHOTO = "https://images.openfoodfacts.org/images/products/789/100/010/0103/front_pt.12.400.jpg";

const summary = {
  total_reviews: 0,
  repurchase_intent: { yes: 0, maybe: 0, no: 0 },
  quality: { high: 0, adequate: 0, low: 0 },
  expectation: { exceeded: 0, met: 0, not_met: 0 },
  value_for_money: { good: 0, fair: 0, poor: 0 },
};
const withPhoto = { id: 1, name: "Biscoito Recheado", brand: "Nestlé", variant: null, quantity: 140, unit: "g", category: "food", barcode: "7891000100103", image_url: PHOTO };
const withoutPhoto = { id: 2, name: "Detergente Neutro", brand: "Ypê", variant: null, quantity: 500, unit: "ml", category: "cleaning", barcode: null, image_url: null };

test("fotos do catálogo aparecem na busca e no detalhe, com ícone quando falta", async ({ page }) => {
  const photoRequests: (string | undefined)[] = [];
  await page.route("https://images.openfoodfacts.org/**", (route) => {
    photoRequests.push(route.request().headers().referer);
    return route.fulfill({ contentType: "image/png", body: PIXEL });
  });
  await page.route("**/health", (route) => route.fulfill({ json: { status: "ok", database: "available" } }));
  await page.route("**/api/v1/products?**", (route) => route.fulfill({
    json: {
      items: [withPhoto, withoutPhoto].map((item) => ({ ...item, community_summary: { total_reviews: 0, repurchase_intent: { yes: 0, maybe: 0, no: 0 } }, your_repurchase_intent: null })),
      page: 1, page_size: 20, total: 2, approximate: false,
    },
  }));
  await page.route("**/api/v1/products/1", (route) => route.fulfill({ json: { ...withPhoto, community_summary: summary, your_review: null } }));
  await page.route("**/api/v1/products/1/reviews?**", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 20, total: 0 } }));

  await page.goto("/search?all=1");
  const photo = page.getByRole("img", { name: "Embalagem de Biscoito Recheado, Nestlé" });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const withoutPhotoCard = page.locator(".productCard", { hasText: "Detergente Neutro" });
  await expect(withoutPhotoCard.locator("img")).toHaveCount(0);
  await expect(withoutPhotoCard.locator(".productImage--empty svg")).toBeVisible();
  await expect(page.getByText(/fotos sob/)).toBeVisible();

  await page.getByRole("button", { name: "Ver detalhes de Biscoito Recheado" }).click();
  await expect(page.locator(".productPhoto img")).toBeVisible();
  await expect(page.locator(".productPhoto figcaption")).toHaveText("Foto: Open Food Facts (CC BY-SA)");
  // A foto é pedida sem revelar de qual página veio.
  expect(photoRequests.length).toBeGreaterThan(0);
  expect(photoRequests.every((referer) => referer === undefined)).toBe(true);
});
