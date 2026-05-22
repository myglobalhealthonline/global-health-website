import { z } from "zod";

/** Railway bucket presets expose ENDPOINT, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION — alias into S3_* names. */
function mergeRailwayBucketAliases(): NodeJS.ProcessEnv {
  const out = { ...process.env };
  if (!out.S3_BUCKET?.trim() && out.BUCKET?.trim()) out.S3_BUCKET = out.BUCKET;
  if (!out.S3_ENDPOINT?.trim() && out.ENDPOINT?.trim()) out.S3_ENDPOINT = out.ENDPOINT;
  if (!out.S3_ACCESS_KEY_ID?.trim() && out.ACCESS_KEY_ID?.trim()) out.S3_ACCESS_KEY_ID = out.ACCESS_KEY_ID;
  if (!out.S3_SECRET_ACCESS_KEY?.trim() && out.SECRET_ACCESS_KEY?.trim()) out.S3_SECRET_ACCESS_KEY = out.SECRET_ACCESS_KEY;
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

  /** SendGrid (transactional email). All three required to actually send. */
  SENDGRID_API_KEY: z.string().trim().min(1).optional(),
  EMAIL_FROM: z.string().trim().email().optional(),
  /** Used to build absolute URLs in emails (e.g. https://myglobalhealth.online). No trailing slash. */
  PUBLIC_SITE_URL: z.string().trim().url().optional(),

  /** Stripe — keep test keys in dev. Payments stay disabled when STRIPE_SECRET_KEY is absent. */
  STRIPE_SECRET_KEY: z.string().trim().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().min(1).optional(),

  /** Google Places API key — when set, the reviews-config endpoint
   *  refreshes the Google aggregate in the background (24h TTL).
   *  Without it the admin-entered aggregate is used as-is. */
  GOOGLE_PLACES_API_KEY: z.string().trim().min(1).optional(),

  /** Shared secret for the cron worker that calls /api/internal/run-reminders.
   *  Required to keep the endpoint behind auth without needing a session.
   *  Generate with: openssl rand -base64 32. */
  CRON_SECRET: z.string().trim().min(16).optional(),

  BRAZIL_BOOKING_URL: z.string().trim().url().optional(),
  BRAZIL_CONSENT_NOTIFY_EMAIL: z.string().trim().email().optional(),
  BRAZIL_CONSENT_DOCTOR_PHONE: z.string().trim().optional(),

  PATIENT_UPLOAD_LINK_SECRET: z.string().trim().min(16).optional(),

  WASENDER_API_TOKEN: z.string().trim().min(1).optional(),
  WASENDER_GAP_MS: z.coerce.number().int().min(0).default(5500).optional(),

  REVIEW_FORM_WEBHOOK_SECRET: z.string().trim().min(1).optional(),

  STRIPE_SUCCESS_URL: z.string().trim().url().optional(),
  STRIPE_CANCEL_URL: z.string().trim().url().optional(),
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

export const env = {
  ...parsed,
  ADMIN_TOKEN_FALLBACK_ENABLED: adminTokenFallbackEnabled,
};
