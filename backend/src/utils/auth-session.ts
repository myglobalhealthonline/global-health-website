import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type UserRoleType = "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | "CORPORATE_ADMIN";

type AuthTokenPayload = {
  sub: string;
  role: UserRoleType;
  email: string;
  /** Snapshot of User.tokenVersion at sign time. "Sign out of all devices"
   *  bumps the DB value, so a caller that also checks the DB value against
   *  this can invalidate every previously-issued token at once. Defaults to
   *  0 (matches the column default) when the caller doesn't pass one — real
   *  login/register/2FA paths always pass the real value; only tests rely
   *  on the default. */
  tokenVersion?: number;
};

const JWT_ISSUER = "global-health-backend";
const JWT_AUDIENCE = "global-health-website";

// S-012: sign sessions with an RS256 PRIVATE key that only the backend holds, so
// a frontend compromise (which only ever gets the PUBLIC key) can never mint
// tokens. When the keypair is absent — local dev, or the brief pre-migration
// window — fall back to signing HS256 with the legacy shared secret. Computed
// once at module load.
const SIGNING: { key: string; alg: jwt.Algorithm } = env.AUTH_JWT_PRIVATE_KEY
  ? { key: env.AUTH_JWT_PRIVATE_KEY, alg: "RS256" }
  : { key: env.AUTH_JWT_SECRET, alg: "HS256" };

/**
 * Verify a token this backend minted, trying the new RS256 public key first and
 * falling back to the legacy HS256 shared secret. Returns the decoded payload or
 * null; callers validate their own claims.
 *
 * TRANSITION (S-012, zero-downtime): sessions issued before asymmetric signing
 * shipped are HS256-signed with AUTH_JWT_SECRET; every new login mints an RS256
 * token. The fallback lets those old cookies keep working until they expire or the
 * user re-authenticates — nobody is force-logged-out on deploy. Each branch PINS
 * its own algorithm to its own key, so there is no RS256↔HS256 alg-confusion: the
 * public key is only ever used as an RS256 verifier, never as an HMAC secret, and
 * the shared secret is only ever used with HS256.
 *
 * FOLLOW-UP (S-012 HS256 removal): once every pre-deploy session has naturally
 * rotated — one AUTH_JWT_EXPIRES_IN window (~1 week) after this reaches
 * production — delete the HS256 branch below and remove AUTH_JWT_SECRET from
 * env.ts + Railway. Do NOT automate this; it is a deliberate manual follow-up.
 */
function verifyWithRotation(token: string): jwt.JwtPayload | null {
  const opts = { issuer: JWT_ISSUER, audience: JWT_AUDIENCE };
  // Primary: RS256 via the public key.
  if (env.AUTH_JWT_PUBLIC_KEY) {
    try {
      const decoded = jwt.verify(token, env.AUTH_JWT_PUBLIC_KEY, { ...opts, algorithms: ["RS256"] });
      if (decoded && typeof decoded === "object") return decoded;
    } catch {
      // Not a valid RS256 token — try the legacy HS256 secret below.
    }
  }
  // Fallback: legacy HS256 via the shared secret (TEMPORARY — see FOLLOW-UP above).
  if (env.AUTH_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, env.AUTH_JWT_SECRET, { ...opts, algorithms: ["HS256"] });
      if (decoded && typeof decoded === "object") return decoded;
    } catch {
      // Invalid under both keys.
    }
  }
  return null;
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign({ ...payload, tokenVersion: payload.tokenVersion ?? 0 }, SIGNING.key, {
    algorithm: SIGNING.alg,
    expiresIn: env.AUTH_JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const decoded = verifyWithRotation(token);
  if (!decoded) return null;
  const sub = decoded.sub;
  const role = decoded.role;
  const email = decoded.email;
  const validRoles: UserRoleType[] = ["PATIENT", "ADMIN", "DOCTOR", "LOCAL_ADMIN", "SUPER_ADMIN", "CORPORATE_ADMIN"];
  if (
    typeof sub !== "string" ||
    !validRoles.includes(role as UserRoleType) ||
    typeof email !== "string"
  ) {
    return null;
  }
  const tokenVersion = typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : 0;
  return { sub, role, email, tokenVersion };
}

// ─── Pending-2FA token ──────────────────────────────────────────────────────
// Short-lived (5 min), not a session. Issued on successful password check when
// 2FA is enabled. The /api/auth/2fa/verify-login endpoint consumes it and
// issues a full auth cookie on TOTP success.

export function signPending2faToken(userId: string): string {
  return jwt.sign({ sub: userId, pending2fa: true }, SIGNING.key, {
    algorithm: SIGNING.alg,
    expiresIn: "5m",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyPending2faToken(token: string): { userId: string } | null {
  const decoded = verifyWithRotation(token);
  if (!decoded) return null;
  const { sub, pending2fa } = decoded as Record<string, unknown>;
  if (typeof sub !== "string" || pending2fa !== true) return null;
  return { userId: sub };
}

export function authCookieOptions() {
  const secure = env.NODE_ENV === "production";
  const domain = env.AUTH_COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    // "lax" (not "strict") so the session cookie is still sent on a top-level
    // GET navigation back from an external site — e.g. returning from Stripe
    // Checkout to /account/membership. With "strict" the browser withholds the
    // cookie on that cross-site return, so the patient lands logged out. "lax"
    // still withholds it on cross-site POSTs / subresource requests (CSRF-safe).
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    ...(domain ? { domain } : {}),
  };
}
