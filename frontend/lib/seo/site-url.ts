export const PROD_SITE_URL = "https://www.myglobalhealth.online";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return PROD_SITE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return PROD_SITE_URL;
    return url.origin;
  } catch {
    return PROD_SITE_URL;
  }
}

export function getPublicUrl(pathname = "/"): string {
  const safePath = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  const resolved = new URL(safePath, `${getSiteUrl()}/`).toString();
  return safePath === "/" ? resolved.replace(/\/$/, "") : resolved;
}