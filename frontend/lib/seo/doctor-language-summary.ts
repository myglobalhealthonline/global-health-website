/**
 * Concise `{languages}` value for doctor SEO metadata (title/description
 * templates already supply the "Languages:" label and trailing punctuation —
 * this only formats the list itself). The visible profile page keeps
 * showing every language; this is metadata-only, capped so a doctor with
 * many languages doesn't blow the meta-description length budget.
 */
export function summarizeLanguagesForMetadata(languages: string[]): string {
  const list = languages.filter(Boolean);
  if (list.length === 0) return "English";
  if (list.length === 1) return list[0];
  if (list.length <= 3) {
    return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  }
  const shown = list.slice(0, 3);
  return `${shown.join(", ")} +${list.length - shown.length} more`;
}
