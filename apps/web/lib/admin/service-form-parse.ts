import "server-only";

type ParsedServiceBody = {
  countryId: string;
  kind: string;
  slug: string;
  name: string;
  summary: string;
  heroTitle: string;
  heroDescription: string;
  detailBody: string;
  ctaLabel: string;
  legacyPath: string;
  sortOrder: number | undefined;
  specialtyId: string | null;
  durationMinutes: number | undefined;
  basePriceCents: number | undefined;
  currencyCode: string;
  imagePath: string;
  isActive: boolean;
};

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

export function formatServicePriceInput(basePriceCents: number | null | undefined): string {
  if (basePriceCents === null || basePriceCents === undefined) return "";
  return (basePriceCents / 100).toFixed(2);
}

export function parseServiceBodyFromForm(formData: FormData): ParseServiceFormResult {
  const specialtyRaw = String(formData.get("specialtyId") ?? "").trim();
  const priceRaw = String(formData.get("basePrice") ?? "").trim();

  try {
    return {
      ok: true,
      data: {
        countryId: String(formData.get("countryId") ?? "").trim(),
        kind: String(formData.get("kind") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        summary: String(formData.get("summary") ?? "").trim(),
        heroTitle: String(formData.get("heroTitle") ?? "").trim(),
        heroDescription: String(formData.get("heroDescription") ?? "").trim(),
        detailBody: String(formData.get("detailBody") ?? "").trim(),
        ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
        legacyPath: String(formData.get("legacyPath") ?? "").trim(),
        sortOrder: optionalInt(formData, "sortOrder"),
        specialtyId: specialtyRaw === "" ? null : specialtyRaw,
        durationMinutes: optionalInt(formData, "durationMinutes"),
        basePriceCents: parsePriceToCents(priceRaw),
        currencyCode: String(formData.get("currencyCode") ?? "").trim(),
        imagePath: String(formData.get("imagePath") ?? "").trim(),
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
