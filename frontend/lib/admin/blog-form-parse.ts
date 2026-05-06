import "server-only";

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function optionalDateString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : new Date(value).toISOString();
}

export function parseBlogPostBodyFromForm(formData: FormData) {
  return {
    countryId: optionalString(formData, "countryId"),
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    excerpt: optionalString(formData, "excerpt"),
    body: String(formData.get("body") ?? "").trim(),
    status: String(formData.get("status") ?? "DRAFT").trim(),
    locale: String(formData.get("locale") ?? "EN").trim(),
    category: optionalString(formData, "category"),
    authorDisplayName: optionalString(formData, "authorDisplayName"),
    coverAssetId: optionalString(formData, "coverAssetId"),
    seoTitle: optionalString(formData, "seoTitle"),
    seoDescription: optionalString(formData, "seoDescription"),
    publishedAt: optionalDateString(formData, "publishedAt"),
    isActive: formData.get("isActive") === "on",
  };
}
