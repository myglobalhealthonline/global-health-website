const MAX_EXCERPT_LEN = 500;
const MIN_EXCERPT_LEN = 30;

/**
 * Plain text from HTML or plain article body (aligns with frontend publication checks).
 */
export function stripBlogBodyToPlainText(body: string): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ensures a non-empty excerpt for published posts by reusing the provided excerpt or the start of the body.
 */
export function deriveBlogExcerpt(excerpt: string | null | undefined, body: string): string {
  const trimmedEx = excerpt?.trim() ?? "";
  const plain = stripBlogBodyToPlainText(body);

  if (trimmedEx.length >= MIN_EXCERPT_LEN) {
    return trimmedEx.slice(0, MAX_EXCERPT_LEN);
  }
  if (plain.length >= MIN_EXCERPT_LEN) {
    return plain.slice(0, MAX_EXCERPT_LEN);
  }

  const merged = `${trimmedEx} ${plain}`.trim();
  if (merged.length > 0) {
    return merged.slice(0, MAX_EXCERPT_LEN);
  }

  return trimmedEx.slice(0, MAX_EXCERPT_LEN);
}
