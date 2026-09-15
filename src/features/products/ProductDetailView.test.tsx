import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api";
import { ProductDetailView } from "./ProductDetailView";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  deleteReview: vi.fn(),
  getCommunityReviews: vi.fn(),
  getProductDetail: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", user: { id: 1, name: "Pessoa teste" } }),
}));

vi.mock("./product-api", () => ({
  getCommunityReviews: mocks.getCommunityReviews,
  getProductDetail: mocks.getProductDetail,
}));

vi.mock("./review-api", () => ({ deleteReview: mocks.deleteReview }));
vi.mock("./ReviewForm", () => ({ ReviewForm: () => null }));

const review = {
  id: 7,
  repurchase_intent: "yes",
  quality: "adequate",
  expectation: "met",
  value_for_money: "fair",
  reasons: [{ aspect: "taste", perception: "positive" }],
  comment: "Avaliação de teste",
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
  your_review: review,
};

const reviewsPage = { items: [], page: 1, page_size: 20, total: 0 };

describe("ProductDetailView deletion confirmation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getProductDetail.mockResolvedValue(product);
    mocks.getCommunityReviews.mockResolvedValue(reviewsPage);
    mocks.deleteReview.mockResolvedValue(undefined);

    await act(async () => { root.render(<ProductDetailView productId={3} onBack={() => undefined} />); });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function button(label: string) {
    const match = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);
    if (!match) throw new Error(`Botão não encontrado: ${label}`);
    return match;
  }

  it("does not delete when the user cancels", async () => {
    const trigger = button("Excluir");
    trigger.focus();
    await act(async () => { trigger.click(); });
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Excluir sua avaliação?");
    expect(document.activeElement?.textContent).toBe("Cancelar");

    await act(async () => { button("Cancelar").click(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.deleteReview).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes with Escape and keeps keyboard focus inside the dialog", async () => {
    const trigger = button("Excluir");
    trigger.focus();
    await act(async () => { trigger.click(); });

    const cancel = button("Cancelar");
    await act(async () => {
      cancel.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement?.textContent).toBe("Excluir avaliação");

    await act(async () => {
      document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("deletes only after explicit confirmation and reloads the product", async () => {
    await act(async () => { button("Excluir").click(); });
    expect(mocks.deleteReview).not.toHaveBeenCalled();

    mocks.getProductDetail.mockResolvedValue({ ...product, your_review: null });
    await act(async () => { button("Excluir avaliação").click(); });

    expect(mocks.deleteReview).toHaveBeenCalledWith(7, "test-token");
    expect(mocks.getProductDetail).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain("Você ainda não avaliou este produto.");
  });

  it("shows deletion failures inside the confirmation dialog", async () => {
    mocks.deleteReview.mockRejectedValue(new ApiError("Falha de teste", 503));
    await act(async () => { button("Excluir").click(); });
    await act(async () => { button("Excluir avaliação").click(); });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe("Falha de teste");
  });
});
