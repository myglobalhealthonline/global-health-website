import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  return (
    env.PATIENT_UPLOAD_LINK_SECRET?.trim() ||
    env.AUTH_JWT_SECRET ||
    "dev-only-change-this-auth-jwt-secret-min-32"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPatientUploadToken(email: string): {
  token: string;
  expiresAt: Date;
} {
  const normalized = email.trim().toLowerCase();
  const exp = Date.now() + TOKEN_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const body = `${normalized}|${exp}|${nonce}`;
  const sig = sign(body);
  return {
    token: Buffer.from(`${body}|${sig}`).toString("base64url"),
    expiresAt: new Date(exp),
  };
}

export function verifyPatientUploadToken(
  token: string,
): { ok: true; email: string } | { ok: false; message: string } {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 4) {
      return { ok: false, message: "Invalid upload link" };
    }
    const [email, expStr, nonce, sig] = parts;
    const body = `${email}|${expStr}|${nonce}`;
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
    return { ok: true, email: email.trim().toLowerCase() };
  } catch {
    return { ok: false, message: "Invalid upload link" };
  }
}

export function buildPatientUploadUrl(token: string): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/patient-upload?token=${encodeURIComponent(token)}`;
}
