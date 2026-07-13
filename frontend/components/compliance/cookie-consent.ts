import { readCookie, writeCookie, deleteCookie } from "@/lib/utils/cookies";

/**
 * Consent state for the two non-essential things this site loads:
 *
 *  - `marketing`  → Meta Pixel (components/compliance/MetaPixel.tsx)
 *  - `thirdParty` → Doctify review widgets (components/sections/DoctifyReviews.tsx)
 *
 * "Strictly necessary" (auth session, locale, country) is implied true and
 * deliberately not stored — it cannot be refused, so there is nothing to record.
 *
 * State lives in a cookie rather than localStorage so the edge proxy can read
 * it (proxy.ts already parses cookies) and so it matches how every other
 * preference on this site is persisted (gh_locale, gh-last-country).
 */

export const CONSENT_COOKIE = "gh-consent";
export const CONSENT_VERSION = 2;

/** Six months, then we ask again. */
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

/** Fired on `window` after any write, so MetaPixel/Doctify react without a reload. */
export const CONSENT_CHANGE_EVENT = "gh-consent-change";

/** Fired on `window` to reopen the banner (footer link, Doctify placeholder). */
export const CONSENT_OPEN_EVENT = "gh-consent-open";

/**
 * The pre-v2 banner wrote the literal string "acknowledged" here against copy
 * that promised "no third-party trackers" and offered no way to refuse. That is
 * not valid consent for an ad pixel, so it is NOT migrated — the key is dropped
 * and the visitor is asked again.
 */
const LEGACY_STORAGE_KEY = "gh-cookie-consent";

export type ConsentChoices = {
  marketing: boolean;
  thirdParty: boolean;
};

export type ConsentRecord = ConsentChoices & {
  v: number;
  /** epoch ms of the decision */
  ts: number;
};

export const DENY_ALL: ConsentChoices = { marketing: false, thirdParty: false };
export const ACCEPT_ALL: ConsentChoices = { marketing: true, thirdParty: true };

/** Returns null when the visitor has not decided yet. Fails closed. */
export function readConsent(): ConsentRecord | null {
  try {
    const raw = readCookie(CONSENT_COOKIE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<ConsentRecord>;
    // A record from an older schema means the categories have changed since
    // they chose — treat it as no decision and re-prompt.
    if (record.v !== CONSENT_VERSION) return null;
    return {
      v: CONSENT_VERSION,
      marketing: record.marketing === true,
      thirdParty: record.thirdParty === true,
      ts: typeof record.ts === "number" ? record.ts : 0,
    };
  } catch {
    return null;
  }
}

export function writeConsent(choices: ConsentChoices): void {
  const record: ConsentRecord = {
    v: CONSENT_VERSION,
    marketing: choices.marketing === true,
    thirdParty: choices.thirdParty === true,
    ts: Date.now(),
  };
  try {
    writeCookie(CONSENT_COOKIE, JSON.stringify(record), CONSENT_MAX_AGE);
  } catch {
    // Cookies blocked — nothing persists, so the visitor stays un-consented
    // and nothing loads. Still dispatch so the current page reflects the click.
  }
  dispatch(CONSENT_CHANGE_EVENT);
}

export function clearConsent(): void {
  deleteCookie(CONSENT_COOKIE);
  dispatch(CONSENT_CHANGE_EVENT);
}

/** Drop the pre-v2 localStorage key. Safe to call repeatedly. */
export function purgeLegacyConsent(): void {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage blocked — nothing to purge.
  }
}

/** Reopen the banner from anywhere (footer, Doctify placeholder). */
export function openCookiePreferences(): void {
  dispatch(CONSENT_OPEN_EVENT);
}

function dispatch(name: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}
