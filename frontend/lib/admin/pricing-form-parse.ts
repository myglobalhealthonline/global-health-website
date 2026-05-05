import "server-only";

function optionalInt(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function parsePricingBodyFromForm(formData: FormData) {
  return {
    countryId: String(formData.get("countryId") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priceCents: optionalInt(formData, "priceCents"),
    currencyCode: String(formData.get("currencyCode") ?? "").trim(),
    interval: String(formData.get("interval") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  };
}
