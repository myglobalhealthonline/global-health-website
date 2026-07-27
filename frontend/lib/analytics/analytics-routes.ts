import { supportedLocaleCodes } from "@/lib/i18n/types";

/**
 * Route gating and path sanitisation for the two analytics tags.
 *
 * The line drawn here is NOT "is this page about health" — nearly every page
 * on this site is. The line is "did the visitor supply data about themselves
 * on this page". Reading a published article about diabetes is publishing,
 * not profiling. Typing your date of birth and your reason for visit is.
 * Microsoft Clarity records DOM and interaction, so it gets the first
 * category only.
 *
 * Default is DENY: `isClarityAllowed` is an allowlist, so a route added
 * tomorrow gets nothing until someone opts it in deliberately.
 *
 * Pure functions — no React, no `window`. Unit-tested in
 * `analytics-routes.test.ts`, which table-drives the full route inventory.
 */

const LOCALES: ReadonlySet<string> = new Set<string>(supportedLocaleCodes);

/**
 * First segments that are locale-less roots, i.e. can NEVER be a country
 * slug. Enumerated from `app/(global)/` and `app/(portal)/`.
 *
 * Without this list `/blog/en` — a real route, `(global)/blog/[slug]` with a
 * post whose slug happens to be "en" — would be read as country "blog",
 * locale "en" and stripped to "/", i.e. treated as the home page.
 */
const NON_COUNTRY_ROOTS: ReadonlySet<string> = new Set([
  // app/(global)
  //
  // NOTE "brazil" is deliberately ABSENT. It is the only first segment that is
  // both a (global) route root (`/brazil/consent`) and a live country slug
  // (`/brazil/pt/...`) — Next resolves the static route only when the whole
  // path matches, and falls through to `[country]/[lang]` otherwise. Listing
  // it here would stop `/brazil/pt/pricing` from being stripped and would deny
  // Clarity across the entire Brazilian market. Instead `brazil` sits in
  // CLARITY_DENY, which only bites on the un-stripped `/brazil/consent` form.
  "about",
  "access-request",
  "blog",
  "card-verify",
  "cart",
  "checkout",
  "contact",
  "cross-border-consent",
  "faq",
  "patient-upload",
  "privacy",
  "reviews",
  "terms",
  "verify",
  // app/(portal). Unreachable from the public root layouts (which are the only
  // places the tags mount), but the gate has to be correct standalone or the
  // unit tests below mean nothing.
  "account",
  "admin",
  "corporate",
  "corporate-invite",
  "doctor",
  "forgot-password",
  "login",
  "pay",
  "print",
  "register",
  "reset-password",
  "share",
  "unauthorized",
  "verify-email",
]);

/**
 * Mirrors the identity fallback in `lib/routing/country-slug.ts` — admins can
 * add a country without a redeploy, so the set of valid first segments is
 * open-ended. Test the SHAPE, never a closed list.
 */
const COUNTRY_SLUG_SHAPE = /^[a-z][a-z0-9-]{1,7}$/;

/**
 * `/ireland/en/doctors/x` → `/doctors/x`, `/ireland/en` → `/`,
 * `/about` → `/about`, `/blog/en` → `/blog/en` (see NON_COUNTRY_ROOTS).
 */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const [first, second] = segments;
  if (
    first &&
    second &&
    !NON_COUNTRY_ROOTS.has(first.toLowerCase()) &&
    COUNTRY_SLUG_SHAPE.test(first.toLowerCase()) &&
    LOCALES.has(second.toLowerCase())
  ) {
    const rest = segments.slice(2);
    return rest.length > 0 ? `/${rest.join("/")}` : "/";
  }
  return segments.length > 0 ? `/${segments.join("/")}` : "/";
}

/**
 * Deny wins over allow. Every entry in the first block lives under a PUBLIC
 * root layout, so the layout-level gate (S-027) does not protect it — this
 * list is the only thing keeping session replay off them.
 */
const CLARITY_DENY: ReadonlySet<string> = new Set([
  "book", // patient name, DOB, national ID, free-text reason for visit
  "cart", // line items name the consultation, plus "For {name}" beneficiary
  "checkout", // payer contact + shipping address; /success shows the order ref
  "patient-upload", // medical document upload
  "access-request", // GDPR subject-access form: name, email, proof of identity
  "card-verify", // corporate card number, member name, employer, plan
  "verify", // /verify/certificate/[id] renders certificate holder detail
  "cross-border-consent", // consent form carrying patient identifiers
  // /brazil/consent + /brazil/consent/success — LGPD consent form. Only
  // reachable here in the un-stripped form; `/brazil/{lang}/...` strips to its
  // tail first, so the Brazilian market is gated on its real page like every
  // other country. See the note on NON_COUNTRY_ROOTS.
  "brazil",
  "reviews", // /reviews/rate — tokenised, names the doctor and appointment
  // Portal roots. Unreachable (the (portal) root layout mounts no tags), kept
  // as belt and braces so the gate is defensible on its own.
  "account",
  "admin",
  "corporate",
  "corporate-invite",
  "doctor",
  "forgot-password",
  "login",
  "pay",
  "print",
  "register",
  "reset-password",
  "share",
  "unauthorized",
  "verify-email",
]);

/**
 * Published marketing content. `""` is the home page — both the gateway `/`
 * and every `/{country}/{lang}`.
 *
 * Contested entries, decided:
 *  - `prescriptions` / `tests` — these are service-category and product
 *    landing pages despite the names (hero + services grid + FAQ). Nothing is
 *    entered on them. The actual flows are `/book`, `/cart`, `/checkout`
 *    (denied) and `/account/prescriptions` (portal).
 *  - `consult` — deliberately absent. `[country]/[lang]/consult/[serviceSlug]`
 *    is a `permanentRedirect()`; it 308s server-side and never renders, so an
 *    entry here would be dead config. If it ever becomes a real page it should
 *    need a conscious decision.
 *  - `health` — allowed on the same basis as `blog` and `services`: published
 *    editorial, anonymous reader, no self-supplied data. Denying it without
 *    also denying `blog` and `services` would be incoherent, and denying all
 *    three would gut the tool. IF THE DPO WANTS THE STRICTER LINE, deleting
 *    `"health"` (and optionally `"blog"`) from this set is the whole change.
 */
const CLARITY_ALLOW: ReadonlySet<string> = new Set([
  "", // home
  "about",
  "blog",
  "contact",
  "doctors",
  "faq",
  "general-consultation",
  "health",
  "legal",
  "prescriptions",
  "pricing",
  "privacy",
  "services",
  "specialist-consultation",
  "terms",
  "tests",
]);

/** Whether Microsoft Clarity may record this path. Allowlist; deny wins. */
export function isClarityAllowed(pathname: string): boolean {
  const first = (stripLocalePrefix(pathname).split("/")[1] ?? "").toLowerCase();
  if (CLARITY_DENY.has(first)) return false;
  return CLARITY_ALLOW.has(first);
}

/**
 * Named redactions, first match wins. Applied to the LOCALE-STRIPPED tail so
 * one rule covers both `/card-verify/X` and a hypothetical
 * `/ireland/en/card-verify/X`.
 */
const NAMED_REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/card-verify\/[^/]+.*$/, "/card-verify/:code"],
  [/^\/verify\/certificate\/[^/]+.*$/, "/verify/certificate/:id"],
  [/^\/share\/consults\/[^/]+.*$/, "/share/consults/:token"],
  [/^\/corporate-invite\/[^/]+.*$/, "/corporate-invite/:token"],
  [/^\/pay\/[^/]+.*$/, "/pay/:orderId"],
  [/^\/admin\/patients\/[^/]+.*$/, "/admin/patients/:email"],
  [/^\/doctor\/patients\/[^/]+.*$/, "/doctor/patients/:email"],
  [/^\/print\/[^/]+\/[^/]+.*$/, "/print/:doc/:id"],
];

/**
 * Catch-all so a route added next year is redacted without anyone remembering
 * this file exists. Deliberately spares kebab-case content slugs — see the
 * note on `sanitizePagePath`.
 */
function isOpaqueSegment(segment: string): boolean {
  const lower = segment.toLowerCase();
  if (lower.includes("@") || lower.includes("%40")) return true; // email
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lower)) return true; // uuid
  if (/^\d{4,}$/.test(segment)) return true; // numeric id
  if (/^c[a-z0-9]{24}$/i.test(segment)) return true; // cuid
  if (/^[a-z0-9]{20,}$/i.test(segment)) return true; // long unbroken token
  // nanoid / base64url: mixed case + digits, no separators, long enough that a
  // real word can be ruled out.
  if (segment.length >= 16 && /[A-Z]/.test(segment) && /\d/.test(segment) && /^[A-Za-z0-9_-]+$/.test(segment)) {
    return true;
  }
  return false;
}

/**
 * The only path value that may reach Google Analytics.
 *
 * Query string and hash are ALWAYS dropped — `usePathname()` already excludes
 * them, but this function is the guard for anything handed to `page_location`,
 * so it must not depend on its caller.
 *
 * The `/{country}/{lang}` prefix is KEPT: country and language are market
 * dimensions, not personal data, and GA is worthless to this business without
 * them.
 *
 * Content slugs are kept too — `/blog/how-to-manage-hypertension`,
 * `/doctors/dr-maria-santos`, `/services/dermatology-consultation` are content
 * identifiers, not person identifiers. They are published, crawlable and
 * identical for every visitor. Redacting them would collapse GA to a single
 * `/blog/:slug` row and destroy the only thing content marketing needs from
 * it. The kebab-case shape is exactly what `isOpaqueSegment` spares.
 */
export function sanitizePagePath(pathname: string): string {
  const path = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";

  const tail = stripLocalePrefix(path);
  // The `/{country}/{lang}` head, recovered by length so we don't re-parse it.
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefix =
    tail === "/"
      ? normalized.replace(/\/+$/, "")
      : normalized.slice(0, Math.max(0, normalized.length - tail.length));

  for (const [pattern, replacement] of NAMED_REDACTIONS) {
    if (pattern.test(tail)) return collapse(`${prefix}${replacement}`);
  }

  const redacted = tail
    .split("/")
    .map((segment) => (segment && isOpaqueSegment(segment) ? ":id" : segment))
    .join("/");

  return collapse(`${prefix}${redacted}`);
}

function collapse(path: string): string {
  const out = path.replace(/\/{2,}/g, "/");
  if (out === "" || out === "/") return "/";
  return out.replace(/\/$/, "");
}
