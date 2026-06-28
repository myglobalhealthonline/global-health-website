import "server-only";

/** One locale's CMS content, parsed from the `tr_<LOCALE>_<field>` inputs.
 *  `name` is always non-empty (the parser skips locales with a blank name).
 *  Nullable fields are null when the textarea/input was left blank. */
export type ParsedServiceTranslation = {
  locale: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
};

type ParsedServiceBody = {
  countryId: string;
  kind: string;
  slug: string;
  /** Base display fields, derived from the default-locale tab. The backend
   *  still writes these to the Service base columns (Option B), while
   *  `translations` carries every locale (including the default). */
  name: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroDescription: string;
  detailBody: string;
  ctaLabel: string;
  translations: ParsedServiceTranslation[];
  legacyPath: string;
  sortOrder: number | undefined;
  durationMinutes: number | undefined;
  basePriceCents: number | undefined;
  currencyCode: string;
  imagePath: string;
  galleryImagePaths: string[];
  doctorIds: string[];
  /** Shipping fee in cents charged per item at checkout. 0 = no
   *  shipping (the default for online consultations). */
  shippingCents: number;
  isActive: boolean;
};

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

type ParseServiceFormResult =
  | { ok: true; data: ParsedServiceBody }
  | { ok: false; error: string };

function optionalInt(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  return n;
}

function parsePriceToCents(rawValue: string): number | undefined {
  const raw = rawValue.trim();
  if (raw === "") return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Starting price must be a valid amount like 45 or 45.00");
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Starting price must be zero or greater");
  }

  return Math.round(value * 100);
}

function parseShippingToCents(rawValue: string): number {
  const raw = rawValue.trim();
  if (raw === "") return 0;
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Shipping must be a valid amount like 5 or 5.00");
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Shipping must be zero or greater");
  }
  return Math.round(value * 100);
}

export function formatServicePriceInput(basePriceCents: number | null | undefined): string {
  if (basePriceCents === null || basePriceCents === undefined) return "";
  return (basePriceCents / 100).toFixed(2);
}

/** Locale tab descriptor used by the admin form + parser. Codes are
 *  uppercase LocaleCode values (EN, PT, …). */
export type ServiceLocaleTab = { code: string; isDefault: boolean };

/**
 * Resolve which locale tabs to render for a service form from the parent
 * country's enabled locales. Always includes the default locale (so the
 * required base content always has a home), even on older countries with
 * no CountryLocale rows.
 */
export function resolveCountryLocaleTabs(
  country: { defaultLocale?: string | null; countryLocales?: { locale: string }[] } | undefined,
): { locales: ServiceLocaleTab[]; defaultLocale: string } {
  const defaultLocale = (country?.defaultLocale ?? "EN").toUpperCase();
  const seen = new Set<string>();
  const locales: ServiceLocaleTab[] = [];
  for (const row of country?.countryLocales ?? []) {
    const code = row.locale.toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);
    locales.push({ code, isDefault: code === defaultLocale });
  }
  if (!seen.has(defaultLocale)) {
    locales.unshift({ code: defaultLocale, isDefault: true });
  }
  return { locales, defaultLocale };
}

/** Trim a `tr_<LOCALE>_<field>` value; "" → null for nullable fields. */
function trNullable(formData: FormData, locale: string, field: string): string | null {
  const raw = String(formData.get(`tr_${locale}_${field}`) ?? "").trim();
  return raw === "" ? null : raw;
}

/**
 * Collect one ParsedServiceTranslation per locale that has a non-empty
 * name. Locales with a blank name are skipped (no translation written) —
 * except the default locale, whose blank name surfaces as an empty base
 * `name` and is rejected by backend validation.
 */
function parseTranslations(formData: FormData): ParsedServiceTranslation[] {
  const locales = new Set<string>();
  for (const key of formData.keys()) {
    const match = /^tr_([A-Za-z]{2,})_name$/.exec(key);
    if (match) locales.add(match[1].toUpperCase());
  }

  const result: ParsedServiceTranslation[] = [];
  for (const locale of locales) {
    const name = String(formData.get(`tr_${locale}_name`) ?? "").trim();
    if (name === "") continue;
    result.push({
      locale,
      name,
      summary: trNullable(formData, locale, "summary"),
      seoTitle: trNullable(formData, locale, "seoTitle"),
      seoDescription: trNullable(formData, locale, "seoDescription"),
      heroTitle: trNullable(formData, locale, "heroTitle"),
      heroDescription: trNullable(formData, locale, "heroDescription"),
      detailBody: trNullable(formData, locale, "detailBody"),
      ctaLabel: trNullable(formData, locale, "ctaLabel"),
    });
  }
  return result;
}

export function parseServiceBodyFromForm(
  formData: FormData,
  defaultLocale: string,
): ParseServiceFormResult {
  const priceRaw = String(formData.get("basePrice") ?? "").trim();
  const upperDefault = defaultLocale.toUpperCase();

  try {
    const translations = parseTranslations(formData);
    // Base display columns are seeded from the default-locale tab so the
    // Service base row stays authoritative for the default locale.
    const base = translations.find((t) => t.locale === upperDefault);

    return {
      ok: true,
      data: {
        countryId: String(formData.get("countryId") ?? "").trim(),
        kind: String(formData.get("kind") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        name: base?.name ?? "",
        summary: base?.summary ?? "",
        seoTitle: base?.seoTitle ?? "",
        seoDescription: base?.seoDescription ?? "",
        heroTitle: base?.heroTitle ?? "",
        heroDescription: base?.heroDescription ?? "",
        detailBody: base?.detailBody ?? "",
        ctaLabel: base?.ctaLabel ?? "",
        translations,
        legacyPath: String(formData.get("legacyPath") ?? "").trim(),
        sortOrder: optionalInt(formData, "sortOrder"),
        durationMinutes: optionalInt(formData, "durationMinutes"),
        basePriceCents: parsePriceToCents(priceRaw),
        currencyCode: String(formData.get("currencyCode") ?? "").trim(),
        imagePath: String(formData.get("imagePath") ?? "").trim(),
        galleryImagePaths: parseLines(String(formData.get("galleryImagePaths") ?? "")),
        // Multi-checkbox doctor picker — `name="doctorIds"` appears on
        // each checkbox plus a sentinel hidden input, so getAll returns
        // all checked ids plus an empty string when the admin cleared
        // every box. Filter falsy + de-dupe.
        doctorIds: Array.from(
          new Set(
            formData
              .getAll("doctorIds")
              .map((v) => String(v).trim())
              .filter(Boolean),
          ),
        ),
        shippingCents: parseShippingToCents(String(formData.get("shipping") ?? "")),
        isActive: formData.get("isActive") === "on",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid service form input",
    };
  }
}
