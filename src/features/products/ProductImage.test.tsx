import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProductImage } from "./ProductImage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PHOTO = "https://images.openfoodfacts.org/images/products/789/100/010/0103/front_pt.12.400.jpg";
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => act(() => root.unmount()));

describe("ProductImage", () => {
  it("mostra a foto sob demanda, sem enviar a página de origem, com texto alternativo", () => {
    act(() => root.render(<ProductImage product={{ name: "Biscoito Recheado", brand: "Nestlé", category: "food", image_url: PHOTO }} size="thumb" />));
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe(PHOTO);
    expect(image.getAttribute("alt")).toBe("Embalagem de Biscoito Recheado, Nestlé");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("usa o ícone da categoria quando não há foto", () => {
    act(() => root.render(<ProductImage product={{ name: "Detergente", brand: "Ypê", category: "cleaning", image_url: null }} size="thumb" />));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".productImage--empty svg")).not.toBeNull();
  });

  it("volta para o ícone quando a foto não carrega", () => {
    act(() => root.render(<ProductImage product={{ name: "Suco", brand: "Del Valle", category: "beverages", image_url: PHOTO }} size="hero" />));
    act(() => container.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".productImage--empty")).not.toBeNull();
  });
});
