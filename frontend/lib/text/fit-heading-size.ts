/**
 * Length-aware font-size for hero headlines.
 *
 * Hero titles use a fixed `clamp(min, viewport-term, max)` sized for the
 * default (usually English) copy. Translated or CMS-edited copy can run
 * much longer — the heading still wraps (headings cap `max-width` in
 * `ch`), but more/longer lines push past a capped-height hero section and
 * clip the content below it. Scaling the clamp's ceiling down as the text
 * grows keeps the same line count within a shorter total height instead of
 * truncating or overflowing.
 */
/** Default "ideal" character budget a hero heading is tuned for — shared
 *  between the font-size scaler and any CSS max-width (in `ch`) so long
 *  translated copy wraps instead of overflowing. */
export const IDEAL_HEADING_CHARS = 24;

export function fitHeadingFontSize(
  text: string,
  {
    minRem,
    maxRem,
    viewportTerm,
    idealChars,
    /** Height cap so hero type also shrinks on short viewports (landscape
     *  phones, short laptops) instead of filling the whole fold. `min()`
     *  only ever reduces the width-driven term, so tall screens keep the
     *  exact same size as before. */
    svhCap = 11,
  }: {
    minRem: number;
    maxRem: number;
    viewportTerm: string;
    idealChars: number;
    svhCap?: number;
  },
): string {
  const length = Math.max(text.trim().length, 1);
  const scale = Math.min(1, idealChars / length);
  const scaledMaxRem = Math.max(minRem, maxRem * scale);
  return `clamp(${minRem}rem, min(${viewportTerm}, ${svhCap}svh), ${scaledMaxRem}rem)`;
}
