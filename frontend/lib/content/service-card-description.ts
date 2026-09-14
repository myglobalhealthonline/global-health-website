const MAX_CARD_DESCRIPTION = 160;

/**
 * Text for listing/hub service cards. Uses the service's own `summary`; when
 * that is empty (Spain and Brazil carry null summaries, gated behind clinical
 * review) it falls back to the hero lede, HTML-stripped and cut at a word
 * boundary. Card-only: the service detail page already renders the hero, and
 * the booking step keeps reading the raw `summary`.
 *
 * `translatedFields` (null = legacy payload, trust everything) keeps a field
 * that fell back to the market default language off a card in another locale —
 * e.g. a Spanish summary on /spain/en when only the hero was translated.
 */
export function serviceCardDescription(
  summary: string | null | undefined,
  heroDescription: string | null | undefined,
  translatedFields: readonly string[] | null = null,
): string | null {
  const inLocale = (field: string) => translatedFields == null || translatedFields.includes(field);
  const own = summary?.trim();
  if (own && inLocale("summary")) return own;
  const text = inLocale("heroDescription")
    ? heroDescription
        ?.replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : null;
  if (!text) return null;
  if (text.length <= MAX_CARD_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_CARD_DESCRIPTION);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}
