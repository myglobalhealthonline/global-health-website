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

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign({ ...payload, tokenVersion: payload.tokenVersion ?? 0 }, env.AUTH_JWT_SECRET, {
    expiresIn: env.AUTH_JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "global-health-backend",
    audience: "global-health-website",
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.AUTH_JWT_SECRET, {
      issuer: "global-health-backend",
      audience: "global-health-website",
      algorithms: ["HS256"], // pin: reject alg:none / alg-confusion
    });
    if (!decoded || typeof decoded !== "object") return null;
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
  } catch {
    return null;
  }
}

// ─── Pending-2FA token ──────────────────────────────────────────────────────
// Short-lived (5 min), not a session. Issued on successful password check when
// 2FA is enabled. The /api/auth/2fa/verify-login endpoint consumes it and
// issues a full auth cookie on TOTP success.

export function signPending2faToken(userId: string): string {
  return jwt.sign({ sub: userId, pending2fa: true }, env.AUTH_JWT_SECRET, {
    expiresIn: "5m",
    issuer: "global-health-backend",
    audience: "global-health-website",
  });
}

export function verifyPending2faToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, env.AUTH_JWT_SECRET, {
      issuer: "global-health-backend",
      audience: "global-health-website",
      algorithms: ["HS256"], // pin: reject alg:none / alg-confusion
    });
    if (!decoded || typeof decoded !== "object") return null;
    const { sub, pending2fa } = decoded as Record<string, unknown>;
    if (typeof sub !== "string" || pending2fa !== true) return null;
    return { userId: sub };
  } catch {
    return null;
  }
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
