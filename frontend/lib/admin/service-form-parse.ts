import "server-only";

function optionalNumber(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function parseServiceBodyFromForm(formData: FormData) {
  const specialtyRaw = String(formData.get("specialtyId") ?? "").trim();

  return {
    countryId: String(formData.get("countryId") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    heroTitle: String(formData.get("heroTitle") ?? "").trim(),
    heroDescription: String(formData.get("heroDescription") ?? "").trim(),
    detailBody: String(formData.get("detailBody") ?? "").trim(),
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
    legacyPath: String(formData.get("legacyPath") ?? "").trim(),
    specialtyId: specialtyRaw === "" ? null : specialtyRaw,
    durationMinutes: optionalNumber(formData, "durationMinutes"),
    basePriceCents: optionalNumber(formData, "basePriceCents"),
    currencyCode: String(formData.get("currencyCode") ?? "").trim(),
    imagePath: String(formData.get("imagePath") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  };
}
