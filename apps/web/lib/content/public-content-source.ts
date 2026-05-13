/** Default timeout for optional public marketing API reads (never block SSR indefinitely). */
export const PUBLIC_CONTENT_FETCH_TIMEOUT_MS = 4000;

export function logPublicContentFallback(entity: string, detail: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[public-content] ${entity}: ${detail} — using fallback`);
}
