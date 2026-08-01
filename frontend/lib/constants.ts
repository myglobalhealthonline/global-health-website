/** Public site name — align with brand / metadata. */
export const SITE_NAME = "Global Health";

/**
 * Base grid step (minutes) every doctor availability window is generated on.
 * Fixed product-wide and deliberately not exposed as a control in any portal:
 * consultations consume consecutive base slots to fit their real length, so a
 * 15-min grid already accommodates 15/30/45-min consults.
 *
 * Windows created before this was fixed may still hold another step; slot
 * generation honours whatever is stored, and such a row is normalised to this
 * value the next time it is edited.
 */
export const BASE_SLOT_MINUTES = 15;

/**
 * Support WhatsApp number, for the floating chat button (components/layout/WhatsAppFab.tsx).
 *
 * `WHATSAPP_E164` is digits only — the form wa.me requires (no `+`, no spaces).
 * Set it to "" to hide the button entirely.
 */
export const WHATSAPP_E164 = "353894715849";
export const WHATSAPP_NUMBER_DISPLAY = "+353 89 471 5849";

/** Brand slogan — use as a brand line, not on every card. */
export const SLOGAN = "Medicine Anytime Anywhere";

/** Default primary booking CTA label, kept consistent across surfaces. */
export const DEFAULT_BOOK_CTA_LABEL = "Book Appointment";

/**
 * Site-wide medical / emergency safety notice. Rendered once in the chrome
 * (SiteChrome) so every market and page is covered, not just Ireland.
 */
export const EMERGENCY_NOTICE =
  "Online consultations are not a substitute for emergency care — if this is an emergency, call 112 or your local emergency number. Information on this website is general guidance, not a diagnosis. Prescriptions, certificates, referrals and next steps depend on a clinical assessment and are at the treating doctor's discretion.";
