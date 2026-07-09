import fs from "node:fs";
import path from "node:path";

// Shared PDF design tokens — Variant K (approved 2026-07-09).
// Palette from Manual da Marca / DESIGN.md. Keep in sync with
// frontend/app/globals.css brand custom properties.
export const PDF_TOKENS = {
  night: "#0F2E25",
  forest: "#1D4B36",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FFFFFF",
  ivory: "#F6F8F1",
  lime: "#B0F122",
} as const;

export const PDF_SANS = `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`;
export const PDF_SERIF = `Georgia, "Times New Roman", serif`;

let cachedLogo: string | null = null;

/** Brand logo (dark ink, for white paper) as a data URL — no network fetch at render time. */
export function pdfLogoDataUrl(): string {
  if (cachedLogo) return cachedLogo;
  const p = path.join(process.cwd(), "assets", "brand", "global-health-dark.png");
  try {
    cachedLogo = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
  } catch {
    cachedLogo = ""; // templates guard with {{#if logoDataUrl}} / falsy check
  }
  return cachedLogo;
}

/** ECG pulse rule — brand motif (heartbeat from the logo). Full-width SVG, 6mm tall. */
export function pdfEcgRule(strokeColor: string = PDF_TOKENS.night, limePeak = true): string {
  return `<svg viewBox="0 0 600 24" preserveAspectRatio="none" style="display:block;width:100%;height:6mm;">
    <path d="M0 12 H250 L262 12 L268 12 L274 4 L282 20 L288 12 L300 12 H600" fill="none" stroke="${strokeColor}" stroke-width="1.2"/>
    ${limePeak ? `<path d="M262 12 L268 12 L274 4 L282 20 L288 12 L294 12" fill="none" stroke="${PDF_TOKENS.lime}" stroke-width="1.6"/>` : ""}
  </svg>`;
}
