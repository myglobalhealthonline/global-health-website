import { SignJWT, jwtVerify } from "jose";

const ISSUER = "global-health";
const AUDIENCE = "global-health-admin";

export type AdminSessionPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
};

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(raw);
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || "7d";
}

export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(getExpiresIn())
    .sign(getSecret());
}

export async function verifyAdminSession(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const sub = payload.sub;
    const email = payload.email;
    const role = payload.role;
    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      (role !== "ADMIN" && role !== "SUPER_ADMIN")
    ) {
      return null;
    }
    return { sub, email, role };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_admin_session";
