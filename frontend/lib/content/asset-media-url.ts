/**
 * Resolve CMS asset paths for safe rendering: local absolute paths or HTTPS URLs
 * served from our API (`/api/media/*`) on trusted host(s).
 */

function parseAllowedHosts(): string[] {
  const raw = process.env.NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS?.trim();
  const extra = raw
    ? raw.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)
    : [];
  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (api) {
    try {
      const host = new URL(api).hostname.toLowerCase();
      if (host && !extra.includes(host)) extra.unshift(host);
    } catch {
      /* ignore */
    }
  }
  return extra;
}

let cachedHosts: string[] | null = null;
let cachedApiOrigin: string | null | undefined;

export function getTrustedMediaHosts(): string[] {
  if (!cachedHosts) cachedHosts = parseAllowedHosts();
  return cachedHosts;
}

/**
 * True when `src` is an absolute URL to a host NOT covered by
 * next.config.ts's `images.remotePatterns` (our API origin,
 * images.unsplash.com, images.pexels.com) — Next's image optimizer throws
 * for unlisted hosts, so those must render unoptimized. Relative paths and
 * listed hosts (incl. `resolveTrustedAssetUrl`'s absolute `/api/media/*`
 * URLs) can be optimized safely. Single source of truth — every `<Image>`
 * rendering a CMS asset should use this instead of a local regex copy.
 */
export function isUnoptimizedImageSrc(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return false;
  let host: string;
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (host === "images.unsplash.com" || host === "images.pexels.com") return false;
  return !getTrustedMediaHosts().includes(host);
}

function getApiOrigin(): string | undefined {
  if (cachedApiOrigin !== undefined) return cachedApiOrigin ?? undefined;
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    cachedApiOrigin = null;
    return undefined;
  }
  try {
    cachedApiOrigin = new URL(raw).origin;
    return cachedApiOrigin;
  } catch {
    cachedApiOrigin = null;
    return undefined;
  }
}

export function isSafeLocalAssetPath(path: string): boolean {
  const t = path.trim();
  if (!t.startsWith("/")) return false;
  if (t.startsWith("//")) return false;
  if (t.includes("..")) return false;
  if (/[\s<>"]/.test(t)) return false;
  return true;
}

/** Path after /api/media/ must start with media/ (bucket keys from upload); disallow traversal. */
function isSafeMediaApiPathname(pathname: string): boolean {
  if (!pathname.startsWith("/api/media/")) return false;
  const rest = pathname.slice("/api/media/".length);
  if (!rest || rest.includes("..")) return false;
  try {
    const decoded = decodeURIComponent(rest);
    if (!decoded.startsWith("media/") || decoded.includes("..")) return false;
    return decoded.length <= 400 && /^media\/[a-zA-Z0-9._-]+$/.test(decoded);
  } catch {
    return false;
  }
}

/**
 * Returns the URL string if it may be rendered (next/image remotePatterns must include this host).
 */
export function resolveTrustedAssetUrl(path: string): string | undefined {
  const t = path.trim();
  if (!t) return undefined;

  if (isSafeLocalAssetPath(t)) {
    if (t.startsWith("/api/media/")) {
      const apiOrigin = getApiOrigin();
      return apiOrigin ? `${apiOrigin}${t}` : undefined;
    }
    return t;
  }

  if (!/^https:\/\//i.test(t)) return undefined;
  if (/^https:\/\/[^/]*\.wixstatic\.com/i.test(t)) return undefined;

  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return undefined;
  }

  if (url.username || url.password) return undefined;
  if (url.protocol !== "https:") return undefined;

  const host = url.hostname.toLowerCase();
  const allowed = getTrustedMediaHosts();
  if (!allowed.some((h) => host === h)) return undefined;

  if (!isSafeMediaApiPathname(url.pathname)) return undefined;

  return url.toString();
}
