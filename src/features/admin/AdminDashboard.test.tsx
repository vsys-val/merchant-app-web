import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";
import { overviewFixture } from "./overview-fixture";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ getAdminOverview: vi.fn(), user: { id: 1, name: "Admin", email: "a@example.com", email_verified: true, is_admin: true } }));

vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ token: "admin-token", user: mocks.user }) }));
vi.mock("./admin-api", () => ({ getAdminOverview: mocks.getAdminOverview }));

describe("AdminDashboard", () => {
  let container: HTMLDivElement;
  let root: Root;

  async function mount() {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<AdminDashboard onBack={vi.fn()} />));
  }

  beforeEach(() => {
    mocks.user.is_admin = true;
    mocks.getAdminOverview.mockImplementation((days: number) => Promise.resolve(overviewFixture(days)));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const tile = (label: string) => Array.from(container.querySelectorAll(".statTile")).find((element) => element.querySelector("h3")?.textContent?.startsWith(label));

  it("mostra os indicadores com a meta e o estado de cada um", async () => {
    await mount();

    expect(mocks.getAdminOverview).toHaveBeenCalledWith(30, "admin-token", expect.any(AbortSignal));
    expect(tile("North Star")?.querySelector(".statValue")?.textContent).toBe("2,5");
    expect(tile("North Star")?.textContent).toContain("Dentro da meta");
    expect(tile("Buscas com resultado")?.textContent).toContain("55%");
    expect(tile("Buscas com resultado")?.textContent).toContain("Fora da meta");
    expect(tile("Abandono da avaliação")?.textContent).toContain("Fora da meta");
    expect(tile("Latência p95")?.textContent).toContain("≤ 400 ms");
    expect(container.textContent).toContain("E-mail desligado");
    expect(container.textContent).toContain("API · abc1234");
  });

  it("troca o período e busca de novo", async () => {
    await mount();
    const seven = Array.from(container.querySelectorAll<HTMLButtonElement>(".adminFilters button")).find((button) => button.textContent === "Últimos 7 dias")!;
    await act(async () => seven.click());
    expect(mocks.getAdminOverview).toHaveBeenLastCalledWith(7, "admin-token", expect.any(AbortSignal));
    expect(seven.getAttribute("aria-pressed")).toBe("true");
  });

  it("oferece a tabela de cada gráfico e descreve o gráfico para leitores de tela", async () => {
    await mount();
    const chart = Array.from(container.querySelectorAll("figure")).find((figure) => figure.querySelector("h3")?.textContent === "Requisições por dia")!;
    expect(chart.querySelector("svg")?.getAttribute("aria-label")).toContain("máximo");
    expect(chart.querySelectorAll("details tbody tr")).toHaveLength(30);
  });

  it("não mostra dados a quem não é administrador", async () => {
    mocks.user.is_admin = false;
    await mount();
    expect(mocks.getAdminOverview).not.toHaveBeenCalled();
    expect(container.textContent).toContain("restrita à administração");
  });
});
