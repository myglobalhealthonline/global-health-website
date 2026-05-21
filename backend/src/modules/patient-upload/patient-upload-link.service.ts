import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEV_JWT_FALLBACK = "dev-only-change-this-auth-jwt-secret-min-32";

// Derive a sub-key from AUTH_JWT_SECRET when no dedicated secret is set, so
// patient-upload tokens never share signing keys with session JWTs. In
// production AUTH_JWT_SECRET is required to be non-default (enforced in
// config/env.ts), so this derivation is safe; in dev it still produces a
// stable key for testing.
function secret(): string {
  const dedicated = env.PATIENT_UPLOAD_LINK_SECRET?.trim();
  if (dedicated) return dedicated;
  if (env.NODE_ENV === "production" && env.AUTH_JWT_SECRET === DEV_JWT_FALLBACK) {
    throw new Error(
      "Cannot sign patient-upload tokens: AUTH_JWT_SECRET is the dev default and PATIENT_UPLOAD_LINK_SECRET is unset.",
    );
  }
  return createHmac("sha256", env.AUTH_JWT_SECRET)
    .update("patient-upload-link/v2")
    .digest("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type PatientUploadTokenClaims = {
  email: string;
  appointmentId: string;
  doctorId: string;
};

export function createPatientUploadToken(claims: PatientUploadTokenClaims): {
  token: string;
  expiresAt: Date;
} {
  const normalizedEmail = claims.email.trim().toLowerCase();
  const appointmentId = claims.appointmentId.trim();
  const doctorId = claims.doctorId.trim();
  if (!normalizedEmail || !appointmentId || !doctorId) {
    throw new Error("email, appointmentId and doctorId are required");
  }
  const exp = Date.now() + TOKEN_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  // v2 layout: version|email|appointmentId|doctorId|exp|nonce|sig
  const body = `v2|${normalizedEmail}|${appointmentId}|${doctorId}|${exp}|${nonce}`;
  const sig = sign(body);
  return {
    token: Buffer.from(`${body}|${sig}`).toString("base64url"),
    expiresAt: new Date(exp),
  };
}

export function verifyPatientUploadToken(
  token: string,
):
  | { ok: true; email: string; appointmentId: string; doctorId: string }
  | { ok: false; message: string } {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 7 || parts[0] !== "v2") {
      return { ok: false, message: "Invalid upload link" };
    }
    const [, email, appointmentId, doctorId, expStr, nonce, sig] = parts;
    const body = `v2|${email}|${appointmentId}|${doctorId}|${expStr}|${nonce}`;
    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, message: "Invalid upload link" };
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) {
      return { ok: false, message: "Upload link has expired" };
    }
    return {
      ok: true,
      email: email.trim().toLowerCase(),
      appointmentId,
      doctorId,
    };
  } catch {
    return { ok: false, message: "Invalid upload link" };
  }
}

export function buildPatientUploadUrl(token: string): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/patient-upload?token=${encodeURIComponent(token)}`;
}
