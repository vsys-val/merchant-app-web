import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ProductAttribution } from "./ProductAttribution";
import type { ProductPublic } from "./product-api";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const base: ProductPublic = { id: 1, name: "Shampoo", brand: "Marca", variant: null, quantity: 100, unit: "ml", category: "personal_hygiene", barcode: null, image_url: "https://images.openbeautyfacts.org/photo.jpg" };
function render(product: ProductPublic) {
  const element = document.createElement("div");
  const root = createRoot(element);
  act(() => root.render(<figure><ProductAttribution product={product} /></figure>));
  const html = element.innerHTML;
  act(() => root.unmount());
  element.innerHTML = html;
  return element;
}
describe("ProductAttribution", () => {
  it("credits the supplied provider and original product with its verified license", () => {
    const element = render({ ...base, image_source: "Open Beauty Facts", source_url: "https://world.openbeautyfacts.org/product/123", image_license: "CC BY-SA 3.0", image_license_url: "https://creativecommons.org/licenses/by-sa/3.0/" });
    expect(element.textContent).toBe("Foto: Open Beauty Facts (CC BY-SA 3.0)");
    expect(element.querySelector("a")?.getAttribute("href")).toContain("openbeautyfacts.org/product/123");
    expect(element.querySelectorAll("a")).toHaveLength(2);
  });
  it("does not invent attribution or a license from the image hostname", () => {
    const element = render(base);
    expect(element.textContent).toContain("origem não informada");
    expect(element.textContent).toContain("licença não informada");
    expect(element.querySelector("a")).toBeNull();
  });
  it("never makes unsafe metadata URLs clickable", () => {
    const element = render({ ...base, image_source: "Fonte", source_url: "javascript:alert(1)", image_license: "Licença", image_license_url: "data:text/html,test" });
    expect(element.querySelector("a")).toBeNull();
  });
  it("rejects unrelated HTTPS destinations in metadata", () => {
    const element = render({ ...base, image_source: "Fonte", source_url: "https://openfoodfacts.org.attacker.test/product", image_license: "Licença", image_license_url: "https://other.test/terms" });
    expect(element.querySelector("a")).toBeNull();
  });
  it("omits photo credits for products without a photo", () => {
    expect(render({ ...base, image_url: null }).querySelector("figcaption")).toBeNull();
  });
});
