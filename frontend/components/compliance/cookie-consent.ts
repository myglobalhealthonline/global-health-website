export const COOKIE_CONSENT_STORAGE_KEY = "gh-cookie-consent";

/** Dispatched on `window` by CookieBanner.acknowledge() so same-tab
 *  listeners (MetaPixel) can react immediately without a reload. */
export const COOKIE_CONSENT_EVENT = "gh-cookie-consent-acknowledged";
