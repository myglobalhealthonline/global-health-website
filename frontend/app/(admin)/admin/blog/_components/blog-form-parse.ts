export function parseBlogBody(formData: FormData) {
  const get = (key: string) => {
    const v = formData.get(key);
    if (v === null) return null;
    const str = String(v).trim();
    return str === "" ? null : str;
  };
  return {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    excerpt: get("excerpt"),
    body: String(formData.get("body") ?? ""),
    category: get("category"),
    authorDisplayName: get("authorDisplayName"),
    seoTitle: get("seoTitle"),
    seoDescription: get("seoDescription"),
    coverImagePath: get("coverImagePath"),
    coverImageAlt: get("coverImageAlt"),
    status: String(formData.get("status") ?? "DRAFT").trim(),
    locale: String(formData.get("locale") ?? "EN").trim(),
    isActive: formData.get("isActive") === "on",
  };
}
