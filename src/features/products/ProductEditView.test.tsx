import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api";
import { ProductEditView } from "./ProductEditView";
import { buildProductPatch } from "./ProductForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ getProductDetail: vi.fn(), updateProduct: vi.fn() }));

vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ token: "owner-token" }) }));
vi.mock("./product-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./product-api")>()),
  getProductDetail: mocks.getProductDetail,
  updateProduct: mocks.updateProduct,
}));

const product = {
  id: 7,
  name: "Detergente neutro",
  brand: "Ypê",
  variant: null,
  quantity: 500,
  unit: "ml" as const,
  category: "cleaning" as const,
  barcode: null,
};

const summary = (total: number) => ({
  total_reviews: total,
  repurchase_intent: { yes: 0, maybe: 0, no: 0 },
  quality: { high: 0, adequate: 0, low: 0 },
  expectation: { exceeded: 0, met: 0, not_met: 0 },
  value_for_money: { good: 0, fair: 0, poor: 0 },
});

describe("buildProductPatch", () => {
  const unchanged = { ...product, quantity: 500 };

  it("envia só o que mudou", () => {
    expect(buildProductPatch(product, unchanged)).toEqual({});
    expect(buildProductPatch(product, { ...unchanged, variant: "Limão" })).toEqual({ variant: "Limão" });
  });

  it("envia quantidade e unidade juntas", () => {
    expect(buildProductPatch(product, { ...unchanged, quantity: 1, unit: "L" })).toEqual({ quantity: 1, unit: "L" });
  });

  it("remove variante e código com null", () => {
    const withExtras = { ...product, variant: "Limão", barcode: "7891234567895" };
    expect(buildProductPatch(withExtras, { ...unchanged, variant: null, barcode: null })).toEqual({ variant: null, barcode: null });
  });
});

describe("ProductEditView", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSaved = vi.fn();
  const onOpenExisting = vi.fn();

  async function mount() {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<ProductEditView productId={7} onBack={vi.fn()} onSaved={onSaved} onOpenExisting={onOpenExisting} />);
    });
  }

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function fill(label: string, value: string) {
    const input = Array.from(container.querySelectorAll("label"))
      .find((element) => element.textContent?.startsWith(label))
      ?.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function submit() {
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  describe("sem avaliações de outras pessoas", () => {
    beforeEach(async () => {
      mocks.getProductDetail.mockResolvedValue({ ...product, community_summary: summary(0), your_review: null });
      await mount();
    });

    it("preenche o formulário e salva só a variante alterada", async () => {
      expect(container.querySelector("h1")?.textContent).toBe("Corrigir produto");
      mocks.updateProduct.mockResolvedValue({ ...product, variant: "Limão" });

      fill("Variante", "Limão");
      await submit();

      expect(mocks.updateProduct).toHaveBeenCalledWith(7, { variant: "Limão" }, "owner-token");
      expect(onSaved).toHaveBeenCalledWith(7);
    });

    it("não chama a API quando nada mudou", async () => {
      await submit();
      expect(mocks.updateProduct).not.toHaveBeenCalled();
      expect(container.querySelector("[role='status']")?.textContent).toBe("Nada foi alterado.");
    });

    it("explica o bloqueio quando outra pessoa avalia enquanto o formulário está aberto", async () => {
      mocks.updateProduct.mockRejectedValue(
        new ApiError("O produto não pode ser editado porque outra pessoa já o avaliou.", 409, "product_locked_by_reviews"),
      );
      fill("Variante", "Limão");
      await submit();
      expect(container.querySelector("[role='alert']")?.textContent).toContain("outra pessoa já o avaliou");
    });

    it("oferece o produto existente quando a correção gera duplicata", async () => {
      mocks.updateProduct.mockRejectedValue(
        new ApiError("Este produto já está cadastrado.", 409, "product_conflict", { existing_product_id: 3 }),
      );
      fill("Nome do produto", "Detergente limão");
      await submit();
      await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Ver produto já cadastrado"))!.click());
      expect(onOpenExisting).toHaveBeenCalledWith(3);
    });
  });

  it("avisa antes de preencher quando outra pessoa já avaliou", async () => {
    mocks.getProductDetail.mockResolvedValue({ ...product, community_summary: summary(2), your_review: null });
    await mount();

    expect(container.querySelector("form")).toBeNull();
    expect(container.textContent).toContain("2 pessoas já avaliaram este produto.");
  });
});
