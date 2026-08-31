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

/** Optional PEM secret. Same empty→unset handling as optionalSecret, plus it
 *  normalises literal "\n" escapes to real newlines so a multi-line PEM survives
 *  being pasted into a single-line Railway or .env variable. */
const optionalPem = z
  .preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.string().trim().min(1).optional(),
  )
  .transform((v) => (typeof v === "string" ? v.replace(/\\n/g, "\n") : v));

/** Wraps any optional string rule so a blank var counts as unset.
 *
 *  `optionalSecret` already does this for plain strings, but a var with its own
 *  shape rule — `.url()`, a regex — cannot reuse it. Without this, a documented
 *  blank placeholder (`SUKL_EPOUKAZ_CUEP_TEST_URL=`) fails validation and the process
 *  refuses to BOOT, which is a far worse outcome than the var simply being
 *  absent. Blank and missing must mean the same thing. */
const blankAsUnset = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

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
  // @deprecated (S-012 / SEC-004) Legacy HS256 shared secret. NO LONGER used for
  // auth sessions — those are RS256-only now (the HS256 sign/verify fallback was
  // removed from auth-session.ts). Retained solely as the fallback HMAC key for
  // Brazil consent-link tokens (brazil-consent-link.service.ts) until
  // BRAZIL_CONSENT_LINK_SECRET is set everywhere; drop it once that is done.
  AUTH_JWT_SECRET: z
    .string()
    .trim()
    .min(32, "AUTH_JWT_SECRET must be at least 32 characters")
    .default("dev-only-change-this-auth-jwt-secret-min-32"),
  // S-012: asymmetric session-token signing (RS256). The BACKEND alone holds the
  // private key and is the ONLY party that can MINT tokens; the frontend edge
  // middleware receives ONLY AUTH_JWT_PUBLIC_KEY, so a frontend compromise can
  // verify sessions but never forge them. PEM format (PKCS8 private / SPKI
  // public). Both required together in production (hard-fail below).
  AUTH_JWT_PRIVATE_KEY: optionalPem,
  AUTH_JWT_PUBLIC_KEY: optionalPem,
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
  /** Private ClamAV TCP endpoint for recruitment CV scanning. */
  CLAMAV_HOST: blankAsUnset(z.string().trim().min(1).optional()),
  CLAMAV_PORT: blankAsUnset(z.coerce.number().int().min(1).max(65535).default(3310)),
  CLAMAV_TIMEOUT_MS: blankAsUnset(z.coerce.number().int().min(1000).max(60000).default(15000)),
  RECRUITMENT_NOTIFICATION_EMAIL: blankAsUnset(
    z.string().trim().email().default("careers@myglobalhealth.online"),
  ),
  RECRUITMENT_PRIVACY_NOTICE_VERSION: z.string().trim().min(1).default("recruitment-privacy-v1"),
  RECRUITMENT_RETENTION_MONTHS: blankAsUnset(z.coerce.number().int().min(1).max(36).default(6)),
  RECRUITMENT_RETENTION_ENFORCE: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .default(false),

  /**
   * AWS Rekognition — face match between a patient's selfie and the photo on
   * their ID document (Ireland controlled-medication verification).
   *
   * Deliberately NOT the S3_* credentials: object storage here is an
   * S3-compatible bucket (Railway/Scaleway) with its own endpoint, whereas
   * Rekognition is a real AWS service and needs real AWS keys. Pin the region
   * to an EU one — the images are biometric-adjacent personal data.
   *
   * All optional. Unset means no automated score is produced and verification
   * falls back to pure human review; the feature still works.
   */
  REKOGNITION_REGION: optionalSecret,
  REKOGNITION_ACCESS_KEY_ID: optionalSecret,
  REKOGNITION_SECRET_ACCESS_KEY: optionalSecret,
  /** Similarity % below which CompareFaces is asked not to bother returning a
   *  match. blankAsUnset is load-bearing, not decoration: `z.coerce.number()`
   *  turns a blank var into 0, which would silently drop the threshold to
   *  "match anything" — the opposite of a safe default. */
  REKOGNITION_MIN_SIMILARITY: blankAsUnset(z.coerce.number().min(0).max(100).default(70)),

  /** SMTP sender (Migadu). Preferred over Gmail: the apex SPF record authorizes
   *  Migadu and the key1/key2/key3 DKIM CNAMEs are published, so mail sent this
   *  way aligns on both and passes DMARC. Gmail API sends do not align. */
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: blankAsUnset(z.coerce.number().int().min(1).max(65535).default(465)),
  SMTP_USER: z.string().trim().min(1).optional(),
  SMTP_PASSWORD: optionalSecret,
  /** From header, e.g. `Global Health <globalhealth@myglobalhealth.online>`.
   *  Must be on the Migadu-hosted domain or SPF alignment breaks. Defaults to SMTP_USER. */
  SMTP_FROM: z.string().trim().min(1).optional(),

  /** SendGrid (transactional email fallback when SMTP/Gmail are not configured). */
  SENDGRID_API_KEY: z.string().trim().min(1).optional(),
  EMAIL_FROM: z.string().trim().email().optional(),
  /** Gmail API sender (uses GOOGLE_OAUTH_* client + GMAIL_SEND_REFRESH_TOKEN with gmail.send scope). */
  GMAIL_SEND_FROM: z.string().trim().email().optional(),
  /** Refresh token authorized for gmail.send — separate from calendar/meet token. */
  GMAIL_SEND_REFRESH_TOKEN: z.string().trim().min(1).optional(),
  /** Used to build absolute URLs in emails (e.g. https://myglobalhealth.online). No trailing slash. */
  PUBLIC_SITE_URL: z.string().trim().url().optional(),
  /** Accounting archive inbox (Dext). Every PAID fiscal document for a country
   *  other than PT and CZ is forwarded there as a bare PDF — no body, no
   *  template. Falls back to the address baked into
   *  lib/email/sales-invoice-copy.ts, so production needs no variable at all.
   *  Set "off" to disable the forward entirely. Not `.email()` — "off" must pass. */
  SALES_INVOICE_COPY_EMAIL: z.string().trim().min(1).optional(),

  /** Trustpilot Automatic Feedback Service trigger address, e.g.
   *  `myglobalhealth.online+<hash>@invite.trustpilot.com`. Secret-ish: anyone
   *  holding it can raise invitations on our Trustpilot account, so it lives in
   *  env, never in code. Unset => Trustpilot invites are disabled entirely and
   *  doctors flagged for Trustpilot fall back to the internal review form. */
  TRUSTPILOT_AFS_TRIGGER_EMAIL: z.string().trim().email().optional(),
  /** Trustpilot's Free plan accepts 50 invitations per calendar month. Beyond
   *  that Trustpilot silently drops triggers, so we count our own sends and
   *  fall back to the internal form rather than losing the ask. Override only
   *  if the plan changes. */
  TRUSTPILOT_MONTHLY_INVITE_LIMIT: z.coerce.number().int().min(0).max(100_000).default(50),

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
  // Brazil has no account of its own on purpose: it charges on Ireland and
  // settles doctor payouts by bank transfer outside Stripe. See
  // lib/stripe/client.ts and docs/brazil-commission-and-doctor-payouts.md.

  /** Portugal InvoiceExpress — direct REST issuance of the legal InvoiceReceipt
   *  when a PT order is paid on the LIVE Stripe account. Both must be set for the
   *  issuer to fire; blank ("") is treated as unset. ACCOUNT is the subdomain
   *  (e.g. "globalguestsro" → https://globalguestsro.app.invoicexpress.com). */
  INVOICE_EXPRESS_API_KEY: optionalSecret,
  INVOICE_EXPRESS_ACCOUNT: optionalSecret,

  /** Synlab CZ — WebLIMS 2 Remote API (electronic laboratory requisitions).
   *  See docs/guides/synlab-integration-questions.md.
   *
   *  BASE_URL + CLIENT_ID + CLIENT_SECRET are the hard gate: with any of them
   *  unset `isWeblimsConfigured()` is false and the whole lab handoff is dark —
   *  the admin UI shows the queue but refuses to mint a form token. Blank ("")
   *  counts as unset, so the vars can sit empty in .env until Synlab issues
   *  test credentials.
   *
   *  BASE_URL has no default on purpose: their OpenAPI ships only the relative
   *  server path `/weblimsdev`, so guessing a host would silently point the
   *  integration at nothing. API_VERSION likewise — the value for the
   *  `X-Api-Version` header is not documented anywhere and must come from them. */
  WEBLIMS_BASE_URL: z.string().trim().url().optional(),
  WEBLIMS_CLIENT_ID: optionalSecret,
  WEBLIMS_CLIENT_SECRET: optionalSecret,
  WEBLIMS_API_VERSION: z.string().trim().min(1).optional(),

  /** Our identity in Synlab's FOL codebook, issued when they register us as a
   *  requesting workplace. Sent on every requisition. Unset → the field is
   *  omitted and their form falls back to whatever the logged-in WebLIMS user
   *  is bound to. */
  WEBLIMS_WARD_CODE: z.string().trim().min(1).optional(),
  WEBLIMS_WARD_ICP: z.string().trim().min(1).optional(),
  WEBLIMS_WARD_NODE: z.string().trim().min(1).optional(),
  WEBLIMS_WARD_SPECIALITY: z.string().trim().min(1).optional(),
  /** Fallback prescribing doctor for requisitions whose doctor is not
   *  registered in the Czech KRZP register (question B3). */
  WEBLIMS_DEFAULT_DOCTOR_CODE: z.string().trim().min(1).optional(),
  /** FOL insurance/invoice code for a self-paying patient (question B4). Our
   *  billing model is self-pay, so this is the code sent on every requisition
   *  until insurance-billed exams are supported. */
  WEBLIMS_SELFPAY_INSURANCE_CODE: z.string().trim().min(1).optional(),

  /** Memed (doc.memed.com.br) — Brazil prescription/exam-kit partner API.
   *  No production credentials yet (partner onboarding in progress, see
   *  parcerias@memed.com.br). All optional so the integration ships dark:
   *  `isMemedConfigured()` is false until every var below is set, and a paid
   *  HEALTH_TEST order just logs "Memed not configured" instead of throwing. */
  MEMED_BASE_URL: z.string().trim().url().optional(),
  MEMED_CLIENT_ID: optionalSecret,
  MEMED_CLIENT_SECRET: optionalSecret,
  MEMED_API_TOKEN: optionalSecret,
  /** Dr. Tiago's Memed doctor id — every kit booking is attributed to this one
   *  fixed doctor account. */
  MEMED_DEFAULT_DOCTOR_ID: z.string().trim().min(1).optional(),

  /** Memed Prescrição — the doctor-facing e-prescription/certificate WIDGET,
   *  a different Memed product surface from the booking API above (separate
   *  credentials expected). BR doctors embed this in the doctor portal to
   *  digitally sign prescriptions/certificates/exam requests themselves —
   *  see lib/memed/prescription-client.ts. No credentials yet; all optional
   *  so `isMemedPrescriptionConfigured()` stays false and the doctor portal
   *  falls back to the existing unsigned DOCX flow until this is live. */
  MEMED_PRESCRIPTION_BASE_URL: z.string().trim().url().optional(),
  MEMED_PRESCRIPTION_CLIENT_ID: optionalSecret,
  MEMED_PRESCRIPTION_SECRET: optionalSecret,
  /** Memed's widget JS bundle URL — frontend-facing, kept in env so
   *  sandbox/prod can be swapped without a redeploy. */
  MEMED_PRESCRIPTION_SCRIPT_URL: z.string().trim().url().optional(),

  /** SÚKL (Czech State Institute for Drug Control) — ePoukaz / eRecept.
   *  See docs/sukl/SECURITY_MODEL.md and docs/sukl/INTERFACE_INVENTORY.md.
   *
   *  Authentication is mutual TLS with a *workplace* communication certificate
   *  issued to Global Guest s.r.o. — NOT a doctor's personal signing key. SÚKL
   *  confirmed no per-doctor qualified signature is required, which is why no
   *  doctor key material is accepted or stored anywhere in this integration.
   *
   *  Everything here is optional so the feature ships dark: with the gate
   *  unsatisfied `isSuklConfigured()` is false, the admin console renders a red
   *  status card and no SÚKL call can fire. See lib/sukl/index.ts.
   *
   *  Certificate source, checked in this order:
   *    SUKL_TEST_PFX_BASE64 — Railway. Decoded in backend memory, never to disk.
   *    SUKL_TEST_PFX_PATH   — local dev. Absolute path OUTSIDE the repo.
   *  BASE64 wins when both are set, so a Railway service cannot accidentally
   *  fall through to a stale path baked into an image. */
  /** Every var here is wrapped so a blank placeholder means "unset" rather than
   *  a validation failure — these are documented as blank in .env.example, and a
   *  blank value must never stop the process booting. */
  SUKL_ENVIRONMENT: blankAsUnset(z.enum(["test", "production"]).optional()),
  SUKL_TEST_PFX_PATH: optionalSecret,
  SUKL_TEST_PFX_BASE64: optionalSecret,
  SUKL_TEST_PFX_PASSWORD: optionalSecret,
  /** Test workplace code assigned by SÚKL (case SUKL206641/2026). */
  SUKL_TEST_WORKPLACE_CODE: optionalSecret,
  /** IČO of the legal entity that owns the workplace. Exactly 8 digits. */
  SUKL_TEST_ENTITY_ICO: blankAsUnset(
    z
      .string()
      .trim()
      .regex(/^\d{8}$/, "SUKL_TEST_ENTITY_ICO must be 8 digits")
      .optional(),
  ),
  /** SÚKL exposes ePoukaz as TWO separate SOAP services, not one base URL with
   *  paths: CUEP is the voucher service itself, COMMON carries the shared
   *  operations (code lists, versions, ping). Each has its own host, so they are
   *  configured independently and gated independently.
   *
   *  MUST be reconciled against the `soap:address` values in the current ePoukaz
   *  v19 WSDL before any request is sent — the host is only half of an endpoint
   *  and the path comes from the WSDL. See docs/sukl/INTERFACE_INVENTORY.md.
   *
   *  No defaults: an unset service is reported as unconfigured rather than
   *  silently pointed at nothing (same reasoning as WEBLIMS_BASE_URL).
   *
   *  Deliberately absent: the cross-border pharmacist endpoint. It is not
   *  configured until SÚKL confirms which cross-border workflow an outpatient
   *  workplace may perform — see docs/sukl/SCOPE_CONFIRMATION.md Q7. */
  SUKL_EPOUKAZ_CUEP_TEST_URL: blankAsUnset(z.string().trim().url().optional()),
  SUKL_EPOUKAZ_COMMON_TEST_URL: blankAsUnset(z.string().trim().url().optional()),

  /** Request identity. EVERY SÚKL operation — including the read-only ping —
   *  carries `Pristupujici { Uzivatel, Pracoviste }`, so without these no call
   *  can be made at all. Confirmed against `identifikace_pristupujiciho_type`
   *  in CommonSchema.xsd.
   *
   *  UZIVATEL is the account login issued by SÚKL's External Identity system;
   *  the observed format is a GUID (the schema allows any string up to 36
   *  chars). It identifies the CALLING ACCOUNT, not the prescribing doctor — in
   *  the test environment SÚKL expect the system developer's account, because
   *  doctors normally have no test account. Treat it as a credential: never log
   *  it, never return it from an API.
   *
   *  `Pracoviste` is the 11-digit workplace code, already configured as
   *  SUKL_TEST_WORKPLACE_CODE — the schema field is exactly that value.
   *
   *  INTERFACE_VERSION goes in the `Zprava` header of every message (pattern
   *  `[0-9]{6}[A-Z]`, e.g. 202601B). It is not negotiated and a wrong value is
   *  rejected, so there is no default — read it from the WSDL that the admin
   *  console fetches.
   *
   *  SW_KLIENTA identifies our software to SÚKL, max 12 characters. We choose
   *  it; it is not issued. */
  SUKL_TEST_UZIVATEL: optionalSecret,
  /** Optional HTTP Basic password, sent with SUKL_TEST_UZIVATEL as the username
   *  IN ADDITION to the client certificate. Opt-in: leave unset unless SÚKL's
   *  response actually asks for a credential scheme (a `WWW-Authenticate`
   *  header), because sending a password to a server that never requested one
   *  is its own mistake. This is the test-access account password. */
  SUKL_TEST_PASSWORD: optionalSecret,
  SUKL_INTERFACE_VERSION: blankAsUnset(
    z
      .string()
      .trim()
      .regex(/^\d{6}[A-Z]$/, "SUKL_INTERFACE_VERSION must look like 202601B")
      .optional(),
  ),
  SUKL_SW_KLIENTA: blankAsUnset(
    z.string().trim().min(1).max(12, "SUKL_SW_KLIENTA is limited to 12 characters").optional(),
  ),

  SUKL_REQUEST_TIMEOUT_MS: blankAsUnset(
    z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  ),

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

  /** Shared secret between the Next.js frontend proxies and this API. When a
   *  request carries x-gh-proxy-secret matching this value, the rate limiter
   *  keys on the x-gh-client-ip header (the real visitor IP the frontend saw)
   *  instead of request.ip — otherwise ALL proxied traffic collapses onto the
   *  frontend service's single egress IP and one shared bucket 429s the whole
   *  site. Set the SAME value on both Railway services. Unset → limiter keys
   *  on request.ip only (previous behaviour). */
  PROXY_CLIENT_IP_SECRET: z.string().min(16).optional(),

  /** Requests per minute for the `gh-ssr` bucket — live server-side public
   *  content reads from the Next.js frontend (see utils/rate-limit-trust.ts).
   *  Separate from the build bucket's 20,000/min on purpose: a build is a
   *  short burst nobody waits on, SSR runs continuously and must stay near
   *  what this server can actually serve.
   *
   *  Default 3,000/min = 50 req/s, chosen from measurement (2026-08-08), not
   *  guessed:
   *    - DEMAND. One cold service-page render = 12 backend GETs. A
   *      concurrency-12 crawl of 59 pages issued 145 backend requests in 28s
   *      (~311/min) against a dev-mode frontend; a compiled frontend renders
   *      roughly an order of magnitude faster, so ~3,000/min covers that same
   *      crawl shape with headroom. Steady-state layout reads across 6 markets
   *      x 6 locales are ~288/min of that on their own.
   *    - CAPACITY. With the limiter bypassed this server sustained 110-120
   *      req/s (6,600-7,200/min) with ZERO 5xx up to 64 concurrent, and the pg
   *      pool never exceeded its 10 connections. 3,000/min is ~45% of measured
   *      capacity, leaving the rest for real visitors and deploy-time builds.
   *  So: 10x the old shared ceiling, less than half of what the box can do,
   *  and still a real ceiling — an abusive SSR workload hits it. Raise only
   *  with a measurement that shows sustained legitimate demand above it. */
  RATE_LIMIT_SSR_MAX: z.coerce.number().int().min(300).max(20_000).default(3_000),

  /** Optional ops-alert webhook (Slack/Discord/generic). When set, money/ops
   *  reconciliation findings + subscription webhook failures POST a JSON
   *  {text,severity,...} here. Unset → alerts are logged only (§39). */
  OPS_ALERT_WEBHOOK: z.string().url().optional(),

  /** Inbox that receives a duplicate of every automation email (internal record).
   *  Defaults to globalhealth@myglobalhealth.online when unset. */
  AUTOMATION_OFFICIAL_EMAIL: z.string().trim().email().optional(),

  /** Comma-separated staff WhatsApp numbers (E.164, e.g. "+3538900000,+351900000")
   *  that receive the per-booking admin alert (order no., slot, doctor, service —
   *  the patient name is withheld when the patient declined WhatsApp updates).
   *  Unset → the WhatsApp leg of the admin alert is skipped; the in-portal
   *  admin notification still fires. */
  ADMIN_NOTIFY_WHATSAPP_NUMBERS: z.string().trim().optional(),

  /** Comma-separated staff inboxes that receive the same admin booking alert by
   *  email. Unset → the email leg is skipped. */
  ADMIN_NOTIFY_EMAILS: z.string().trim().optional(),

  /** WhatsApp group JID that mirrors the payment_confirmed admin alert
   *  (e.g. "120363413688325038@g.us"). Unset → that group leg is skipped. */
  ADMIN_NOTIFY_WHATSAPP_GROUP_JID: z.string().trim().optional(),

  /** Minutes to suppress repeat "doctor has sent a text" support-chat emails on
   *  the same thread. The window is cleared the moment an admin replies, so an
   *  answered thread always alerts again immediately. */
  SUPPORT_ALERT_THROTTLE_MINUTES: z.coerce.number().int().min(0).max(1440).default(15),

  /** Minutes to suppress repeat "patient sent a message" email+WhatsApp alerts
   *  (admin clinic thread and doctor consultation thread) on the same
   *  appointment. A burst of consecutive patient messages only alerts once
   *  per window; the in-portal bell still fires on every message. */
  PATIENT_MESSAGE_ALERT_THROTTLE_MINUTES: z.coerce.number().int().min(0).max(1440).default(15),

  BRAZIL_BOOKING_URL: z.string().trim().url().optional(),
  BRAZIL_CONSENT_NOTIFY_EMAIL: z.string().trim().email().optional(),
  BRAZIL_CONSENT_DOCTOR_PHONE: z.string().trim().optional(),
  /** Dedicated HMAC secret for Brazil consent-link tokens (S-012 follow-up).
   *  Optional: falls back to AUTH_JWT_SECRET; setting it invalidates
   *  outstanding links, so flip deliberately. */
  BRAZIL_CONSENT_LINK_SECRET: z.string().trim().min(32).optional(),

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

  /** SEC-008 emergency escape hatch for audit-store OUTAGES only. Default FALSE.
   *  When the guard is enforcing, a failed MedicalAccessLog write DENIES the PHI
   *  read (fail-closed, CWE-778 — no PHI served without its mandatory audit row).
   *  Set "true" only during a confirmed audit-store outage to let reads proceed;
   *  the write failure is then logged loudly instead of blocking. Deliberately
   *  NOT part of the production boot assertions — it's an operational break-glass
   *  toggle, not a steady-state config value. See lib/medical-access-guard.ts. */
  PHI_AUDIT_EMERGENCY_BYPASS: z
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
  // SEO reporting accepts the shorter aliases too. Calendar/Meet and Gmail
  // continue using the GOOGLE_OAUTH_* names above with their own tokens.
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  GOOGLE_OAUTH_REDIRECT_URI: blankAsUnset(z.string().trim().url().optional()),
  GOOGLE_GSC_SITE_URL: optionalSecret,
  GOOGLE_GA4_PROPERTY_ID: blankAsUnset(z.string().trim().regex(/^\d+$/).optional()),
  // Refresh token authorized for webmasters.readonly + analytics.readonly.
  // Deliberately separate from Calendar/Meet and Gmail refresh tokens.
  GOOGLE_SEO_REFRESH_TOKEN: optionalSecret,
  GOOGLE_CALENDAR_ID: z.string().trim().min(1).optional(),
});

/** Privileged (non-patient) roles that MUST be gated by 2FA in production.
 *  Matches the REQUIRE_2FA_FOR_ROLES doc example and the guard's role set. */
const PRIVILEGED_2FA_ROLES = ["SUPER_ADMIN", "ADMIN", "LOCAL_ADMIN", "DOCTOR"] as const;

/**
 * SEC-005: fail-fast at boot when the medical-access guard would run in a
 * shadow / non-enforcing configuration in production — a denied PHI read that
 * is logged but still served. Refuses to start if ANY of these hold in
 * production (each throw names the offending var):
 *   - COMPLIANCE_MODE=relaxed (the escape hatch that skips shadow-mode enforcement)
 *   - MEDICAL_ACCESS_ENFORCE off (shadow mode — denials logged, never blocked)
 *   - ADMIN_PHI_REQUIRE_REASON off (plain ADMIN reads PHI with no break-glass reason)
 *   - REQUIRE_2FA_FOR_ROLES missing any privileged role (unverified staff read PHI)
 * Non-production keeps the permissive dev defaults untouched. Exported so the
 * unit test can exercise each combination without mutating process.env.
 */
export function assertProductionMedicalAccessSafety(cfg: {
  nodeEnv: string;
  complianceMode: string;
  medicalAccessEnforce: boolean;
  adminPhiRequireReason: boolean;
  require2faForRoles: Set<string>;
}): void {
  if (cfg.nodeEnv !== "production") return;

  if (cfg.complianceMode === "relaxed") {
    throw new Error(
      'COMPLIANCE_MODE must not be "relaxed" in production — relaxed mode lets the medical-access ' +
        "guard run in shadow mode, so a denied PHI read is still served. Set COMPLIANCE_MODE=strict.",
    );
  }
  if (!cfg.medicalAccessEnforce) {
    throw new Error(
      "MEDICAL_ACCESS_ENFORCE must be true in production — shadow mode logs would-be denials but still " +
        "serves PHI to the caller. Confirm the 2FA/confidentiality/consent backfill is complete via the " +
        "shadow-mode MedicalAccessLog audit trail, then set MEDICAL_ACCESS_ENFORCE=true.",
    );
  }
  if (!cfg.adminPhiRequireReason) {
    throw new Error(
      "ADMIN_PHI_REQUIRE_REASON must be true in production — otherwise a plain ADMIN reads any medical " +
        "record without recording a break-glass reason. Set ADMIN_PHI_REQUIRE_REASON=true.",
    );
  }
  const missing2fa = PRIVILEGED_2FA_ROLES.filter((r) => !cfg.require2faForRoles.has(r));
  if (missing2fa.length > 0) {
    throw new Error(
      `REQUIRE_2FA_FOR_ROLES must include every privileged role in production (missing: ${missing2fa.join(", ")}). ` +
        `Without it, staff who never enrolled TOTP can still read PHI. Set REQUIRE_2FA_FOR_ROLES=${PRIVILEGED_2FA_ROLES.join(",")}.`,
    );
  }
}

const parsed = envSchema.parse(mergeRailwayBucketAliases());

// Hard-fail in production if AUTH_JWT_SECRET is still the dev default. It no
// longer signs/verifies auth sessions (RS256-only now), but it is still the
// fallback HMAC key for Brazil consent-link tokens, so a dev-default value in
// production is unsafe. We can't rely on Zod alone because the default makes the
// field "valid" at parse time.
const DEV_JWT_FALLBACK = "dev-only-change-this-auth-jwt-secret-min-32";
if (parsed.NODE_ENV === "production" && parsed.AUTH_JWT_SECRET === DEV_JWT_FALLBACK) {
  throw new Error(
    "AUTH_JWT_SECRET is the dev default in production. Set a real value (openssl rand -base64 48).",
  );
}

// S-012 / SEC-004: RS256 is the SOLE auth-session algorithm. The backend signs
// with the private key (only it can mint tokens); both services verify with the
// public key. There is no HS256 fallback anymore, so the keypair is mandatory in
// production.
if (
  parsed.NODE_ENV === "production" &&
  (!parsed.AUTH_JWT_PRIVATE_KEY || !parsed.AUTH_JWT_PUBLIC_KEY)
) {
  throw new Error(
    "AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY are required in production (S-012 asymmetric " +
      "session signing). Generate an RS256 keypair:\n" +
      "  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt-private.pem\n" +
      "  openssl pkey -in jwt-private.pem -pubout -out jwt-public.pem\n" +
      "Set AUTH_JWT_PRIVATE_KEY (private PEM) on the BACKEND service only, and AUTH_JWT_PUBLIC_KEY " +
      "(public PEM) on BOTH the backend and frontend services.",
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

// SEC-008: default OFF. When on, a failed audit write no longer blocks a PHI
// read (audit-store-outage break-glass). Intentionally excluded from the
// production boot assertions below — it's an operational toggle, not config.
const phiAuditEmergencyBypass =
  parsed.PHI_AUDIT_EMERGENCY_BYPASS === true || parsed.PHI_AUDIT_EMERGENCY_BYPASS === "true";

const recruitmentRetentionEnforce =
  parsed.RECRUITMENT_RETENTION_ENFORCE === true || parsed.RECRUITMENT_RETENTION_ENFORCE === "true";

// SEC-005: hard-fail in production if the medical-access guard would run in a
// shadow / non-enforcing configuration. Previously COMPLIANCE_MODE=relaxed was
// an escape hatch that skipped the shadow-mode check entirely — leaving denied
// PHI reads served in production. assertProductionMedicalAccessSafety now closes
// that hole: relaxed mode, shadow enforcement, a missing break-glass-reason
// requirement, and any privileged role not gated by 2FA each refuse to boot.
assertProductionMedicalAccessSafety({
  nodeEnv: parsed.NODE_ENV,
  complianceMode,
  medicalAccessEnforce,
  adminPhiRequireReason,
  require2faForRoles,
});

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

// SÚKL production is not approved. Switching environments is NOT a URL swap:
// production needs a different communication certificate, production endpoints,
// production workplace identifiers, doctor mappings, written SÚKL permission and
// a security review. Refuse to boot rather than let a one-line env flip send
// real prescription data to the live national eRecept system.
if (parsed.SUKL_ENVIRONMENT === "production") {
  throw new Error(
    "SUKL_ENVIRONMENT=production is not approved — only the SÚKL test environment is " +
      "implemented. See docs/sukl/SECURITY_MODEL.md for the production checklist.",
  );
}

export const env = {
  ...parsed,
  ADMIN_TOKEN_FALLBACK_ENABLED: adminTokenFallbackEnabled,
  MEDICAL_ACCESS_ENFORCE: medicalAccessEnforce,
  ADMIN_PHI_REQUIRE_REASON: adminPhiRequireReason,
  PHI_AUDIT_EMERGENCY_BYPASS: phiAuditEmergencyBypass,
  RECRUITMENT_RETENTION_ENFORCE: recruitmentRetentionEnforce,
  REQUIRE_2FA_FOR_ROLES: require2faForRoles,
};
