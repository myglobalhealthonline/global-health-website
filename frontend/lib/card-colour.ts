/**
 * Membership card colour derivation (§24.2) — BROWSER COPY.
 *
 * This is a verbatim duplicate of `backend/src/lib/card-colour.ts`. The level
 * editor derives the palette live as the admin drags the colour picker, and the
 * two packages build standalone, so there is no shared import to reach for. It
 * is ~40 lines of pure arithmetic with no dependencies; a shared package for one
 * function was the worse trade.
 *
 * If you change the maths here, change it there — the backend's
 * `card-colour.test.ts` pins the values BOTH copies must produce.
 */

/** Server-side validation for the stored column, matching the DB CHECK. */
export const CARD_HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** The card's light ink — the existing default face's text colour. */
const INK_LIGHT = "#F7FAEF";
/** The dark counterpart, deep enough to stay in the brand's forest range. */
const INK_DARK = "#08150F";

/**
 * The alpha `.gh-member-card__label` draws its text at. The contrast warning is
 * scored against THIS composited colour rather than the pure foreground: a
 * derived binary foreground always clears 4.5:1 on its own (the worst case in
 * the whole sRGB cube is ~4.58:1), so scoring the foreground would be a check
 * that can never fail (§24.2).
 */
const MUTED_ALPHA = 0.8;

/** Chrome is quieter than the label text — an accent, not another line of copy. */
const CHROME_ALPHA = 0.65;

/** WCAG AA for body text. Warned on, never blocked (§24.2). */
export const AA_THRESHOLD = 4.5;

export type CardPalette = {
  background: string;
  foreground: string;
  /** `foreground` at label alpha, flattened over `background`. */
  muted: string;
  /**
   * The accent the card's chrome uses — border, ring, pips, care mark, ECG
   * stroke. Derived too, not fixed: left as the default lime, the picker would
   * only work on dark backgrounds and a pale brand colour would come back
   * lime-on-ivory (§24.2).
   */
  chrome: string;
  /** Contrast of `muted` against `background`, to 2dp. */
  contrast: number;
  meetsAA: boolean;
};

function parseHex(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Flatten `fg` at `alpha` over an opaque `bg` — what the eye actually sees. */
function composite(
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as [number, number, number];
}

/**
 * Derive the full card palette from an admin-chosen background.
 *
 * Returns null for null/invalid input, which is the signal to keep today's
 * default face: the fallback is CSS, not a computed palette, so the default
 * card's fixed lime chrome is untouched (§24.2).
 */
export function deriveCardPalette(hex: string | null | undefined): CardPalette | null {
  if (!hex || !CARD_HEX_RE.test(hex)) return null;

  const bg = parseHex(hex);
  const light = parseHex(INK_LIGHT);
  const dark = parseHex(INK_DARK);

  // Whichever ink reads better on this background. This is the step that makes
  // white-on-pale unreachable.
  const foreground = contrastRatio(light, bg) >= contrastRatio(dark, bg) ? INK_LIGHT : INK_DARK;
  const muted = composite(parseHex(foreground), bg, MUTED_ALPHA);
  const contrast = contrastRatio(muted, bg);
  // Chrome sits between the muted text and the background, so it reads as an
  // accent rather than as more copy.
  const chrome = composite(parseHex(foreground), bg, CHROME_ALPHA);

  return {
    background: hex.toUpperCase(),
    foreground,
    muted: toHex(muted),
    chrome: toHex(chrome),
    contrast: Math.round(contrast * 100) / 100,
    meetsAA: contrast >= AA_THRESHOLD,
  };
}
