import "server-only";

function nullableId(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

export function parseAssetBodyFromForm(formData: FormData) {
  return {
    countryId: nullableId(String(formData.get("countryId") ?? "")),
    doctorId: nullableId(String(formData.get("doctorId") ?? "")),
    kind: String(formData.get("kind") ?? "").trim(),
    key: String(formData.get("key") ?? "").trim(),
    path: String(formData.get("path") ?? "").trim(),
    altText: String(formData.get("altText") ?? "").trim(),
    usageNote: String(formData.get("usageNote") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  };
}
