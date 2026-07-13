/**
 * Browser cookie primitives. `lib/routing/last-country.ts` and
 * `lib/i18n/get-client-locale.ts` each grew their own copy of this;
 * new call sites should use these instead of hand-rolling a third.
 *
 * Both guard on `typeof document` so they're safe to call from code
 * that isn't provably client-only.
 */

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const entry of document.cookie.split("; ")) {
    if (entry.startsWith(prefix)) {
      const raw = entry.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
