import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api";
import { ProductForm } from "./ProductForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ createProduct: vi.fn() }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", user: { id: 1, name: "Pessoa teste" } }),
}));

vi.mock("./product-api", () => ({ createProduct: mocks.createProduct }));

describe("ProductForm duplicate handling", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onCreated = vi.fn();
  const onOpenExisting = vi.fn();

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<ProductForm onCancel={vi.fn()} onSaved={onCreated} onOpenExisting={onOpenExisting} />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function fill(label: string, value: string) {
    const input = Array.from(container.querySelectorAll("label"))
      .find((element) => element.textContent?.startsWith(label))
      ?.querySelector("input");
    if (!input) throw new Error(`Campo ${label} não encontrado`);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function submit() {
    fill("Nome do produto", "Café torrado");
    fill("Marca", "Marca X");
    fill("Quantidade", "500");
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  function findButton(text: string) {
    return Array.from(container.querySelectorAll("button")).find((button) => button.textContent === text);
  }

  it("offers the existing product when the API reports a single duplicate", async () => {
    mocks.createProduct.mockRejectedValue(
      new ApiError("Este produto já está cadastrado.", 409, "product_conflict", { existing_product_id: 42 }),
    );

    await submit();

    expect(container.querySelector("[role='alert']")?.textContent).toContain("Este produto já está cadastrado.");
    const openExisting = findButton("Ver produto já cadastrado");
    expect(openExisting).toBeDefined();
    await act(async () => openExisting!.click());
    expect(onOpenExisting).toHaveBeenCalledWith(42);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows only the message when the conflict matches several products", async () => {
    mocks.createProduct.mockRejectedValue(
      new ApiError("Este produto já está cadastrado.", 409, "product_conflict", null),
    );

    await submit();

    expect(container.querySelector("[role='alert']")?.textContent).toContain("Este produto já está cadastrado.");
    expect(findButton("Ver produto já cadastrado")).toBeUndefined();
  });

  it("does not offer navigation for other errors", async () => {
    mocks.createProduct.mockRejectedValue(
      new ApiError("Os dados enviados são inválidos.", 422, "validation_error", [{ existing_product_id: 42 }]),
    );

    await submit();

    expect(findButton("Ver produto já cadastrado")).toBeUndefined();
  });
});
