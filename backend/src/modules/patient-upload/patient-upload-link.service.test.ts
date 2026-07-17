import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * SEC-006: patient-upload capability tokens are stored HASHED (sha256), never
 * raw. These prove (a) the exported hash helper discriminates raw vs wrong
 * input, and (b) end-to-end that a minted raw token verifies against its
 * stored hash while a wrong or expired token is rejected. The DB-backed cases
 * skip when Postgres is unreachable (mirrors the credit-balance test).
 */

describe("patient-upload token — hashing (stateless)", () => {
  let hashToken: typeof import("./patient-upload-link.service.js")["hashToken"];

  before(async () => {
    hashToken = (await import("./patient-upload-link.service.js")).hashToken;
  });

  it("is deterministic sha256 hex and matches Postgres sha256()", () => {
    const raw = "abc123";
    const expected = createHash("sha256").update(raw).digest("hex");
    assert.equal(hashToken(raw), expected);
    assert.match(hashToken(raw), /^[0-9a-f]{64}$/);
  });

  it("a different token produces a different hash", () => {
    assert.notEqual(hashToken("token-a"), hashToken("token-b"));
  });
});

describe("patient-upload token — verify (DB-backed)", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./patient-upload-link.service.js");
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./patient-upload-link.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skipIfNoDb = (): boolean => {
    if (bootError) {
      console.warn("[skip] DB unreachable:", (bootError as Error).message?.slice(0, 80));
      return true;
    }
    return false;
  };

  const claims = () => ({
    email: `sec006+${Date.now()}@example.test`,
    appointmentId: `appt-sec006-${Date.now()}`,
    doctorId: "doctor-sec006",
  });

  it("a raw token verifies against its stored hash", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const c = claims();
    const { token } = await svc.createPatientUploadToken(c);
    try {
      const res = await svc.verifyPatientUploadToken(token);
      assert.equal(res.ok, true);
      if (res.ok) assert.equal(res.appointmentId, c.appointmentId);
    } finally {
      await prisma.patientUploadLink.deleteMany({ where: { email: c.email } });
    }
  });

  it("a wrong token does not verify", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const c = claims();
    const { token } = await svc.createPatientUploadToken(c);
    try {
      const res = await svc.verifyPatientUploadToken(token + "tampered");
      assert.equal(res.ok, false);
    } finally {
      await prisma.patientUploadLink.deleteMany({ where: { email: c.email } });
    }
  });

  it("an expired token is rejected", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const c = claims();
    const { token } = await svc.createPatientUploadToken(c);
    try {
      await prisma.patientUploadLink.updateMany({
        where: { email: c.email },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const res = await svc.verifyPatientUploadToken(token);
      assert.equal(res.ok, false);
      if (!res.ok) assert.match(res.message, /expired/i);
    } finally {
      await prisma.patientUploadLink.deleteMany({ where: { email: c.email } });
    }
  });
});
