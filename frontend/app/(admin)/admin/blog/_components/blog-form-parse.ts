const VALID_STATUSES = new Set(["DRAFT", "PUBLISHED"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ParsedBlogBody = ReturnType<typeof parseBlogBody>;

/**
 * Server-side validation for a parsed blog body. The HTML `pattern` /
 * `required` attributes on the form are client-only and trivially bypassed
 * by POSTing the Server Action directly, so the action MUST re-validate.
 * Returns an error message, or null when the body is valid.
 */
export function validateBlogBody(body: ParsedBlogBody): string | null {
  if (!body.title) return "Title is required.";
  if (body.title.length > 200) return "Title is too long (max 200 characters).";
  if (!body.slug) return "Slug is required.";
  if (!SLUG_RE.test(body.slug)) {
    return "Slug must be lowercase letters, numbers and single hyphens (e.g. my-post).";
  }
  if (!VALID_STATUSES.has(body.status)) return "Invalid status.";
  return null;
}

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
    authorDoctorId: get("authorDoctorId"),
    reviewerDoctorId: get("reviewerDoctorId"),
    ctaServiceId: get("ctaServiceId"),
    seoTitle: get("seoTitle"),
    seoDescription: get("seoDescription"),
    coverImagePath: get("coverImagePath"),
    coverImageAlt: get("coverImageAlt"),
    status: String(formData.get("status") ?? "DRAFT").trim(),
    locale: String(formData.get("locale") ?? "EN").trim(),
    isActive: formData.get("isActive") === "on",
  };
}
