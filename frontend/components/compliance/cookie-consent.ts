import { readCookie, writeCookie, deleteCookie } from "@/lib/utils/cookies";

/**
 * Consent state for the non-essential things this site loads:
 *
 *  - `marketing`  → Meta Pixel (components/compliance/MetaPixel.tsx)
 *  - `thirdParty` → Doctify review widgets (components/sections/DoctifyReviews.tsx)
 *                   and the ElevenLabs voice assistant
 *                   (components/integrations/ElevenLabsConvai.tsx)
 *  - `analytics`  → Google Analytics (components/compliance/GoogleAnalytics.tsx)
 *
 * "Strictly necessary" (auth session, locale, country) is implied true and
 * deliberately not stored — it cannot be refused, so there is nothing to record.
 *
 * State lives in a cookie rather than localStorage so the edge proxy can read
 * it (proxy.ts already parses cookies) and so it matches how every other
 * preference on this site is persisted (gh_locale, gh-last-country).
 */

export const CONSENT_COOKIE = "gh-consent";
/**
 * v3 → v4 (ElevenLabs voice assistant, 2026-08-02): a NEW PROCESSOR entered the
 * `thirdParty` category, and a new kind of processing with it — the convai
 * widget opens a live session to ElevenLabs and captures microphone audio. A
 * stored `thirdParty: true` was given against copy that named Doctify
 * review widgets and nothing else, so those visitors are asked again.
 *
 * v2 → v3 (Microsoft Clarity, 2026-07-28): bumped because the PROCESSING
 * changed, not the schema.
 *
 * The `analytics` key itself was added additively without a bump — a missing
 * field fails closed to `false`, so nothing could leak. Clarity is a different
 * case: an existing `analytics: true` record was given against copy that named
 * Google Analytics and nothing else, for hit counting. Clarity is a second
 * processor doing session replay of DOM and interaction. That is not what
 * those visitors agreed to, so they are asked again.
 *
 * The rule, for next time: bump when a new processor or a new KIND of
 * processing enters a category; do not bump for an additive field.
 *
 * Cost of a bump, so it stays a conscious choice: every stored record reads as
 * null, the banner reappears for every returning visitor, and Meta Pixel and
 * Doctify reviews stay dark until each visitor re-consents.
 */
export const CONSENT_VERSION = 4;

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
  /** GA4 (components/compliance/GoogleAnalytics.tsx). Added after CONSENT_VERSION
   * 2 shipped — a stored record from before this key existed has it `undefined`,
   * which the `=== true` check below defaults to `false` (denied), same as any
   * other missing/malformed field. No version bump needed for an additive key. */
  analytics: boolean;
};

export type ConsentRecord = ConsentChoices & {
  v: number;
  /** epoch ms of the decision */
  ts: number;
};

export const DENY_ALL: ConsentChoices = { marketing: false, thirdParty: false, analytics: false };
export const ACCEPT_ALL: ConsentChoices = { marketing: true, thirdParty: true, analytics: true };

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
      analytics: record.analytics === true,
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
    analytics: choices.analytics === true,
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
