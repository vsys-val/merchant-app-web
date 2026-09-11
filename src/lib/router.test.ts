import { describe, expect, it } from "vitest";
import { parsePath } from "./router";

describe("parsePath", () => {
  it("reconhece as rotas públicas e protegidas", () => {
    expect(parsePath("/")).toEqual({ name: "home" });
    expect(parsePath("/account")).toEqual({ name: "account" });
    expect(parsePath("/products/new")).toEqual({ name: "create-product" });
  });

  it("extrai o ID numérico do produto", () => {
    expect(parsePath("/products/42")).toEqual({ name: "product", productId: 42 });
    expect(parsePath("/products/42/")).toEqual({ name: "product", productId: 42 });
  });

  it("trata caminhos desconhecidos e IDs inválidos como início", () => {
    expect(parsePath("/nao-existe")).toEqual({ name: "home" });
    expect(parsePath("/products/abc")).toEqual({ name: "home" });
  });
});
