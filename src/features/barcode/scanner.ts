import { isValidGtin } from "./gtin";

export type ScannerEngine = "native" | "zxing";
export type ScannerFailure = "unsupported" | "denied" | "no_camera" | "error";

export class ScannerError extends Error {
  constructor(readonly reason: ScannerFailure) {
    super(reason);
  }
}

export interface ScannerSession {
  engine: ScannerEngine;
  stop(): void;
}

// Formatos de produtos de varejo. UPC-E fica de fora: não é um GTIN-8 e é raro no Brasil.
const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a"];
const SCAN_INTERVAL_MS = 150;

interface NativeDetector { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>; }
interface NativeDetectorClass {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

function nativeDetectorClass(): NativeDetectorClass | undefined {
  return (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
}

async function canUseNative(): Promise<boolean> {
  const Detector = nativeDetectorClass();
  if (!Detector) return false;
  try {
    const supported = await Detector.getSupportedFormats();
    return NATIVE_FORMATS.some((format) => supported.includes(format));
  } catch {
    return false;
  }
}

async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new ScannerError("unsupported");
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (caught) {
    const name = caught instanceof DOMException ? caught.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") throw new ScannerError("denied");
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new ScannerError("no_camera");
    throw new ScannerError("error");
  }
}

/**
 * Abre a câmera traseira e chama `onCode` com o primeiro GTIN válido lido.
 * Usa o BarcodeDetector nativo quando existe (Android/Chrome) e, sem ele,
 * carrega o ZXing sob demanda, para não pesar no carregamento do app.
 */
export async function startScanner(video: HTMLVideoElement, onCode: (code: string) => void): Promise<ScannerSession> {
  const stream = await openCamera();
  let stopped = false;
  let stopEngine = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    stopEngine();
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
  const accept = (raw: string) => {
    const code = raw.trim();
    if (stopped || !isValidGtin(code)) return false;
    stop();
    onCode(code);
    return true;
  };

  try {
    if (await canUseNative()) {
      const detector = new (nativeDetectorClass()!)({ formats: NATIVE_FORMATS });
      video.srcObject = stream;
      await video.play();
      const timer = window.setInterval(async () => {
        if (stopped || video.readyState < 2) return;
        try {
          const found = await detector.detect(video);
          found.some((item) => accept(item.rawValue));
        } catch {
          // Um quadro ilegível não interrompe a leitura.
        }
      }, SCAN_INTERVAL_MS);
      stopEngine = () => window.clearInterval(timer);
      return { engine: "native", stop };
    }

    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]);
    const hints = new Map<number, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: SCAN_INTERVAL_MS });
    const controls = await reader.decodeFromStream(stream, video, (result) => {
      if (result) accept(result.getText());
    });
    stopEngine = () => controls.stop();
    if (stopped) controls.stop();
    return { engine: "zxing", stop };
  } catch (caught) {
    stop();
    throw caught instanceof ScannerError ? caught : new ScannerError("error");
  }
}
