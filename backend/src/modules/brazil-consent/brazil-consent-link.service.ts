import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Signed-link tokens for the public Brazil consent form.
 *
 * The consent form exposes patient PII (name, email, phone, DOB, symptoms),
 * so the public `GET /api/public/brazil-consent` endpoint must not be
 * reachable with an appointment id alone — appointment ids travel in URLs,
 * emails and logs and are not secrets. Each consent link carries an
 * HMAC token bound to the appointment id; the endpoint verifies it before
 * returning any data.
 *
 * Mirrors the patient-upload link design (HMAC over a versioned payload,
 * timing-safe compare, secret derived from AUTH_JWT_SECRET).
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — consent can be paid late
const DEV_JWT_FALLBACK = "dev-only-change-this-auth-jwt-secret-min-32";

function secret(): string {
  // Prefer the dedicated secret so this HMAC no longer shares key material with
  // the auth JWTs (S-012 follow-up). Falls back to AUTH_JWT_SECRET so existing
  // links stay valid until BRAZIL_CONSENT_LINK_SECRET is deliberately set —
  // note: flipping it invalidates outstanding (30-day TTL) links.
  const base = env.BRAZIL_CONSENT_LINK_SECRET ?? env.AUTH_JWT_SECRET;
  if (env.NODE_ENV === "production" && base === DEV_JWT_FALLBACK) {
    throw new Error(
      "Cannot sign Brazil consent tokens: secret is the dev default.",
    );
  }
  return createHmac("sha256", base)
    .update("brazil-consent-link/v1")
    .digest("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createBrazilConsentToken(appointmentId: string): string {
  const id = appointmentId.trim();
  if (!id) throw new Error("appointmentId is required");
  const exp = Date.now() + TOKEN_TTL_MS;
  const body = `v1|${id}|${exp}`;
  return Buffer.from(`${body}|${sign(body)}`).toString("base64url");
}

export function verifyBrazilConsentToken(
  appointmentId: string,
  token: string | undefined | null,
): { ok: true } | { ok: false; message: string } {
  if (!token) return { ok: false, message: "Missing consent link token" };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 4 || parts[0] !== "v1") {
      return { ok: false, message: "Invalid consent link" };
    }
    const [, id, expStr, sig] = parts;
    if (id !== appointmentId.trim()) {
      return { ok: false, message: "Invalid consent link" };
    }
    const expected = sign(`v1|${id}|${expStr}`);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, message: "Invalid consent link" };
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) {
      return { ok: false, message: "Consent link has expired" };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Invalid consent link" };
  }
}
