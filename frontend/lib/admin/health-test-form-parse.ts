import "server-only";

type HealthTestExtraSection = {
  heading: string;
  body: string;
};

type ParsedHealthTestBody = {
  countryId: string;
  slug: string;
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
  seoTitle: string;
  seoDescription: string;
  legacyPath: string;
};

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

export function parseHealthTestBodyFromForm(formData: FormData): ParseHealthTestFormResult {
  try {
    return {
      ok: true,
      data: {
        countryId: String(formData.get("countryId") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        title: String(formData.get("title") ?? "").trim(),
        shortDescription: String(formData.get("shortDescription") ?? "").trim(),
        priceCents: parsePriceToCents(String(formData.get("price") ?? "")),
        currencyCode: String(formData.get("currencyCode") ?? "").trim(),
        productImagePath: String(formData.get("productImagePath") ?? "").trim(),
        galleryImagePaths: parseLines(String(formData.get("galleryImagePaths") ?? "")),
        sampleType: String(formData.get("sampleType") ?? "").trim(),
        resultsTimeline: String(formData.get("resultsTimeline") ?? "").trim(),
        heroButtonLabel: String(formData.get("heroButtonLabel") ?? "").trim(),
        detailIntro: String(formData.get("detailIntro") ?? "").trim(),
        whatThisTestCovers: parseLines(String(formData.get("whatThisTestCovers") ?? "")),
        whyGetTested: parseLines(String(formData.get("whyGetTested") ?? "")),
        extraSections: parseExtraSections(String(formData.get("extraSections") ?? "")),
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        isActive: formData.get("isActive") === "on",
        seoTitle: String(formData.get("seoTitle") ?? "").trim(),
        seoDescription: String(formData.get("seoDescription") ?? "").trim(),
        legacyPath: String(formData.get("legacyPath") ?? "").trim(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid health test form input",
    };
  }
}
