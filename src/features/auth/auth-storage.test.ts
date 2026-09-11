import { beforeEach, describe, expect, it } from "vitest";
import { readToken, removeToken, saveToken } from "./auth-storage";

describe("armazenamento da sessão", () => {
  beforeEach(() => localStorage.clear());

  it("salva, recupera e remove o JWT", () => {
    expect(readToken()).toBeNull();
    saveToken("token-de-teste");
    expect(readToken()).toBe("token-de-teste");
    removeToken();
    expect(readToken()).toBeNull();
  });
});
