import { expect, test } from "@playwright/test";
import { writeBarcodeVideo } from "./fixtures/barcode-video";

const GTIN = "7891000100103";
const video = writeBarcodeVideo(GTIN);

// A câmera falsa do Chromium "filma" o código gerado; a permissão é concedida sem diálogo.
test.use({
  permissions: ["camera"],
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${video}`],
  },
});

const product = {
  id: 3, name: "Açaí tradicional", brand: "Sabor Brasil", variant: null, quantity: 500, unit: "g", category: "food", barcode: GTIN,
  community_summary: { total_reviews: 0, repurchase_intent: { yes: 0, maybe: 0, no: 0 } }, your_repurchase_intent: null,
};

test("lê o código de barras pela câmera e busca o produto", async ({ page }) => {
  const searched: string[] = [];
  await page.route("**/health", (route) => route.fulfill({ json: { status: "ok", database: "available" } }));
  await page.route("**/api/v1/products?**", (route) => {
    searched.push(new URL(route.request().url()).searchParams.get("barcode") ?? "");
    return route.fulfill({ json: { items: [product], page: 1, page_size: 20, total: 1, approximate: false } });
  });

  await page.goto("/search");
  await page.getByRole("button", { name: "Código de barras" }).click();
  await page.getByRole("button", { name: "Ler com a câmera" }).click();

  const dialog = page.getByRole("dialog", { name: "Ler código de barras" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeHidden({ timeout: 15_000 });

  await expect(page.getByLabel("Código de barras")).toHaveValue(GTIN);
  await expect(page.getByText("Açaí tradicional", { exact: true })).toBeVisible();
  expect(searched).toEqual([GTIN]);
  await expect(page).toHaveURL(new RegExp(`barcode=${GTIN}`));
});

test("sem permissão, explica e volta a digitar", async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("negado", "NotAllowedError"));
  });
  await page.route("**/health", (route) => route.fulfill({ json: { status: "ok", database: "available" } }));

  await page.goto("/search");
  await page.getByRole("button", { name: "Código de barras" }).click();
  const open = page.getByRole("button", { name: "Ler com a câmera" });
  await open.click();

  await expect(page.getByRole("alert")).toContainText("Sem permissão para usar a câmera");
  await page.getByRole("button", { name: "Digitar o código" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(open).toBeFocused();
});
