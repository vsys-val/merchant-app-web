import { describe, expect, it } from "vitest";
import { isValidGtin } from "./gtin";

describe("isValidGtin", () => {
  it("aceita EAN-13, EAN-8, UPC-A e GTIN-14 com dígito verificador correto", () => {
    expect(isValidGtin("7891000100103")).toBe(true);
    expect(isValidGtin("96385074")).toBe(true);
    expect(isValidGtin("036000291452")).toBe(true);
    expect(isValidGtin("17891000100100")).toBe(true);
  });

  it("recusa dígito verificador errado, tamanhos inválidos e letras", () => {
    expect(isValidGtin("7891000100104")).toBe(false);
    expect(isValidGtin("1234567")).toBe(false);
    expect(isValidGtin("12345678901")).toBe(false);
    expect(isValidGtin("789100010010a")).toBe(false);
  });
});
