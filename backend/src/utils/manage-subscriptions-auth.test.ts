import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// The module under test transitively imports config/env (via admin-auth +
// auth-session), which validates DATABASE_URL at load. Load .env, then import
// dynamically (mirrors the repo's route-test convention).
loadEnv({ path: join(__dirname, "../..", ".env") });

describe("elevateToManageSubscriptions (single admin tier)", () => {
  let elevate: typeof import("./manage-subscriptions-auth.js")["elevateToManageSubscriptions"];

  before(async () => {
    const mod = await import("./manage-subscriptions-auth.js");
    elevate = mod.elevateToManageSubscriptions;
  });

  it("propagates a failed base decision unchanged (non-admin / unauthenticated)", () => {
    const result = elevate({ ok: false, status: 401, message: "Not authenticated" }, null, null);
    assert.deepEqual(result, { ok: false, status: 401, message: "Not authenticated" });
  });

  it("propagates a 403 base decision (patient/doctor) unchanged", () => {
    const result = elevate({ ok: false, status: 403, message: "Admin role required" }, "PATIENT", "p-1");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });

  it("allows the master admin token fallback", () => {
    const result = elevate({ ok: true, method: "token_fallback" }, null, null);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorRole, "ADMIN");
    assert.equal(result.ok && result.actorUserId, null);
  });

  it("allows any authenticated admin session and carries the actor id", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-123");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorUserId, "admin-123");
    assert.equal(result.ok && result.method, "session");
  });

  it("treats a SUPER_ADMIN session the same as an admin (no separate tier)", () => {
    const result = elevate({ ok: true, method: "session" }, "SUPER_ADMIN", "admin-9");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorUserId, "admin-9");
  });

  it("denies a LOCAL_ADMIN session — subscription config is global-admin only", () => {
    const result = elevate({ ok: true, method: "session" }, "LOCAL_ADMIN", "local-1");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });
});
