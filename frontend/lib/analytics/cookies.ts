/**
 * Analytics-cookie removal on consent withdrawal.
 *
 * `lib/utils/cookies.ts` deleteCookie() writes `name=; path=/; max-age=0` with
 * NO domain attribute, which scopes the delete to the exact current host.
 * Google Analytics writes `_ga` with `cookie_domain: 'auto'`, i.e.
 * `.myglobalhealth.online`, and Clarity writes `_clck`/`_clsk` the same way.
 * A host-scoped delete does not match a domain-scoped cookie, so the shared
 * helper CANNOT remove these — hence a purpose-built one here rather than a
 * signature change to a helper with three existing callers.
 */

/**
 * Shotgun across every domain scope the cookie could plausibly hold: the bare
 * host first, then each parent suffix. Browsers silently reject a cookie
 * domain that is a public suffix (`.online`), which is harmless.
 */
function deleteAcrossDomains(name: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const parts = window.location.hostname.split(".");
  const scopes: (string | undefined)[] = [undefined];
  for (let i = 0; i < parts.length - 1; i += 1) {
    scopes.push(`.${parts.slice(i).join(".")}`);
  }
  for (const domain of scopes) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
  }
}

/** `_ga`, the per-property `_ga_<container>`, and the legacy/ads companions. */
export function purgeGaCookies(measurementId: string): void {
  deleteAcrossDomains("_ga");
  if (measurementId) deleteAcrossDomains(`_ga_${measurementId.replace(/^G-/i, "")}`);
  deleteAcrossDomains("_gid");
  deleteAcrossDomains("_gat");
  deleteAcrossDomains("_gcl_au");
}

/**
 * NOT deletable from here: `MUID` / `ANONCHK` / `SM` are third-party cookies
 * on `.clarity.ms` and `.bing.com`. Same-origin JavaScript cannot touch
 * another origin's cookie jar, and no amount of trying changes that. The
 * mitigation for those is upstream — `ad_Storage: "denied"` via `consentv2`,
 * plus `c.bing.com` being absent from the CSP connect-src allowlist — and the
 * privacy notice says so rather than implying we can clear them.
 */
export function purgeClarityCookies(): void {
  deleteAcrossDomains("_clck");
  deleteAcrossDomains("_clsk");
}
