import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type AuthTokenPayload = {
  sub: string;
  role: "PATIENT" | "ADMIN";
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.AUTH_JWT_SECRET, {
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
    });
    if (!decoded || typeof decoded !== "object") return null;
    const sub = decoded.sub;
    const role = decoded.role;
    const email = decoded.email;
    if (typeof sub !== "string" || (role !== "PATIENT" && role !== "ADMIN") || typeof email !== "string") {
      return null;
    }
    return { sub, role, email };
  } catch {
    return null;
  }
}

export function authCookieOptions() {
  const secure = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
