import "server-only";

export type LocaleFieldValue = { locale: string } & Record<string, string | null>;

/**
 * Collect `tr_<LOCALE>_<field>` inputs from a flat FormData into one entry
 * per locale. The first entry in `fields` is the PRIMARY field (e.g. name /
 * title) — locales whose primary field is blank are skipped, so a language
 * the admin never filled in produces no translation row. Other fields are
 * trimmed with "" → null.
 *
 * Shared by the specialty + health-test admin forms (services have their
 * own richer parser in service-form-parse.ts).
 */
export function parseLocaleTranslations(
  formData: FormData,
  fields: readonly string[],
): LocaleFieldValue[] {
  const [primary] = fields;
  if (!primary) return [];

  const seen = new Set<string>();
  const result: LocaleFieldValue[] = [];
  const primaryKey = new RegExp(`^tr_([A-Za-z]{2,})_${primary}$`);

  for (const key of formData.keys()) {
    const match = primaryKey.exec(key);
    if (!match) continue;
    const locale = match[1].toUpperCase();
    if (seen.has(locale)) continue;
    seen.add(locale);

    const primaryValue = String(formData.get(`tr_${locale}_${primary}`) ?? "").trim();
    if (primaryValue === "") continue;

    const entry: LocaleFieldValue = { locale };
    for (const field of fields) {
      const raw = String(formData.get(`tr_${locale}_${field}`) ?? "").trim();
      entry[field] = raw === "" ? null : raw;
    }
    result.push(entry);
  }
  return result;
}
