import "server-only";

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function optionalDateString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : new Date(value).toISOString();
}

export function parseContentPageBodyFromForm(formData: FormData) {
  return {
    countryId: optionalString(formData, "countryId"),
    pageKey: String(formData.get("pageKey") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    locale: String(formData.get("locale") ?? "EN").trim(),
    status: String(formData.get("status") ?? "DRAFT").trim(),
    seoTitle: optionalString(formData, "seoTitle"),
    seoDescription: optionalString(formData, "seoDescription"),
    lastReviewedAt: optionalDateString(formData, "lastReviewedAt"),
    isActive: formData.get("isActive") === "on",
  };
}
