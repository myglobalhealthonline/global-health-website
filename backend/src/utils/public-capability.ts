import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type CapabilityPurpose = "invoice-public" | "order-pay";

type CapabilityPayload = {
  sub: string;
  purpose: CapabilityPurpose;
  nonce: string;
};

const JWT_ISSUER = "global-health-backend";
const JWT_AUDIENCE = "global-health-public-capability";

function requireKey(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is required for signed public capabilities. Generate an RS256 keypair — see backend/.env.example.`,
    );
  }
  return value;
}

const SIGNING_KEY = requireKey(env.AUTH_JWT_PRIVATE_KEY, "AUTH_JWT_PRIVATE_KEY");
const VERIFY_KEY = requireKey(env.AUTH_JWT_PUBLIC_KEY, "AUTH_JWT_PUBLIC_KEY");

export function generateCapabilityNonce(): string {
  return randomBytes(18).toString("base64url");
}

export function signPublicCapability(
  payload: CapabilityPayload,
  expiresIn: jwt.SignOptions["expiresIn"],
): string {
  return jwt.sign(payload, SIGNING_KEY, {
    algorithm: "RS256",
    expiresIn,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyPublicCapability(
  token: string,
  purpose: CapabilityPurpose,
): CapabilityPayload | null {
  try {
    const decoded = jwt.verify(token, VERIFY_KEY, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["RS256"],
    });
    if (!decoded || typeof decoded !== "object") return null;
    const sub = decoded.sub;
    const tokenPurpose = decoded.purpose;
    const nonce = decoded.nonce;
    if (
      typeof sub !== "string" ||
      tokenPurpose !== purpose ||
      typeof nonce !== "string"
    ) {
      return null;
    }
    return { sub, purpose, nonce };
  } catch {
    return null;
  }
}
