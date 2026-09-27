import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  exchangeLegacyToken: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("./auth-api", () => mocks);

const ANA = { id: 3, name: "Ana", email: "ana@example.com", email_verified: true, is_admin: false };
let auth: ReturnType<typeof useAuth>;
let container: HTMLDivElement;
let root: Root;

function Probe() {
  auth = useAuth();
  return null;
}

async function mount() {
  await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => act(() => root.unmount()));

describe("sessão em cookie", () => {
  it("recupera a conta pela API ao abrir, sem token no navegador", async () => {
    mocks.getCurrentUser.mockResolvedValue(ANA);
    await mount();
    expect(auth.isLoading).toBe(false);
    expect(auth.user).toEqual(ANA);
    expect(mocks.exchangeLegacyToken).not.toHaveBeenCalled();
  });

  it("segue anônima quando não há sessão", async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error("401"));
    await mount();
    expect(auth.isLoading).toBe(false);
    expect(auth.user).toBeNull();
  });

  it("troca o token antigo pelo cookie e apaga o token", async () => {
    localStorage.setItem("merchant.access-token", "jwt-antigo");
    mocks.exchangeLegacyToken.mockResolvedValue(undefined);
    mocks.getCurrentUser.mockResolvedValue(ANA);
    await mount();
    expect(mocks.exchangeLegacyToken).toHaveBeenCalledWith("jwt-antigo");
    expect(localStorage.getItem("merchant.access-token")).toBeNull();
    expect(auth.user).toEqual(ANA);
  });

  it("apaga o token antigo mesmo quando ele já expirou", async () => {
    localStorage.setItem("merchant.access-token", "jwt-expirado");
    mocks.exchangeLegacyToken.mockRejectedValue(new Error("401"));
    mocks.getCurrentUser.mockRejectedValue(new Error("401"));
    await mount();
    expect(localStorage.getItem("merchant.access-token")).toBeNull();
    expect(auth.user).toBeNull();
  });

  it("entra, guarda só a conta em memória e sai pelo endpoint de logout", async () => {
    mocks.getCurrentUser.mockRejectedValueOnce(new Error("401")).mockResolvedValue(ANA);
    mocks.login.mockResolvedValue({ access_token: "não usado", token_type: "bearer", expires_in: 86400 });
    await mount();

    await act(() => auth.signIn("ana@example.com", "frase secreta"));
    expect(auth.user).toEqual(ANA);
    expect(localStorage.length).toBe(0);

    mocks.logout.mockRejectedValue(new Error("sem rede"));
    await act(() => auth.signOut());
    expect(mocks.logout).toHaveBeenCalled();
    expect(auth.user).toBeNull();
  });
});
