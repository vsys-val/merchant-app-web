import { describe, expect, it } from "vitest";
import { categoryLabels, getCategoryLabel } from "./category-labels";

describe("getCategoryLabel", () => {
  it("traduz todas as categorias técnicas da API", () => {
    expect(categoryLabels).toEqual({
      food: "Alimentos",
      beverages: "Bebidas",
      cleaning: "Limpeza",
      personal_hygiene: "Higiene pessoal",
      household_utilities: "Utilidades domésticas",
      other: "Outros",
    });
  });

  it("retorna o rótulo em português", () => {
    expect(getCategoryLabel("food")).toBe("Alimentos");
    expect(getCategoryLabel("household_utilities")).toBe("Utilidades domésticas");
  });
});
