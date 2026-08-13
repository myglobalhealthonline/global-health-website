import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { before, describe, it } from "node:test";
import jwt from "jsonwebtoken";

type AuthMod = typeof import("./auth-session.js");

const JWT_ISSUER = "global-health-backend";
const JWT_AUDIENCE = "global-health-website";
const LEGACY_HS256_SECRET = "test-only-auth-secret-min-32-characters-long";

describe("auth-session (SEC-004: RS256-only)", () => {
  let m: AuthMod;

  before(async () => {
    // auth-session imports env.ts (validates process.env on import) and now
    // requires the RS256 keypair. Give it a freshly generated one plus the
    // minimal env so the bare `node --test` process doesn't throw. NODE_ENV is
    // unset here, so env.ts's default resolves to "production" — set "test"
    // explicitly so production boot guards don't fire.
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    process.env.NODE_ENV ??= "test";
    process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db";
    process.env.AUTH_JWT_SECRET ??= LEGACY_HS256_SECRET;
    process.env.AUTH_JWT_PRIVATE_KEY = privateKey;
    process.env.AUTH_JWT_PUBLIC_KEY = publicKey;
    m = await import("./auth-session.js");
  });

  it("accepts a token the backend minted (RS256)", () => {
    const token = m.signAuthToken({ sub: "u1", role: "ADMIN", email: "a@b.c" });
    const payload = m.verifyAuthToken(token);
    assert.equal(payload?.sub, "u1");
    assert.equal(payload?.role, "ADMIN");
  });

  it("REJECTS a legacy HS256 token signed with the shared secret", () => {
    // Exactly what a frontend-secret compromise could forge before SEC-004.
    const forged = jwt.sign(
      { sub: "attacker", role: "SUPER_ADMIN", email: "evil@x.y", tokenVersion: 0 },
      // nosemgrep: javascript.jsonwebtoken.security.jwt-hardcode.hardcoded-jwt-secret -- deliberate negative-test fixture proving a token forged with the legacy secret is rejected; LEGACY_HS256_SECRET is test-only, not a live credential.
      LEGACY_HS256_SECRET,
      { algorithm: "HS256", issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    );
    assert.equal(m.verifyAuthToken(forged), null);
  });
});
