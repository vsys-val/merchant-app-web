import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mocks = vi.hoisted(() => ({ signOut: vi.fn(), navigate: vi.fn() }));
vi.mock("./features/auth/AuthContext", () => ({ useAuth: () => ({ user: { id: 1, name: "Ana" }, isLoading: false, signOut: mocks.signOut }) }));
vi.mock("./features/account/AccountDashboard", () => ({ AccountDashboard: () => <p>Minha conta</p> }));
vi.mock("./lib/router", () => ({ useRouter: () => ({ route: { name: "account" }, navigate: mocks.navigate }) }));
vi.mock("./lib/api", async (original) => ({ ...(await original<typeof import("./lib/api")>()), checkApiHealth: vi.fn().mockResolvedValue(true) }));
const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;
afterEach(() => act(() => root.unmount()));

it("mantém a tela da conta e permite tentar logout novamente após falha", async () => {
  mocks.signOut.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  root = createRoot(container);
  await act(async () => root.render(<App />));
  const button = container.querySelector<HTMLButtonElement>(".signOutButton")!;
  await act(async () => button.click());
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível sair da conta");
  expect(button.disabled).toBe(false);
  await act(async () => button.click());
  expect(mocks.navigate).toHaveBeenCalledWith("/");
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
