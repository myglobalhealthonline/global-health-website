export function parsePageBody(formData: FormData) {
  const get = (key: string) => {
    const v = formData.get(key);
    if (v === null) return null;
    const str = String(v).trim();
    return str === "" ? null : str;
  };
  const countryId = String(formData.get("countryId") ?? "").trim();
  const pageKey = String(formData.get("pageKey") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT").trim();
  return {
    countryId,
    pageKey,
    locale,
    status,
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? ""),
    heroTitle: get("heroTitle"),
    heroSubtitle: get("heroSubtitle"),
    heroImagePath: get("heroImagePath"),
    ctaLabel: get("ctaLabel"),
    ctaHref: get("ctaHref"),
    ogImagePath: get("ogImagePath"),
    seoTitle: get("seoTitle"),
    seoDescription: get("seoDescription"),
    isActive: formData.get("isActive") === "on",
  };
}
