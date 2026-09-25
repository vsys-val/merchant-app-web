import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Codificação EAN-13: padrões L, G e R de cada dígito e a paridade do primeiro dígito.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function ean13Modules(code: string): string {
  const digits = [...code].map(Number);
  const parity = PARITY[digits[0]];
  const left = digits.slice(1, 7).map((digit, index) => (parity[index] === "L" ? L : G)[digit]).join("");
  const right = digits.slice(7).map((digit) => R[digit]).join("");
  return `101${left}01010${right}101`;
}

/**
 * Grava um vídeo Y4M (formato aceito pela câmera falsa do Chromium) com um
 * EAN-13 preto sobre branco e devolve o caminho do arquivo.
 */
export function writeBarcodeVideo(code: string): string {
  const width = 640;
  const height = 360;
  const moduleWidth = 4;
  const modules = ean13Modules(code);
  const left = Math.floor((width - modules.length * moduleWidth) / 2);
  const top = Math.floor(height * 0.25);
  const bottom = Math.floor(height * 0.75);

  const luma = Buffer.alloc(width * height, 235);
  for (let y = top; y < bottom; y += 1) {
    for (let index = 0; index < modules.length; index += 1) {
      if (modules[index] !== "1") continue;
      luma.fill(16, y * width + left + index * moduleWidth, y * width + left + (index + 1) * moduleWidth);
    }
  }
  const chroma = Buffer.alloc((width / 2) * (height / 2) * 2, 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), luma, chroma]);
  const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`);

  const path = join(tmpdir(), `merchant-barcode-${code}.y4m`);
  writeFileSync(path, Buffer.concat([header, frame, frame]));
  return path;
}
