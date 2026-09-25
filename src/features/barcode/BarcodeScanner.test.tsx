import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "./BarcodeScanner";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ startScanner: vi.fn(), track: vi.fn(), stop: vi.fn() }));

vi.mock("./scanner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./scanner")>()),
  startScanner: mocks.startScanner,
}));
vi.mock("../../lib/analytics", () => ({ track: mocks.track }));

describe("BarcodeScanner", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onDetected = vi.fn();
  const onClose = vi.fn();

  async function mount() {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => { root.render(<BarcodeScanner context="search" onDetected={onDetected} onClose={onClose} />); });
  }

  const text = () => container.querySelector(".scannerStatus")?.textContent;
  const button = (label: string) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("devolve o código lido e registra o sucesso com o leitor usado", async () => {
    let emit: (code: string) => void = () => {};
    mocks.startScanner.mockImplementation(async (_video: HTMLVideoElement, onCode: (code: string) => void) => {
      emit = onCode;
      return { engine: "zxing", stop: mocks.stop };
    });
    await mount();
    expect(text()).toBe("Aponte para o código de barras da embalagem.");
    expect(container.querySelector('[role="dialog"]')?.getAttribute("aria-labelledby")).toBe("scanner-title");

    await act(async () => emit("7891000100103"));
    expect(onDetected).toHaveBeenCalledWith("7891000100103");
    expect(mocks.track).toHaveBeenCalledWith("barcode_scan", { outcome: "detected", engine: "zxing", context: "search" });
  });

  it("explica a permissão negada e permite tentar de novo", async () => {
    const { ScannerError } = await import("./scanner");
    mocks.startScanner.mockRejectedValueOnce(new ScannerError("denied")).mockResolvedValueOnce({ engine: "native", stop: mocks.stop });
    await mount();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Sem permissão para usar a câmera");
    expect(mocks.track).toHaveBeenCalledWith("barcode_scan", { outcome: "denied", engine: null, context: "search" });

    await act(async () => button("Tentar de novo")!.click());
    expect(mocks.startScanner).toHaveBeenCalledTimes(2);
    expect(text()).toBe("Aponte para o código de barras da embalagem.");
  });

  it("fecha com Esc, desliga a câmera e registra o cancelamento", async () => {
    mocks.startScanner.mockResolvedValue({ engine: "native", stop: mocks.stop });
    await mount();
    await act(async () => {
      container.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();
    expect(mocks.track).toHaveBeenCalledWith("barcode_scan", { outcome: "cancelled", engine: "native", context: "search" });

    act(() => root.unmount());
    expect(mocks.stop).toHaveBeenCalled();
    root = createRoot(container);
  });
});
