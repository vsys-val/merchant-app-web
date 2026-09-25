import { useEffect, useRef, useState } from "react";
import { track } from "../../lib/analytics";
import { useModalDialog } from "../../lib/useModalDialog";
import { ScannerEngine, ScannerError, ScannerFailure, startScanner } from "./scanner";
import "./barcode-scanner.css";

type Status = "starting" | "scanning" | ScannerFailure;

const failureMessages: Record<ScannerFailure, string> = {
  denied: "Sem permissão para usar a câmera. Libere a câmera para este site nas configurações do navegador ou digite o código.",
  no_camera: "Nenhuma câmera foi encontrada neste aparelho. Digite o código.",
  unsupported: "Este navegador não permite usar a câmera aqui. Digite o código.",
  error: "Não foi possível abrir a câmera. Tente de novo ou digite o código.",
};

/**
 * Leitura de código de barras em tela cheia. Fecha sozinha ao ler um GTIN
 * válido; qualquer falha oferece voltar a digitar.
 */
export function BarcodeScanner({ context, onDetected, onClose }: {
  context: "search" | "product_form";
  onDetected(code: string): void;
  onClose(): void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [attempt, setAttempt] = useState(0);
  const engineRef = useRef<ScannerEngine | null>(null);
  const finishedRef = useRef(false);
  const { dialogRef, onKeyDown } = useModalDialog(cancel);

  function finish(outcome: string) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    track("barcode_scan", { outcome, engine: engineRef.current, context });
  }

  function cancel() {
    finish("cancelled");
    onClose();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let session: { stop(): void } | null = null;
    let active = true;
    setStatus("starting");
    startScanner(video, (code) => {
      if (!active) return;
      navigator.vibrate?.(60);
      finish("detected");
      onDetected(code);
    })
      .then((started) => {
        session = started;
        engineRef.current = started.engine;
        if (active) setStatus("scanning");
        else started.stop();
      })
      .catch((caught: unknown) => {
        if (!active) return;
        const reason = caught instanceof ScannerError ? caught.reason : "error";
        setStatus(reason);
        finish(reason);
      });
    return () => {
      active = false;
      session?.stop();
    };
  }, [attempt]);

  const failed = status !== "starting" && status !== "scanning";
  return (
    <div className="scannerBackdrop">
      <section ref={dialogRef} className="scannerDialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title" tabIndex={-1} onKeyDown={onKeyDown}>
        <h2 id="scanner-title">Ler código de barras</h2>
        <div className="scannerViewport" data-status={status}>
          <video ref={videoRef} muted playsInline aria-hidden="true" />
          {!failed && <span className="scannerGuide" aria-hidden="true" />}
        </div>
        <p className="scannerStatus" role={failed ? "alert" : "status"}>
          {status === "starting" && "Abrindo a câmera…"}
          {status === "scanning" && "Aponte para o código de barras da embalagem."}
          {failed && failureMessages[status]}
        </p>
        <div className="scannerActions">
          {(status === "error" || status === "denied") && (
            <button className="secondaryButton" type="button" onClick={() => { finishedRef.current = false; setAttempt((value) => value + 1); }}>Tentar de novo</button>
          )}
          <button className="primaryButton" type="button" onClick={cancel}>Digitar o código</button>
        </div>
      </section>
    </div>
  );
}
