import "server-only";

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

export function parseFaqBodyFromForm(formData: FormData) {
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortRaw === "" ? 0 : Number.parseInt(sortRaw, 10);

  return {
    countryId: optionalString(formData, "countryId"),
    question: String(formData.get("question") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
    locale: String(formData.get("locale") ?? "EN").trim(),
    category: optionalString(formData, "category"),
    placementKey: optionalString(formData, "placementKey"),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: formData.get("isActive") === "on",
  };
}
