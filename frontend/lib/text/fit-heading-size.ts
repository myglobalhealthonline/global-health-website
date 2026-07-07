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
export function fitHeadingFontSize(
  text: string,
  {
    minRem,
    maxRem,
    viewportTerm,
    idealChars,
  }: { minRem: number; maxRem: number; viewportTerm: string; idealChars: number },
): string {
  const length = Math.max(text.trim().length, 1);
  const scale = Math.min(1, idealChars / length);
  const scaledMaxRem = Math.max(minRem, maxRem * scale);
  return `clamp(${minRem}rem, ${viewportTerm}, ${scaledMaxRem}rem)`;
}
