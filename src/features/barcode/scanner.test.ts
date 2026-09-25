import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerError, startScanner } from "./scanner";

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] } as unknown as MediaStream;

function withCamera(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(getUserMedia) } });
}

function withNativeDetector(readings: string[][]) {
  const detect = vi.fn(async () => (readings.shift() ?? []).map((rawValue) => ({ rawValue })));
  class FakeDetector {
    static getSupportedFormats = async () => ["ean_13", "qr_code"];
    detect = detect;
  }
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = FakeDetector;
  return detect;
}

function readyVideo() {
  const video = document.createElement("video");
  Object.defineProperty(video, "readyState", { value: 4 });
  return video;
}

describe("startScanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    track.stop.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("usa o leitor nativo, ignora leituras com dígito errado e para a câmera ao ler um GTIN válido", async () => {
    withCamera(async () => stream);
    withNativeDetector([[], ["7891000100104"], ["7891000100103"]]);
    const onCode = vi.fn();

    const session = await startScanner(readyVideo(), onCode);
    expect(session.engine).toBe("native");
    await vi.advanceTimersByTimeAsync(150 * 4);

    expect(onCode).toHaveBeenCalledTimes(1);
    expect(onCode).toHaveBeenCalledWith("7891000100103");
    expect(track.stop).toHaveBeenCalled();
  });

  it("para a câmera quando a sessão é encerrada", async () => {
    withCamera(async () => stream);
    withNativeDetector([]);
    const session = await startScanner(readyVideo(), vi.fn());
    session.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NotAllowedError", "denied"],
    ["NotFoundError", "no_camera"],
    ["AbortError", "error"],
  ])("traduz %s em %s", async (name, reason) => {
    withCamera(async () => { throw new DOMException("x", name); });
    await expect(startScanner(readyVideo(), vi.fn())).rejects.toEqual(new ScannerError(reason as never));
  });

  it("informa quando o navegador não oferece câmera", async () => {
    await expect(startScanner(readyVideo(), vi.fn())).rejects.toMatchObject({ reason: "unsupported" });
  });
});
