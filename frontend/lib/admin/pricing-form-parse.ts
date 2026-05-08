import "server-only";

type ParsedPricingBody = {
  countryId: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number | undefined;
  currencyCode: string;
  interval: string;
  isActive: boolean;
};

type ParsePricingFormResult =
  | { ok: true; data: ParsedPricingBody }
  | { ok: false; error: string };

function parsePriceToCents(rawValue: string): number | undefined {
  const raw = rawValue.trim();
  if (raw === "") return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Price must be a valid amount like 45 or 45.00");
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Price must be zero or greater");
  }

  return Math.round(value * 100);
}

export function formatPricingPriceInput(priceCents: number | null | undefined): string {
  if (priceCents === null || priceCents === undefined) return "";
  return (priceCents / 100).toFixed(2);
}

export function parsePricingBodyFromForm(formData: FormData): ParsePricingFormResult {
  const priceRaw = String(formData.get("price") ?? "").trim();

  try {
    return {
      ok: true,
      data: {
        countryId: String(formData.get("countryId") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        priceCents: parsePriceToCents(priceRaw),
        currencyCode: String(formData.get("currencyCode") ?? "").trim(),
        interval: String(formData.get("interval") ?? "").trim(),
        isActive: formData.get("isActive") === "on",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid pricing form input",
    };
  }
}
