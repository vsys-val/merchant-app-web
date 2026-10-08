import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { filtersToParams } from "./product-api";
import { parseSearchQuery, ProductSearch } from "./ProductSearch";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ searchProducts: vi.fn() }));

vi.mock("./product-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./product-api")>()),
  searchProducts: mocks.searchProducts,
}));

const emptyPage = { items: [], page: 1, page_size: 20, total: 0 };

describe("filtersToParams", () => {
  it("combina nome, marca e categoria e descarta campos vazios", () => {
    expect(filtersToParams({ name: " café ", brand: "", category: "food" }).toString())
      .toBe("name=caf%C3%A9&category=food");
  });

  it("usa o código de barras sozinho, como exige a API", () => {
    expect(filtersToParams({ name: "café", category: "food", barcode: "7891234567895" }, 2).toString())
      .toBe("barcode=7891234567895&page=2");
  });
});

describe("parseSearchQuery", () => {
  it("restaura filtros válidos e ignora categoria desconhecida", () => {
    expect(parseSearchQuery("?name=cafe&category=food&page=3")).toEqual({
      filters: { name: "cafe", brand: undefined, category: "food", barcode: undefined },
      page: 3,
    });
    expect(parseSearchQuery("?category=inexistente")).toBeNull();
    expect(parseSearchQuery("?all=1")?.page).toBe(1);
    expect(parseSearchQuery("")).toBeNull();
  });
});

describe("ProductSearch filters", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onQueryChange = vi.fn();

  async function mount(path = "/search") {
    window.history.replaceState(null, "", path);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<ProductSearch onBack={vi.fn()} onSelect={vi.fn()} onCreate={vi.fn()} onQueryChange={onQueryChange} />);
    });
  }

  beforeEach(() => mocks.searchProducts.mockResolvedValue(emptyPage));

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, "", "/");
  });

  function fill(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const nameInput = () => container.querySelector<HTMLInputElement>("#product-search")!;
  const brandInput = () => container.querySelector<HTMLInputElement>("#brand-search")!;
  const chip = (label: string) => Array.from(container.querySelectorAll<HTMLButtonElement>(".categoryFilter button")).find((button) => button.textContent === label)!;

  async function submit() {
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  it("combina nome, marca e categoria na mesma busca e registra na URL", async () => {
    await mount();
    fill(nameInput(), "detergente");
    fill(brandInput(), "Limpol");
    await act(async () => chip("Limpeza").click());

    expect(mocks.searchProducts).toHaveBeenLastCalledWith(
      { name: "detergente", brand: "Limpol", category: "cleaning" },
      1,
    );
    expect(chip("Limpeza").getAttribute("aria-pressed")).toBe("true");
    expect(window.location.search).toBe("?name=detergente&brand=Limpol&category=cleaning");
    expect(onQueryChange).toHaveBeenLastCalledWith("?name=detergente&brand=Limpol&category=cleaning");
    expect(container.textContent).toContain("Nada para “detergente” · marca “Limpol” · Limpeza.");
  });

  it("permite navegar só por categoria e voltar para todas", async () => {
    await mount();
    await act(async () => chip("Bebidas").click());
    expect(mocks.searchProducts).toHaveBeenLastCalledWith({ name: "", brand: "", category: "beverages" }, 1);

    await act(async () => chip("Todas").click());
    expect(mocks.searchProducts).toHaveBeenLastCalledWith({ name: "", brand: "", category: undefined }, 1);
    expect(window.location.search).toBe("?all=1");
  });

  it("recusa termos curtos antes de chamar a API", async () => {
    await mount();
    fill(brandInput(), "k");
    await submit();

    expect(mocks.searchProducts).not.toHaveBeenCalled();
    expect(container.querySelector("[role='alert']")?.textContent).toBe("Digite pelo menos 2 letras para a marca.");
  });

  it("busca por código de barras sem os demais filtros", async () => {
    await mount();
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Código de barras")!.click());
    expect(container.querySelector(".categoryFilter")).toBeNull();

    fill(container.querySelector<HTMLInputElement>("#barcode-search")!, "789-123");
    expect(container.querySelector<HTMLInputElement>("#barcode-search")!.value).toBe("789123");
    await submit();
    expect(mocks.searchProducts).not.toHaveBeenCalled();
    expect(container.querySelector("[role='alert']")?.textContent).toContain("8, 12, 13 ou 14 números");

    fill(container.querySelector<HTMLInputElement>("#barcode-search")!, "7891234567895");
    await submit();
    expect(mocks.searchProducts).toHaveBeenLastCalledWith({ barcode: "7891234567895" }, 1);
  });

  it("restaura a busca da URL ao voltar para a tela", async () => {
    await mount("/search?name=cafe&category=food&page=2");

    expect(nameInput().value).toBe("cafe");
    expect(chip("Alimentos").getAttribute("aria-pressed")).toBe("true");
    expect(mocks.searchProducts).toHaveBeenCalledWith(
      { name: "cafe", brand: undefined, category: "food", barcode: undefined },
      2,
    );
  });

  it("avisa quando só há produtos parecidos com o termo", async () => {
    const product = {
      id: 5, name: "Arroz integral", brand: "Tio João", variant: null, quantity: 1, unit: "un", category: "food", barcode: null,
      community_summary: { total_reviews: 0, repurchase_intent: { yes: 0, maybe: 0, no: 0 } }, your_repurchase_intent: null,
    };
    mocks.searchProducts.mockResolvedValue({ items: [product], page: 1, page_size: 20, total: 1, approximate: true });
    await mount();
    fill(nameInput(), "arros");
    await submit();

    const notice = container.querySelector('[role="status"]');
    expect(notice?.textContent).toBe("Nada exato para “arros”.Mostrando o mais parecido. Se não for este, cadastre o produto.");
    expect(container.querySelector(".resultsHeader")).toBeNull();
    expect(container.textContent).toContain("Arroz integral");
  });
  it("descarta a busca pendente ao mudar de modo", async () => {
    let resolve!: (page: typeof emptyPage) => void;
    mocks.searchProducts.mockReturnValue(new Promise((done) => { resolve = done; }));
    await mount("/search?name=cafe");
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Código de barras")!.click());
    await act(async () => { resolve(emptyPage); });
    expect(container.querySelector(".emptyState")).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Executar busca"]')?.disabled).toBe(false);
  });

  it("mantém somente o resultado da consulta mais recente", async () => {
    let resolve!: (page: typeof emptyPage) => void;
    mocks.searchProducts.mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValue(emptyPage);
    await mount("/search?name=cafe");
    await act(async () => { fill(nameInput(), "leite"); });
    await submit();
    await act(async () => { resolve(emptyPage); });
    expect(container.textContent).toContain("Nada para “leite”");
    expect(container.textContent).not.toContain("Nada para “cafe”");
  });

});
