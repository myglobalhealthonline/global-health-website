import { z } from "zod";

/** Railway bucket presets expose ENDPOINT, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION — alias into S3_* names. */
function mergeRailwayBucketAliases(): NodeJS.ProcessEnv {
  const out = { ...process.env };
  if (!out.S3_BUCKET?.trim() && out.BUCKET?.trim()) out.S3_BUCKET = out.BUCKET;
  if (!out.S3_ENDPOINT?.trim() && out.ENDPOINT?.trim()) out.S3_ENDPOINT = out.ENDPOINT;
  if (!out.S3_ACCESS_KEY_ID?.trim() && out.ACCESS_KEY_ID?.trim()) out.S3_ACCESS_KEY_ID = out.ACCESS_KEY_ID;
  if (!out.S3_ACCESS_KEY_ID?.trim() && out.S3_ACCESS_KEY?.trim()) out.S3_ACCESS_KEY_ID = out.S3_ACCESS_KEY;
  if (!out.S3_SECRET_ACCESS_KEY?.trim() && out.SECRET_ACCESS_KEY?.trim()) out.S3_SECRET_ACCESS_KEY = out.SECRET_ACCESS_KEY;
  if (!out.S3_SECRET_ACCESS_KEY?.trim() && out.S3_SECRET_KEY?.trim()) out.S3_SECRET_ACCESS_KEY = out.S3_SECRET_KEY;
  if (!out.S3_REGION?.trim() && out.REGION?.trim()) out.S3_REGION = out.REGION;
  // Railway bucket credentials CLI currently prints AWS_* names. Accept both shapes.
  if (!out.S3_BUCKET?.trim() && out.AWS_S3_BUCKET_NAME?.trim()) out.S3_BUCKET = out.AWS_S3_BUCKET_NAME;
  if (!out.S3_ENDPOINT?.trim() && out.AWS_ENDPOINT_URL?.trim()) out.S3_ENDPOINT = out.AWS_ENDPOINT_URL;
  if (!out.S3_ACCESS_KEY_ID?.trim() && out.AWS_ACCESS_KEY_ID?.trim()) out.S3_ACCESS_KEY_ID = out.AWS_ACCESS_KEY_ID;
  if (!out.S3_SECRET_ACCESS_KEY?.trim() && out.AWS_SECRET_ACCESS_KEY?.trim()) {
    out.S3_SECRET_ACCESS_KEY = out.AWS_SECRET_ACCESS_KEY;
  }
  if (!out.S3_REGION?.trim() && out.AWS_DEFAULT_REGION?.trim()) out.S3_REGION = out.AWS_DEFAULT_REGION;
  return out;
}

/** Optional secret that treats an empty string (blank .env / Railway var) as
 *  unset, so a blank placeholder never fails the `.min(1)` check. */
const optionalSecret = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().trim().min(1).optional(),
);

const envSchema = z.object({
  // Railway (and a few other PaaS) export NODE_ENV as the empty string
  // when no value is set, which bypasses Zod's `.default()` (that only
  // fires on undefined). Preprocess "" → undefined so the default
  // kicks in. Default is "production" because this file only runs when
  // bundled; dev mode comes from `tsx watch` + `.env` which sets the
  // value explicitly.
  NODE_ENV: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.enum(["development", "test", "production"]).default("production"),
  ),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_API_TOKEN: z.string().trim().min(1, "ADMIN_API_TOKEN cannot be empty").optional(),
  ADMIN_TOKEN_FALLBACK_ENABLED: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),
  // Default only kicks in for non-production runs (we re-check below
   // and refuse to boot in production if the secret is missing or
   // still the dev fallback). Prevents a misconfigured Railway service
   // from silently signing tokens with a known string.
  AUTH_JWT_SECRET: z
    .string()
    .trim()
    .min(32, "AUTH_JWT_SECRET must be at least 32 characters")
    .default("dev-only-change-this-auth-jwt-secret-min-32"),
  AUTH_COOKIE_NAME: z.string().trim().min(1).default("gh_auth"),
  AUTH_COOKIE_DOMAIN: z.string().trim().optional(),
  AUTH_JWT_EXPIRES_IN: z.string().trim().min(2).default("7d"),
  CORS_ALLOWED_ORIGINS: z.string().trim().optional(),
  /** Railway bucket / S3-compatible storage (all optional; upload + GET /api/media require full set). */
  S3_BUCKET: z.string().trim().min(1).optional(),
  S3_ENDPOINT: z.string().trim().url().optional(),
  S3_REGION: z.string().trim().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  /** HTTPS origin of this API for stable URLs in upload responses behind proxies (no trailing slash). */
  PUBLIC_MEDIA_ORIGIN: z.string().trim().url().optional(),
  /**
   * Development only: directory for uploads when S3 is not configured (relative to backend cwd or absolute).
   * Defaults to `.data/local-media` when NODE_ENV is not production.
   */
  LOCAL_MEDIA_ROOT: z.string().trim().min(1).optional(),

  /** SendGrid (transactional email fallback when Gmail is not configured). */
  SENDGRID_API_KEY: z.string().trim().min(1).optional(),
  EMAIL_FROM: z.string().trim().email().optional(),
  /** Gmail API sender (uses GOOGLE_OAUTH_* client + GMAIL_SEND_REFRESH_TOKEN with gmail.send scope). */
  GMAIL_SEND_FROM: z.string().trim().email().optional(),
  /** Refresh token authorized for gmail.send — separate from calendar/meet token. */
  GMAIL_SEND_REFRESH_TOKEN: z.string().trim().min(1).optional(),
  /** Used to build absolute URLs in emails (e.g. https://myglobalhealth.online). No trailing slash. */
  PUBLIC_SITE_URL: z.string().trim().url().optional(),

  /** Stripe — keep test keys in dev. Payments stay disabled when STRIPE_SECRET_KEY is absent.
   *  STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are the DEFAULT (Ireland) account —
   *  used for every country except PT/ES/CZ and for all subscription / Brazil /
   *  redemption flows. */
  STRIPE_SECRET_KEY: z.string().trim().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().min(1).optional(),

  /** Per-country Stripe sandbox accounts for one-off payments. Each falls back
   *  to the Ireland key when unset (a half-configured sandbox degrades to
   *  Ireland instead of taking the market offline). See lib/stripe/client.ts.
   *  Blank placeholders ("") are treated as unset — safe to leave in .env until
   *  the sandbox keys are pasted in. */
  STRIPE_SECRET_KEY_PT: optionalSecret,
  STRIPE_WEBHOOK_SECRET_PT: optionalSecret,
  STRIPE_SECRET_KEY_CZ: optionalSecret,
  STRIPE_WEBHOOK_SECRET_CZ: optionalSecret,

  /** Portugal InvoiceExpress — direct REST issuance of the legal InvoiceReceipt
   *  when a PT order is paid on the LIVE Stripe account. Both must be set for the
   *  issuer to fire; blank ("") is treated as unset. ACCOUNT is the subdomain
   *  (e.g. "globalguestsro" → https://globalguestsro.app.invoicexpress.com). */
  INVOICE_EXPRESS_API_KEY: optionalSecret,
  INVOICE_EXPRESS_ACCOUNT: optionalSecret,

  /** Subscription billing provider. `fake` (default) = in-memory port, no
   *  Stripe keys needed (dev/test). `stripe` = real Stripe Subscriptions —
   *  only honoured when STRIPE_SECRET_KEY is also set, else falls back to
   *  fake. See modules/billing/billing.factory.ts. */
  BILLING_DRIVER: z.enum(["fake", "stripe"]).optional(),

  /** DEV / TEST ONLY — let the fake billing driver "complete" a subscription
   *  without a real payment (replays the webhook sequence) so the subscribe flow
   *  can be exercised end-to-end on a test deployment that has no Stripe keys.
   *  Has effect ONLY when BILLING_DRIVER is unset/"fake"; once BILLING_DRIVER=
   *  "stripe" it is ignored (real Stripe is the sole activator). Locally
   *  (NODE_ENV !== "production") test-activation is always on; set this to
   *  "true" to also enable it on a non-prod test/staging deployment.
   *  NEVER set "true" on a real customer production — it would let a user
   *  self-grant a free subscription (and its credits) without paying. */
  ALLOW_TEST_SUBSCRIPTION_ACTIVATION: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),

  /** Google Places API key — when set, the reviews-config endpoint
   *  refreshes the Google aggregate in the background (24h TTL).
   *  Without it the admin-entered aggregate is used as-is. */
  GOOGLE_PLACES_API_KEY: z.string().trim().min(1).optional(),

  /** Shared secret for the cron worker that calls /api/internal/run-reminders.
   *  Required to keep the endpoint behind auth without needing a session.
   *  Generate with: openssl rand -base64 32. */
  CRON_SECRET: z.string().trim().min(16).optional(),

  /** Optional Redis connection for a SHARED rate-limit store. Unset → the
   *  limiter uses an in-process store (correct on a single replica; on N
   *  replicas the effective limit becomes max×N). Set this when scaling out
   *  horizontally so throttling is global. Example: redis://:pass@host:6379. */
  REDIS_URL: z.string().url().optional(),

  /** Optional ops-alert webhook (Slack/Discord/generic). When set, money/ops
   *  reconciliation findings + subscription webhook failures POST a JSON
   *  {text,severity,...} here. Unset → alerts are logged only (§39). */
  OPS_ALERT_WEBHOOK: z.string().url().optional(),

  /** Inbox that receives a duplicate of every automation email (internal record).
   *  Defaults to globalhealth@myglobalhealth.online when unset. */
  AUTOMATION_OFFICIAL_EMAIL: z.string().trim().email().optional(),

  BRAZIL_BOOKING_URL: z.string().trim().url().optional(),
  BRAZIL_CONSENT_NOTIFY_EMAIL: z.string().trim().email().optional(),
  BRAZIL_CONSENT_DOCTOR_PHONE: z.string().trim().optional(),

  PATIENT_UPLOAD_LINK_SECRET: z.string().trim().min(16).optional(),

  /** Application-layer encryption key for the most sensitive PatientProfile
   *  fields (national/tax/passport IDs). When set, those columns are stored
   *  AES-256-GCM encrypted; when unset, encryption is OFF (plaintext, current
   *  behaviour). Losing this key after enabling means losing those fields.
   *  Run scripts/encrypt-phi-backfill.ts once after setting it. */
  PHI_ENCRYPTION_KEY: z.string().trim().min(16).optional(),

  /** HMAC key for blind-index hashing of encrypted PHI fields (email, phone, name+dob).
   *  Must be distinct from PHI_ENCRYPTION_KEY. Min 32 chars.
   *  Without this key, duplicate-patient detection via hashed fields is disabled. */
  BLIND_INDEX_KEY: z.string().trim().min(32).optional(),

  /** Comma-separated role names (e.g. "DOCTOR,ADMIN,SUPER_ADMIN,LOCAL_ADMIN")
   *  that must have completed 2FA enrollment/verification to authenticate.
   *  Default empty string / unset — OFF, byte-for-byte identical to today's
   *  behaviour (2FA optional for every role). Roll out deliberately per role
   *  once staff have had a chance to enroll TOTP; see admin-auth.ts /
   *  doctor-auth.ts / medical-access-guard.ts for enforcement points. */
  REQUIRE_2FA_FOR_ROLES: z.string().trim().optional(),

  /** Master compliance switch.
   *  - "strict" (default): today's behavior — MEDICAL_ACCESS_ENFORCE /
   *    ADMIN_PHI_REQUIRE_REASON keep their existing defaults, and production
   *    REFUSES to boot while the medical-access guard is in shadow mode.
   *  - "relaxed": MEDICAL_ACCESS_ENFORCE defaults to false (shadow: every
   *    access decision is logged, nothing is blocked) AND the shadow-mode
   *    production hard-fail below is SKIPPED; ADMIN_PHI_REQUIRE_REASON
   *    defaults to false.
   *  Explicit env vars ALWAYS override the master's defaults — e.g.
   *  COMPLIANCE_MODE=relaxed + MEDICAL_ACCESS_ENFORCE=true → enforce on. */
  COMPLIANCE_MODE: z.enum(["strict", "relaxed"]).default("strict"),

  /** Medical access guard enforcement mode.
   *  - unset / "false" (default): SHADOW mode — assertMedicalAccess logs every
   *    access + raises alerts on would-be-denials, but NEVER blocks. Lets the
   *    guard ship into a live system and build the audit trail before staff
   *    have enrolled 2FA / signed confidentiality / consent rows are backfilled.
   *  - "true": ENFORCE mode — denied access throws and the caller returns 403.
   *  Flip to "true" only after the Wave-0 backfill (confidentiality agreements,
   *  2FA enrollment, consent migration) is complete. */
  MEDICAL_ACCESS_ENFORCE: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),

  /** Break-glass switch for plain ADMIN PHI access. Default FALSE — plain ADMIN
   *  keeps unconditional access (today's behaviour). When "true", a plain ADMIN
   *  must supply a break-glass reason (ctx.reason) to read a medical record; a
   *  reasonless attempt is denied + logged. SUPER_ADMIN is always unconditional.
   *  See lib/medical-access-guard.ts. */
  ADMIN_PHI_REQUIRE_REASON: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),

  /** Full WaSender send-message URL (e.g. https://wasenderapi.com/api/send-message). */
  WA_API_URL: z.string().trim().url().optional(),
  /** Authorization header value — `Bearer <token>` or raw token. */
  WA_AUTH: z.string().trim().min(1).optional(),
  /** @deprecated Prefer WA_AUTH — kept for backward compatibility. */
  WASENDER_API_TOKEN: z.string().trim().min(1).optional(),
  /** Minimum gap between WhatsApp sends (default 6s). */
  /** Minimum ms between WaSender API calls (global queue — enforced floor 6s in wasender.ts). */
  WASENDER_GAP_MS: z.coerce.number().int().min(0).default(6000).optional(),

  REVIEW_FORM_WEBHOOK_SECRET: z.string().trim().min(1).optional(),

  STRIPE_SUCCESS_URL: z.string().trim().url().optional(),
  STRIPE_CANCEL_URL: z.string().trim().url().optional(),

  GOOGLE_OAUTH_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().trim().min(1).optional(),
  GOOGLE_OAUTH_REFRESH_TOKEN: z.string().trim().min(1).optional(),
  GOOGLE_CALENDAR_ID: z.string().trim().min(1).optional(),
});

const parsed = envSchema.parse(mergeRailwayBucketAliases());

// Hard-fail in production if the JWT secret is missing or still the
// dev default. We can't rely on Zod alone because the default makes
// the field "valid" at parse time.
const DEV_JWT_FALLBACK = "dev-only-change-this-auth-jwt-secret-min-32";
if (parsed.NODE_ENV === "production" && parsed.AUTH_JWT_SECRET === DEV_JWT_FALLBACK) {
  throw new Error(
    "AUTH_JWT_SECRET is the dev default in production. Set a real value (openssl rand -base64 48).",
  );
}

// C9: hard-fail in production if the seed admin email matches the one that
// was exposed in the public git repo / dev .env file. That account's
// password must be rotated before going live.
const EXPOSED_SEED_EMAIL = "kinghassaan99@gmail.com";
if (
  parsed.NODE_ENV === "production" &&
  process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() === EXPOSED_SEED_EMAIL
) {
  throw new Error(
    `SEED_ADMIN_EMAIL is set to the exposed dev email (${EXPOSED_SEED_EMAIL}) in production. ` +
      "Rotate the admin account password via the admin panel and remove this env var from Railway.",
  );
}

// Default: ON only when NODE_ENV === "development". Anything else
// (production, test, staging, preview…) must opt in via
// ADMIN_TOKEN_FALLBACK_ENABLED=true. Previously the default was
// "anything but production", which silently enabled the Bearer-token
// admin bypass in staging / preview environments where the value
// could be misconfigured.
const adminTokenFallbackEnabled =
  parsed.ADMIN_TOKEN_FALLBACK_ENABLED === undefined
    ? parsed.NODE_ENV === "development"
    : parsed.ADMIN_TOKEN_FALLBACK_ENABLED === true || parsed.ADMIN_TOKEN_FALLBACK_ENABLED === "true";

// Default empty (2FA optional for everyone, today's behaviour). Parses to a
// Set of role names for O(1) membership checks at the enforcement points.
const require2faForRoles = new Set(
  (parsed.REQUIRE_2FA_FOR_ROLES ?? "")
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter((r) => r.length > 0),
);

// Master compliance switch — see COMPLIANCE_MODE in the schema above.
// "strict" = today's behavior; "relaxed" = shadow-mode guard allowed in
// production (hard-fail below skipped) with both flags defaulting to false.
// Explicit MEDICAL_ACCESS_ENFORCE / ADMIN_PHI_REQUIRE_REASON always win.
const complianceMode = parsed.COMPLIANCE_MODE;

// Default OFF (shadow mode) in both compliance modes. Must be explicitly
// opted into with "true" — an explicit value overrides COMPLIANCE_MODE.
const medicalAccessEnforce =
  parsed.MEDICAL_ACCESS_ENFORCE === true || parsed.MEDICAL_ACCESS_ENFORCE === "true";

// Default OFF in both compliance modes — plain ADMIN keeps unconditional PHI
// access. When "true" (explicit value overrides COMPLIANCE_MODE), the
// medical-access guard requires a break-glass reason on the plain-ADMIN branch.
const adminPhiRequireReason =
  parsed.ADMIN_PHI_REQUIRE_REASON === true || parsed.ADMIN_PHI_REQUIRE_REASON === "true";

// Hard-fail in production if the medical-access guard is still in shadow
// mode. Shadow mode logs would-be denials but still serves PHI to the
// caller — acceptable during the Wave-0 backfill, never acceptable once
// this is a live production deployment. COMPLIANCE_MODE=relaxed skips this
// check (and ONLY this check) — the deliberate "run shadow mode in prod"
// escape hatch while the compliance backfill is in progress.
if (complianceMode === "strict" && parsed.NODE_ENV === "production" && !medicalAccessEnforce) {
  throw new Error(
    "MEDICAL_ACCESS_ENFORCE must be true in production — shadow mode still serves PHI on a denied " +
      "access. Confirm the 2FA/confidentiality/consent backfill is complete via the shadow-mode " +
      "MedicalAccessLog audit trail, then set MEDICAL_ACCESS_ENFORCE=true.",
  );
}

// Hard-fail in production if billing is not wired to real Stripe. The fake
// billing port "succeeds" checkouts in-memory with no payment ever taken —
// fine for dev/test, never acceptable if it silently ships to production
// because STRIPE_SECRET_KEY was left unset.
if (parsed.NODE_ENV === "production" && parsed.BILLING_DRIVER !== "stripe") {
  throw new Error(
    'BILLING_DRIVER must be "stripe" in production — refusing to boot on the in-memory fake billing port.',
  );
}
if (
  parsed.NODE_ENV === "production" &&
  parsed.BILLING_DRIVER === "stripe" &&
  !parsed.STRIPE_SECRET_KEY?.trim()
) {
  throw new Error("STRIPE_SECRET_KEY is required in production when BILLING_DRIVER=stripe.");
}

// Hard-fail in production if PHI encryption is unconfigured. Without this
// key, encryptPhi() is a silent no-op and national ID / passport / tax ID
// fields persist as plaintext with no warning.
if (parsed.NODE_ENV === "production" && !parsed.PHI_ENCRYPTION_KEY?.trim()) {
  throw new Error(
    "PHI_ENCRYPTION_KEY is required in production — without it, sensitive PatientProfile ID fields " +
      "are stored as plaintext. Set a key (min 16 chars) and run scripts/encrypt-phi-backfill.ts.",
  );
}

// Hard-fail in production if the fake-billing test-activation escape hatch
// is left on. The fake billing driver already refuses to activate in
// production (see BILLING_DRIVER guard above), but this is defense-in-depth
// against a misconfigured Railway var — never boot with a flag whose whole
// purpose is bypassing real payment on a live customer deployment.
if (
  parsed.NODE_ENV === "production" &&
  (parsed.ALLOW_TEST_SUBSCRIPTION_ACTIVATION === true ||
    parsed.ALLOW_TEST_SUBSCRIPTION_ACTIVATION === "true")
) {
  throw new Error(
    "ALLOW_TEST_SUBSCRIPTION_ACTIVATION must not be set in production — it lets a user self-grant a " +
      "free subscription without paying. Remove this env var from Railway.",
  );
}

// Hard-fail in production if the admin Bearer-token fallback is explicitly
// enabled. It's meant for local/dev/staging convenience only; on a live
// production deployment session-based admin auth must be the sole path.
if (
  parsed.NODE_ENV === "production" &&
  (parsed.ADMIN_TOKEN_FALLBACK_ENABLED === true || parsed.ADMIN_TOKEN_FALLBACK_ENABLED === "true")
) {
  throw new Error(
    "ADMIN_TOKEN_FALLBACK_ENABLED must not be true in production — session-based admin auth must be " +
      "the sole path. Remove this env var from Railway.",
  );
}

export const env = {
  ...parsed,
  ADMIN_TOKEN_FALLBACK_ENABLED: adminTokenFallbackEnabled,
  MEDICAL_ACCESS_ENFORCE: medicalAccessEnforce,
  ADMIN_PHI_REQUIRE_REASON: adminPhiRequireReason,
  REQUIRE_2FA_FOR_ROLES: require2faForRoles,
};
