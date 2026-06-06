import "server-only";
import {
  parseLocaleTranslations,
  type LocaleFieldValue,
} from "@/lib/admin/translation-form-parse";

type HealthTestExtraSection = {
  heading: string;
  body: string;
};

type ParsedHealthTestBody = {
  countryId: string;
  slug: string;
  /** Base display fields, derived from the default-locale tab. */
  title: string;
  shortDescription: string;
  priceCents: number | undefined;
  currencyCode: string;
  productImagePath: string;
  galleryImagePaths: string[];
  sampleType: string;
  resultsTimeline: string;
  heroButtonLabel: string;
  detailIntro: string;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections: HealthTestExtraSection[] | null;
  sortOrder: number;
  isActive: boolean;
  /** null = unlimited; 0 = sold out; 1–5 surfaces a "Only N left" badge. */
  stock: number | null;
  /** Shipping fee in cents charged per kit. 0 = free shipping. */
  shippingCents: number;
  seoTitle: string;
  seoDescription: string;
  legacyPath: string;
  /** Per-locale CMS content (title, shortDescription, sampleType,
   *  resultsTimeline, seoTitle, seoDescription). */
  translations: LocaleFieldValue[];
};

/** Translatable fields exposed in the health-test tabs (title is primary). */
export const HEALTH_TEST_TRANSLATABLE_FIELDS = [
  "title",
  "shortDescription",
  "sampleType",
  "resultsTimeline",
  "seoTitle",
  "seoDescription",
] as const;

type ParseHealthTestFormResult =
  | { ok: true; data: ParsedHealthTestBody }
  | { ok: false; error: string };

function parsePriceToCents(rawValue: string): number | undefined {
  const raw = rawValue.trim();
  if (raw === "") return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error("Price must be a valid amount like 84 or 84.00");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error("Price must be zero or greater");
  return Math.round(value * 100);
}

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseOptionalStock(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null; // empty = unlimited
  if (!/^\d+$/.test(trimmed)) throw new Error("Stock must be a whole number (0 or more), or leave blank for unlimited");
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) throw new Error("Stock must be zero or greater");
  return value;
}

function parseShippingToCents(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed))
    throw new Error("Shipping must be a valid amount like 5 or 5.00");
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Shipping must be zero or greater");
  return Math.round(value * 100);
}

function parseExtraSections(raw: string): HealthTestExtraSection[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const blocks = trimmed.split(/\r?\n\r?\n+/);
  const sections: HealthTestExtraSection[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error("Each extra section must have a heading on the first line and body below it");
    }
    sections.push({
      heading: lines[0],
      body: lines.slice(1).join("\n"),
    });
  }
  return sections;
}

export function formatHealthTestPriceInput(priceCents: number | null | undefined): string {
  if (priceCents === null || priceCents === undefined) return "";
  return (priceCents / 100).toFixed(2);
}

export function formatHealthTestLines(lines: string[] | null | undefined): string {
  return (lines ?? []).join("\n");
}

export function formatHealthTestExtraSections(
  sections: Array<{ heading: string; body: string }> | null | undefined,
): string {
  return (sections ?? []).map((section) => `${section.heading}\n${section.body}`).join("\n\n");
}

export function parseHealthTestBodyFromForm(
  formData: FormData,
  defaultLocale: string,
): ParseHealthTestFormResult {
  try {
    const translations = parseLocaleTranslations(formData, HEALTH_TEST_TRANSLATABLE_FIELDS);
    // Base columns are seeded from the default-locale tab (Option B).
    const base = translations.find((t) => t.locale === defaultLocale.toUpperCase());
    return {
      ok: true,
      data: {
        countryId: String(formData.get("countryId") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        title: base?.title ?? "",
        shortDescription: base?.shortDescription ?? "",
        priceCents: parsePriceToCents(String(formData.get("price") ?? "")),
        currencyCode: String(formData.get("currencyCode") ?? "").trim(),
        productImagePath: String(formData.get("productImagePath") ?? "").trim(),
        galleryImagePaths: parseLines(String(formData.get("galleryImagePaths") ?? "")),
        sampleType: base?.sampleType ?? "",
        resultsTimeline: base?.resultsTimeline ?? "",
        heroButtonLabel: String(formData.get("heroButtonLabel") ?? "").trim(),
        detailIntro: String(formData.get("detailIntro") ?? "").trim(),
        whatThisTestCovers: parseLines(String(formData.get("whatThisTestCovers") ?? "")),
        whyGetTested: parseLines(String(formData.get("whyGetTested") ?? "")),
        extraSections: parseExtraSections(String(formData.get("extraSections") ?? "")),
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        isActive: formData.get("isActive") === "on",
        stock: parseOptionalStock(String(formData.get("stock") ?? "")),
        shippingCents: parseShippingToCents(String(formData.get("shipping") ?? "")),
        seoTitle: base?.seoTitle ?? "",
        seoDescription: base?.seoDescription ?? "",
        legacyPath: String(formData.get("legacyPath") ?? "").trim(),
        translations,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid health test form input",
    };
  }
}
