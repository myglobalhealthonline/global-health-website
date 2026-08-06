import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// The module under test transitively imports config/env (via admin-auth +
// auth-session), which validates DATABASE_URL at load. Load .env, then import
// dynamically (mirrors the repo's route-test convention).
loadEnv({ path: join(__dirname, "../..", ".env") });

describe("elevateToManageMemberships", () => {
  let elevate: typeof import("./manage-memberships-auth.js")["elevateToManageMemberships"];

  before(async () => {
    elevate = (await import("./manage-memberships-auth.js")).elevateToManageMemberships;
  });

  it("propagates a failed base decision unchanged (unauthenticated)", () => {
    const result = elevate({ ok: false, status: 401, message: "Not authenticated" }, null, null);
    assert.deepEqual(result, { ok: false, status: 401, message: "Not authenticated" });
  });

  it("propagates a 403 base decision (patient/doctor) unchanged", () => {
    const result = elevate({ ok: false, status: 403, message: "Admin role required" }, "PATIENT", "p-1");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });

  it("allows the master admin token fallback, with no actor id", () => {
    const result = elevate({ ok: true, method: "token_fallback" }, null, null);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorRole, "ADMIN");
    assert.equal(result.ok && result.actorUserId, null);
  });

  it("allows an ADMIN session and carries the actor id for auditing", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-123");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorUserId, "admin-123");
    assert.equal(result.ok && result.method, "session");
  });

  it("allows a SUPER_ADMIN session", () => {
    const result = elevate({ ok: true, method: "session" }, "SUPER_ADMIN", "admin-9");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorRole, "SUPER_ADMIN");
  });

  it("denies LOCAL_ADMIN — a plan's member list is whole-market PII (§4.2)", () => {
    const result = elevate({ ok: true, method: "session" }, "LOCAL_ADMIN", "local-1");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });
});

describe("holdsMembershipConfigRole (SUPER_ADMIN config tier)", () => {
  let holds: typeof import("./manage-memberships-auth.js")["holdsMembershipConfigRole"];

  before(async () => {
    holds = (await import("./manage-memberships-auth.js")).holdsMembershipConfigRole;
  });

  it("grants a SUPER_ADMIN session", () => {
    assert.equal(
      holds({ ok: true, method: "session", actorUserId: "a-1", actorRole: "SUPER_ADMIN" }),
      true,
    );
  });

  it("denies a plain ADMIN session — config changes what members are charged", () => {
    assert.equal(
      holds({ ok: true, method: "session", actorUserId: "a-2", actorRole: "ADMIN" }),
      false,
    );
  });

  it("denies the master token fallback even though it passes MANAGE_MEMBERSHIPS", () => {
    assert.equal(
      holds({ ok: true, method: "token_fallback", actorUserId: null, actorRole: "ADMIN" }),
      false,
    );
  });

  it("denies a token fallback that somehow reports SUPER_ADMIN", () => {
    // Defence in depth: the fallback resolves to "ADMIN" today, but a config
    // write must never ride on a shared master token regardless.
    assert.equal(
      holds({ ok: true, method: "token_fallback", actorUserId: null, actorRole: "SUPER_ADMIN" }),
      false,
    );
  });
});
