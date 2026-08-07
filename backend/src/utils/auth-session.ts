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

// S-012: sessions are signed ONLY with the RS256 PRIVATE key, which just the
// backend holds — a frontend compromise (which gets only the PUBLIC key) can
// never mint tokens. The legacy HS256 shared-secret path (SEC-004) is gone:
// there is no symmetric fallback for signing or verification. The keypair is
// required in production (env.ts hard-fail) and provided in dev/test envs.
function requireKey(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is required (S-012 RS256-only). Generate an RS256 keypair — see backend/.env.example.`,
    );
  }
  return value;
}
const SIGNING_KEY = requireKey(env.AUTH_JWT_PRIVATE_KEY, "AUTH_JWT_PRIVATE_KEY");
const VERIFY_KEY = requireKey(env.AUTH_JWT_PUBLIC_KEY, "AUTH_JWT_PUBLIC_KEY");

/**
 * Verify a token this backend minted using the RS256 public key. RS256 is the
 * SOLE accepted algorithm — the legacy HS256 shared-secret fallback was removed
 * (SEC-004), so a leaked AUTH_JWT_SECRET can no longer mint accepted sessions.
 * Returns the decoded payload or null; callers validate their own claims.
 */
function verifyWithRotation(token: string): jwt.JwtPayload | null {
  try {
    const decoded = jwt.verify(token, VERIFY_KEY, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["RS256"],
    });
    if (decoded && typeof decoded === "object") return decoded;
  } catch {
    // Invalid / not an RS256 token.
  }
  return null;
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign({ ...payload, tokenVersion: payload.tokenVersion ?? 0 }, SIGNING_KEY, {
    algorithm: "RS256",
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

/** Which second factor this pending-login must be completed with. TOTP is
 *  the pre-existing method; EMAIL_OTP is Task 4's easy fallback for accounts
 *  that never enrolled TOTP (phi-access-recovery-plan-2026-07-17). */
export type Pending2faMethod = "TOTP" | "EMAIL_OTP";

export function signPending2faToken(userId: string, method: Pending2faMethod = "TOTP"): string {
  return jwt.sign({ sub: userId, pending2fa: true, method }, SIGNING_KEY, {
    algorithm: "RS256",
    expiresIn: "5m",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyPending2faToken(
  token: string,
): { userId: string; method: Pending2faMethod } | null {
  const decoded = verifyWithRotation(token);
  if (!decoded) return null;
  const { sub, pending2fa, method } = decoded as Record<string, unknown>;
  if (typeof sub !== "string" || pending2fa !== true) return null;
  // Tokens signed before Task 4 (or any unrecognized value) default to TOTP —
  // the only method that existed previously.
  const resolvedMethod: Pending2faMethod = method === "EMAIL_OTP" ? "EMAIL_OTP" : "TOTP";
  return { userId: sub, method: resolvedMethod };
}

export function authCookieOptions() {
  const secure = env.NODE_ENV === "production";
  const domain = env.AUTH_COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    // "lax" (not "strict") so the session cookie is still sent on a top-level
    // GET navigation back from an external site — e.g. returning from Stripe
    // Checkout to /account/plans. With "strict" the browser withholds the
    // cookie on that cross-site return, so the patient lands logged out. "lax"
    // still withholds it on cross-site POSTs / subresource requests (CSRF-safe).
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    ...(domain ? { domain } : {}),
  };
}

// ─── Trusted-device cookie ──────────────────────────────────────────────────
// Task 4 (phi-access-recovery-plan-2026-07-17): opaque 30-day token, hash
// stored in TrustedDevice — same shape/flags as authCookieOptions(), just a
// longer TTL and a distinct name so it survives its own logout/clear.

export const TRUSTED_DEVICE_COOKIE_NAME = "gh_trusted_device";

export function trustedDeviceCookieOptions() {
  const secure = env.NODE_ENV === "production";
  const domain = env.AUTH_COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  };
}
